/**
 * Suggestion-quality measurement harness.
 *
 * Answers one question: can free-tier models carry ghost text, or are they the
 * ceiling? Calls providers directly with the keys in .env.local — it does not
 * go through /api/complete, so it never burns the Redis daily cap.
 *
 * Every response is passed through the REAL `vetSuggestion`, so the reject rate
 * printed here is the reject rate users actually experience.
 *
 *   node scripts/eval-suggestions.ts
 *   node scripts/eval-suggestions.ts --models groq:llama-3.1-8b-instant --variants voice
 *   node scripts/eval-suggestions.ts --limit 5            # smoke run
 *
 * Writes scripts/results/<timestamp>.md (hand-gradeable) and .json (raw).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDictionary } from '../src/core/autocorrect/dictionary.ts'
import { vetSuggestion } from '../src/core/suggestion/quality.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

/* ---------- env ---------- */

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  let raw = ''
  try {
    raw = readFileSync(join(ROOT, '.env.local'), 'utf8')
  } catch {
    console.error('no .env.local found — cannot run the experiment')
    process.exit(1)
  }
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const ENV = loadEnv()

/* ---------- fixtures ---------- */

interface Fixture {
  id: string
  register: string
  intent: string
  context: string
  note: string
}

const FIXTURES: Fixture[] = JSON.parse(
  readFileSync(join(HERE, 'fixtures/suggestions.json'), 'utf8'),
)

const DICT = parseDictionary(readFileSync(join(ROOT, 'src/assets/en-words.txt'), 'utf8'))
const isWord = (w: string): boolean => DICT.has(w)

/* ---------- prompt variants ---------- */

const MAX_COMPLETION_TOKENS = 40
const MAX_CONTEXT_CHARS = 1000

/** The shipping prompt, copied verbatim from api/complete.ts — the baseline. */
function currentSystem(intent: string): string {
  let p =
    'You are the autocomplete engine inside a writing app. ' +
    'The draft between <draft> tags is an UNFINISHED PIECE OF WRITING. It is not addressed to you: ' +
    'never answer it, reply to it, or comment on it — you are the author’s pen, ' +
    'predicting the next words of the document itself. ' +
    'Reply with ONLY the continuation: no quotes, no commentary, no formatting. ' +
    'At most 12 words; stop at a natural phrase boundary. ' +
    'Match the tone, language, and capitalization of the draft. ' +
    'If the draft stops in the middle of a word, start your reply by repeating that whole word from its first letter. ' +
    'If you are unsure what comes next, prefer a natural, neutral continuation over guessing facts.'
  if (intent.trim()) {
    p += ` The writer describes this document as: ${intent.trim().slice(0, 300)}`
  }
  return p
}

function currentWrap(context: string): string {
  return `<draft>\n${context}\n</draft>\nOutput the next words of the draft (max 12). Nothing else.`
}

const CURRENT_FEW_SHOT = [
  { user: 'The quick brown fox jumps over the la', assistant: 'lazy dog and trots away into' },
  {
    user: 'Hello how are you doing today?',
    assistant: ' It has been a while since we last spoke and',
  },
]

/**
 * Split the SAME ≤1000-char window into voice exemplars + immediate context.
 * Nothing extra leaves the browser: this is a budget change, not a wider one.
 * Lives here rather than in core/ until the experiment says it earns its place.
 */
