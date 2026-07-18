export const config = { runtime: 'edge' }

/**
 * BYOK pass-through for providers whose APIs block browser CORS.
 * The user's key arrives per-request, is forwarded upstream, and is NEVER
 * stored or logged — this function must never write request data anywhere.
 *
 * Currently no supported provider needs this (all four allow direct browser
 * calls — see src/ai/direct.ts), but the route ships so a CORS policy change
 * upstream is a client-side config change, not an outage.
 */

const UPSTREAMS: Record<string, { base: string; auth: (key: string) => Record<string, string> }> = {
  openai: {
    base: 'https://api.openai.com/v1/chat/completions',
    auth: (key) => ({ authorization: `Bearer ${key}` }),
  },
  openrouter: {
    base: 'https://openrouter.ai/api/v1/chat/completions',
    auth: (key) => ({ authorization: `Bearer ${key}` }),
  },
  anthropic: {
    base: 'https://api.anthropic.com/v1/messages',
    auth: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
  },
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  const provider = req.headers.get('x-cursive-provider') ?? ''
  const key = req.headers.get('x-cursive-key') ?? ''
  const upstream = UPSTREAMS[provider]
  if (!upstream || !key) return new Response(null, { status: 400 })
  const res = await fetch(upstream.base, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...upstream.auth(key) },
    body: req.body,
    signal: AbortSignal.timeout(10_000),
  })
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  })
}
