import { MAX_COMPLETION_TOKENS, systemPrompt } from '../../src/ai/prompt'
import { bumpCounter, keyExists, redisFromEnv } from './redis'

/**
 * Free-tier completion handler, dependency-injected for tests.
 *
 * PRIVACY INVARIANT: request context/intent must never be logged, echoed into
 * errors, or stored. They exist only in memory for the upstream fetch.
 */

export interface CompleteDeps {
  env: Record<string, string | undefined>
  fetch: typeof fetch
}

interface ChainEntry {
  provider: 'groq' | 'gemini'
  model: string
}

const DEFAULT_CHAIN = 'groq:llama-3.1-8b-instant,gemini:gemini-2.5-flash-lite'
const UPSTREAM_TIMEOUT_MS = 2500

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export function parseChain(raw: string | undefined): ChainEntry[] {
  return (raw ?? DEFAULT_CHAIN)
    .split(',')
    .map((entry) => {
      const idx = entry.indexOf(':')
      if (idx < 1) return null
      const provider = entry.slice(0, idx).trim()
      const model = entry.slice(idx + 1).trim()
      if ((provider !== 'groq' && provider !== 'gemini') || !model) return null
      return { provider, model } as ChainEntry
    })
    .filter((e): e is ChainEntry => e !== null)
}

export async function handleComplete(req: Request, deps: CompleteDeps): Promise<Response> {
  const { env } = deps
  if (req.method !== 'POST') return json(405, { error: 'method' })
  if (env.AI_DISABLED === '1') return json(503, { reason: 'disabled' })

  let body: { context?: unknown; intent?: unknown; clientId?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json(400, { error: 'bad-json' })
  }
  const context = typeof body.context === 'string' ? body.context.slice(-1200) : ''
  const intent = typeof body.intent === 'string' ? body.intent.slice(0, 300) : ''
  const clientId =
    typeof body.clientId === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(body.clientId)
      ? body.clientId
      : null
  if (!context.trim() || !clientId) return json(400, { error: 'bad-request' })

  const dailyCap = Number(env.DAILY_CAP ?? 150)
  const ipDailyCap = Number(env.IP_DAILY_CAP ?? 400)
  const ratePerMin = Number(env.RATE_LIMIT_PER_MIN ?? 20)
  const redis = redisFromEnv(env)
  let used = 0

  if (redis) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'
    const day = new Date().toISOString().slice(0, 10)
    const minute = Math.floor(Date.now() / 60_000)

    const rate = await bumpCounter(redis, `rl:${ip}:${minute}`, 120, deps.fetch)
    if (rate !== null && rate > ratePerMin) return json(429, { reason: 'rate' })

    const uncapped = await keyExists(redis, `uncapped:${clientId}`, deps.fetch)
    if (!uncapped) {
      const ipCount = await bumpCounter(redis, `cap:ip:${ip}:${day}`, 172_800, deps.fetch)
      if (ipCount !== null && ipCount > ipDailyCap) {
        return json(429, { reason: 'cap', used: dailyCap, limit: dailyCap })
      }
      const count = await bumpCounter(redis, `cap:${clientId}:${day}`, 172_800, deps.fetch)
      if (count !== null && count > dailyCap) {
        return json(429, { reason: 'cap', used: dailyCap, limit: dailyCap })
      }
      used = count ?? 0
    }
  }

  const system = systemPrompt(intent)
  for (const entry of parseChain(env.PROVIDER_CHAIN)) {
    const text = await tryProvider(entry, system, context, deps)
    if (text !== null) {
      return json(200, {
        text,
        provider: entry.provider,
        quota: { used, limit: dailyCap },
      })
    }
  }
  return json(429, { reason: 'exhausted' })
}

async function tryProvider(
  entry: ChainEntry,
  system: string,
  context: string,
  deps: CompleteDeps,
): Promise<string | null> {
  try {
    if (entry.provider === 'groq') {
      const key = deps.env.GROQ_API_KEY
      if (!key) return null
      const res = await deps.fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: entry.model,
          max_tokens: MAX_COMPLETION_TOKENS,
          temperature: 0.3,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: context },
          ],
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
      if (!res.ok) return null
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const text = data.choices?.[0]?.message?.content
      return typeof text === 'string' && text ? text : null
    }
    // gemini
    const key = deps.env.GEMINI_API_KEY
    if (!key) return null
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(entry.model)}:generateContent`
    const res = await deps.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: context }] }],
        generationConfig: { maxOutputTokens: MAX_COMPLETION_TOKENS, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
    return typeof text === 'string' && text ? text : null
  } catch {
    return null
  }
}