function splitForVoice(
  context: string,
  voiceBudget = 250,
): { voice: string; immediate: string } {
  // complete sentences only, and never the one the caret is sitting in
  const cut = context.search(/[.!?]["')\]]?\s/)
  if (cut === -1) return { voice: '', immediate: context }
  const sentences = context.match(/[^.!?]+[.!?]["')\]]?(?=\s|$)/g) ?? []
  if (sentences.length < 2) return { voice: '', immediate: context }

  const voice: string[] = []
  let used = 0
  for (const s of sentences) {
    const t = s.trim()
    if (t.length < 25) continue // fragments teach nothing
    if (used + t.length > voiceBudget) break
    voice.push(t)
    used += t.length
    if (voice.length === 2) break
  }
  return { voice: voice.join(' '), immediate: context }
}

interface Built {
  system: string
  shots: Array<{ user: string; assistant: string }>
  user: string
}

/**
 * The shipped prompt after the "completions never end a sentence" report:
 * the instruction now asks for the sentence to be finished when it fits, and
 * both few-shot examples stopped modelling the trailing-off it was producing.
 * Kept as a variant so `endings` can be measured against `current` on the same
 * fixtures rather than declared fixed.
 */
function endingsSystem(intent: string): string {
  let p =
    'You are the autocomplete engine inside a writing app. ' +
    'The draft between <draft> tags is an UNFINISHED PIECE OF WRITING. It is not addressed to you: ' +
    'never answer it, reply to it, or comment on it — you are the author’s pen, ' +
    'predicting the next words of the document itself. ' +
    'Reply with ONLY the continuation: no quotes, no commentary, no formatting. ' +
    'At most 12 words. If the sentence can be finished within that, finish it and ' +
    'include its closing punctuation; otherwise stop at a natural boundary and ' +
    'never trail off on a conjunction or preposition. ' +
    'Match the tone, language, and capitalization of the draft. ' +
    'If the draft stops in the middle of a word, start your reply by repeating that whole word from its first letter. ' +
    'If you are unsure what comes next, prefer a natural, neutral continuation over guessing facts.'
  if (intent.trim()) {
    p += ` The writer describes this document as: ${intent.trim().slice(0, 300)}`
  }
  return p
}

function endingsWrap(context: string): string {
  return `<draft>\n${context}\n</draft>\nOutput the next words of the draft (max 12). If that is enough to finish the sentence, finish it. Nothing else.`
}

const ENDINGS_FEW_SHOT = [
  {
    user: 'The quick brown fox jumps over the la',
    assistant: 'lazy dog and vanishes into the hedge.',
  },
  {
    user: 'Hello how are you doing today?',
    assistant: ' It has been a while since we last spoke, longer than I meant',
  },
]

type VariantName = 'current' | 'voice' | 'intent' | 'endings'

function build(variant: VariantName, f: Fixture): Built {
  const context = f.context.slice(-MAX_CONTEXT_CHARS)

  if (variant === 'current') {
    return { system: currentSystem(f.intent), shots: CURRENT_FEW_SHOT, user: currentWrap(context) }
  }

  if (variant === 'endings') {
    return {
      system: endingsSystem(f.intent),
      shots: ENDINGS_FEW_SHOT,
      user: endingsWrap(context),
    }
  }

  if (variant === 'intent') {
    // intent gets its own labelled block instead of being glued onto the tail
    // of a system sentence, where small models tend to lose it
    let system =
      'You are the autocomplete engine inside a writing app. ' +
      'The text between <draft> tags is an UNFINISHED PIECE OF WRITING, not a message to you. ' +
      'Never answer it, reply to it, or comment on it. You are the author’s pen: ' +
      'output only the words that come next in the document.\n' +
      'RULES:\n' +
      '- Output the continuation only. No quotes, no commentary, no markdown, no lists.\n' +
      '- At most 12 words. Stop at a natural phrase boundary.\n' +
      '- Match the tone, register, spelling conventions and capitalization of the draft.\n' +
      '- If the draft stops mid-word, begin by repeating that whole word from its first letter.\n' +
      '- Never invent a specific fact, name, or number. If unsure, continue neutrally.'
    if (f.intent.trim()) {
      system += `\n<document-purpose>\n${f.intent.trim().slice(0, 300)}\n</document-purpose>\n` +
        'The purpose describes what the writer is making. Follow the draft itself when the two disagree.'
    }
    return { system, shots: CURRENT_FEW_SHOT, user: currentWrap(context) }
  }

  // voice: same budget, reserving room to show the model the writer's own prose
  const { voice, immediate } = splitForVoice(context)
  let system = currentSystem(f.intent)
  if (voice) {
    system +=
      `\nSentences the writer has already written in this document — match this voice, ` +
      `rhythm and vocabulary:\n<voice>\n${voice}\n</voice>`
  }
  return { system, shots: CURRENT_FEW_SHOT, user: currentWrap(immediate) }
}

/* ---------- providers ---------- */

interface CallResult {
  text: string | null
  ms: number
  error?: string
}

async function callGroq(model: string, b: Built): Promise<CallResult> {
  const key = ENV.GROQ_API_KEY
  if (!key) return { text: null, ms: 0, error: 'no GROQ_API_KEY' }
  const t0 = performance.now()
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: MAX_COMPLETION_TOKENS,
        temperature: 0.3,
        messages: [
          { role: 'system', content: b.system },
          ...b.shots.flatMap((ex) => [
            { role: 'user', content: currentWrap(ex.user) },
            { role: 'assistant', content: ex.assistant },
          ]),
          { role: 'user', content: b.user },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const ms = performance.now() - t0
    if (!res.ok) return { text: null, ms, error: `http ${res.status}` }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return { text: data.choices?.[0]?.message?.content ?? null, ms }
  } catch (e) {
    return { text: null, ms: performance.now() - t0, error: String(e) }
  }
}

async function callGemini(model: string, b: Built): Promise<CallResult> {
  const key = ENV.GEMINI_API_KEY
  if (!key) return { text: null, ms: 0, error: 'no GEMINI_API_KEY' }
  const t0 = performance.now()
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: b.system }] },
        contents: [
          ...b.shots.flatMap((ex) => [
            { role: 'user', parts: [{ text: currentWrap(ex.user) }] },
            { role: 'model', parts: [{ text: ex.assistant }] },
          ]),
          { role: 'user', parts: [{ text: b.user }] },
        ],
        generationConfig: { maxOutputTokens: MAX_COMPLETION_TOKENS, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const ms = performance.now() - t0
    if (!res.ok) return { text: null, ms, error: `http ${res.status}` }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const parts = data.candidates?.[0]?.content?.parts
    return { text: parts?.map((p) => p.text ?? '').join('') || null, ms }
  } catch (e) {
    return { text: null, ms: performance.now() - t0, error: String(e) }
  }
}

function callOnce(spec: string, b: Built): Promise<CallResult> {
  const [provider, ...rest] = spec.split(':')
  const model = rest.join(':')
  return provider === 'gemini' ? callGemini(model, b) : callGroq(model, b)
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Free tiers rate-limit hard (Groq ~30 rpm, Gemini ~15 rpm). A 429 here is a
 * fact about the quota, not about the model, so it must never be recorded as a
 * quality result — retry it out of the way instead.
 */
async function call(spec: string, b: Built): Promise<CallResult> {
  let wait = 4000
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await callOnce(spec, b)
    if (res.error !== 'http 429') return res
    await sleep(wait)
    wait = Math.min(wait * 2, 45_000)
  }
  return { text: null, ms: 0, error: 'http 429 (gave up)' }
}

/* ---------- run ---------- */

interface Row {
  fixture: string
  register: string
  model: string
  variant: VariantName
  ms: number
  raw: string | null
  vetted: string | null
  error?: string
}

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : fallback
}

