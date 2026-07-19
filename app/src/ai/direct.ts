import type { CompletionFn, CompletionOutcome } from '../editor/suggestionController'
import type { ByokProvider } from '../store/db'
import { FEW_SHOT, MAX_COMPLETION_TOKENS, systemPrompt, wrapContext } from './prompt'

/**
 * BYOK adapters — the user's key goes straight from localStorage to the
 * provider. Per-provider CORS status (verified against provider docs):
 *
 *  - Anthropic:  browser calls allowed WITH the
 *    `anthropic-dangerous-direct-browser-access: true` header.
 *  - Gemini:     generativelanguage.googleapis.com sends permissive CORS.
 *  - OpenAI:     api.openai.com sends permissive CORS (their SDK gates browser
 *    use behind `dangerouslyAllowBrowser`, the HTTP API itself allows it).
 *  - OpenRouter: explicitly browser-friendly.
 *
 * If a provider ever blocks CORS in practice, route it through
 * /api/passthrough (no-log key forwarding) instead of direct fetch.
 */

export const DEFAULT_MODELS: Record<ByokProvider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  gemini: 'gemini-2.5-flash-lite',
  openai: 'gpt-4o-mini',
  openrouter: 'meta-llama/llama-3.1-8b-instruct',
}

interface DirectConfig {
  provider: ByokProvider
  key: string
  model: string // '' → provider default
}

export function directCompletion(cfg: DirectConfig): CompletionFn {
  const model = cfg.model || DEFAULT_MODELS[cfg.provider]
  return async ({ context, intent, signal }): Promise<CompletionOutcome> => {
    try {
      switch (cfg.provider) {
        case 'anthropic':
          return await anthropic(cfg.key, model, context, intent, signal)
        case 'gemini':
          return await gemini(cfg.key, model, context, intent, signal)
        case 'openai':
          return await openaiCompatible(
            'https://api.openai.com/v1/chat/completions',
            { authorization: `Bearer ${cfg.key}` },
            model,
            context,
            intent,
            signal,
          )
        case 'openrouter':
          return await openaiCompatible(
            'https://openrouter.ai/api/v1/chat/completions',
            { authorization: `Bearer ${cfg.key}` },
            model,
            context,
            intent,
            signal,
          )
      }
    } catch {
      return { ok: false, cause: 'net' }
    }
  }
}

function statusOutcome(status: number): CompletionOutcome {
  return { ok: false, cause: status === 429 ? 'rate' : 'net' }
}

async function anthropic(
  key: string,
  model: string,
  context: string,
  intent: string,
  signal: AbortSignal,
): Promise<CompletionOutcome> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_COMPLETION_TOKENS,
      temperature: 0.3,
      system: systemPrompt(intent),
      messages: [
        ...FEW_SHOT.flatMap((ex) => [
          { role: 'user', content: wrapContext(ex.user) },
          { role: 'assistant', content: ex.assistant },
        ]),
        { role: 'user', content: wrapContext(context) },
      ],
    }),
    signal,
  })
  if (!res.ok) return statusOutcome(res.status)
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
  const text = data.content?.find((b) => b.type === 'text')?.text
  return typeof text === 'string' ? { ok: true, text } : { ok: false, cause: 'net' }
}

async function gemini(
  key: string,
  model: string,
  context: string,
  intent: string,
  signal: AbortSignal,
): Promise<CompletionOutcome> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(intent) }] },
      contents: [
        ...FEW_SHOT.flatMap((ex) => [
          { role: 'user', parts: [{ text: wrapContext(ex.user) }] },
          { role: 'model', parts: [{ text: ex.assistant }] },
        ]),
        { role: 'user', parts: [{ text: wrapContext(context) }] },
      ],
      generationConfig: { maxOutputTokens: MAX_COMPLETION_TOKENS, temperature: 0.3 },
    }),
    signal,
  })
  if (!res.ok) return statusOutcome(res.status)
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
  return typeof text === 'string' && text ? { ok: true, text } : { ok: false, cause: 'net' }
}

async function openaiCompatible(
  url: string,
  auth: Record<string, string>,
  model: string,
  context: string,
  intent: string,
  signal: AbortSignal,
): Promise<CompletionOutcome> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...auth },
    body: JSON.stringify({
      model,
      max_tokens: MAX_COMPLETION_TOKENS,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt(intent) },
        ...FEW_SHOT.flatMap((ex) => [
          { role: 'user', content: wrapContext(ex.user) },
          { role: 'assistant', content: ex.assistant },
        ]),
        { role: 'user', content: wrapContext(context) },
      ],
    }),
    signal,
  })
  if (!res.ok) return statusOutcome(res.status)
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content
  return typeof text === 'string' && text ? { ok: true, text } : { ok: false, cause: 'net' }
}