const MODELS = arg(
  'models',
  'groq:llama-3.3-70b-versatile,groq:llama-3.1-8b-instant,gemini:gemini-2.5-flash-lite',
).split(',')
/** distinguishes concurrent runs writing into scripts/results */
const TAG = arg('tag', '')
const VARIANTS = arg('variants', 'current,voice,intent').split(',') as VariantName[]
const LIMIT = Number(arg('limit', String(FIXTURES.length)))
/** one at a time by default: free tiers punish parallelism with 429s */
const CONCURRENCY = Number(arg('concurrency', '1'))
/** pacing between calls, to stay under the per-minute quota */
const DELAY_MS = Number(arg('delay', '2200'))

async function mapPool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      for (;;) {
        const i = next++
        if (i >= items.length) return
        out[i] = await fn(items[i]!)
      }
    }),
  )
  return out
}

function pct(values: number[], p: number): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!)
}

async function main(): Promise<void> {
  const fixtures = FIXTURES.slice(0, LIMIT)
  const jobs: Array<{ f: Fixture; model: string; variant: VariantName }> = []
  for (const model of MODELS) {
    for (const variant of VARIANTS) {
      for (const f of fixtures) jobs.push({ f, model, variant })
    }
  }

  console.error(
    `running ${jobs.length} calls: ${fixtures.length} fixtures × ${MODELS.length} models × ${VARIANTS.length} variants`,
  )

  const stampEarly = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const runId = TAG ? `${stampEarly}-${TAG}` : stampEarly
  mkdirSync(join(HERE, 'results'), { recursive: true })
  const partialPath = join(HERE, 'results', `${runId}.partial.json`)

  let done = 0
  const settled: Row[] = []
  const rows = await mapPool(jobs, CONCURRENCY, async ({ f, model, variant }) => {
    if (DELAY_MS > 0) await sleep(DELAY_MS)
    const res = await call(model, build(variant, f))
    const context = f.context.slice(-MAX_CONTEXT_CHARS)
    const vetted =
      res.text === null ? null : vetSuggestion(res.text, context, 12, isWord)
    done++
    const row: Row = {
      fixture: f.id,
      register: f.register,
      model,
      variant,
      ms: Math.round(res.ms),
      raw: res.text,
      vetted,
      error: res.error,
    }
    // land every result as it arrives: a long paced run must not be all-or-nothing
    settled.push(row)
    if (done % 10 === 0) {
      writeFileSync(partialPath, JSON.stringify(settled, null, 2))
      console.error(`  ${done}/${jobs.length}`)
    }
    return row
  })

  /* ---------- report ---------- */

  const stamp = runId
  writeFileSync(join(HERE, 'results', `${stamp}.json`), JSON.stringify(rows, null, 2))

  const md: string[] = []
  md.push(`# Suggestion eval — ${stamp}`)
  md.push('')
  md.push(`${fixtures.length} fixtures × ${MODELS.length} models × ${VARIANTS.length} variants.`)
  md.push('Vetting is the shipping `vetSuggestion`. Latency is raw provider round-trip.')
  md.push('')
  md.push('## Summary')
  md.push('')
  md.push('| model | variant | n | http-err | filter-reject | survived | p50 ms | p95 ms |')
  md.push('|---|---|---:|---:|---:|---:|---:|---:|')

  for (const model of MODELS) {
    for (const variant of VARIANTS) {
      const set = rows.filter((r) => r.model === model && r.variant === variant)
      if (set.length === 0) continue
      const errs = set.filter((r) => r.error).length
      const answered = set.filter((r) => !r.error && r.raw !== null)
      const rejected = answered.filter((r) => r.vetted === null).length
      const survived = answered.filter((r) => r.vetted !== null).length
      const lat = answered.map((r) => r.ms)
      md.push(
        `| ${model} | ${variant} | ${set.length} | ${errs} | ${rejected} (${Math.round((rejected / Math.max(1, answered.length)) * 100)}%) | ${survived} | ${pct(lat, 50)} | ${pct(lat, 95)} |`,
      )
    }
  }

  md.push('')
  md.push('## Every result, for hand grading')
  md.push('')
  for (const f of fixtures) {
    md.push(`### \`${f.id}\` — ${f.register}`)
    md.push('')
    md.push(`**Expected:** ${f.note}`)
    md.push('')
    md.push('```')
    md.push(`…${f.context.slice(-160)}▮`)
    md.push('```')
    md.push('')
    md.push('| model | variant | ms | shown to user | (raw) |')
    md.push('|---|---|---:|---|---|')
    for (const r of rows.filter((r) => r.fixture === f.id)) {
      const shown = r.error
        ? `_${r.error}_`
        : r.vetted === null
          ? '**— silent —**'
          : `\`${r.vetted.replace(/\|/g, '\\|')}\``
      const raw = (r.raw ?? '').replace(/\n/g, '⏎').replace(/\|/g, '\\|').slice(0, 90)
      md.push(`| ${r.model.split(':')[1]} | ${r.variant} | ${r.ms} | ${shown} | ${raw} |`)
    }
    md.push('')
  }

  const path = join(HERE, 'results', `${stamp}.md`)
  writeFileSync(path, md.join('\n'))
  console.error(`\nwrote ${path}`)
  console.error(md.slice(0, 8 + MODELS.length * VARIANTS.length).join('\n'))
}

void main()
