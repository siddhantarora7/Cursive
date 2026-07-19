import { describe, expect, it } from 'vitest'
import { handleComplete, parseChain, type CompleteDeps } from './complete'

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const CLIENT = { context: 'The quick brown fox ', intent: '', clientId: 'abcd1234-client' }

function groqResponse(text: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status: 200,
  })
}

function geminiResponse(text: string): Response {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200 },
  )
}

describe('parseChain', () => {
  it('parses the env format and drops junk', () => {
    expect(parseChain('groq:llama-3.1-8b-instant,gemini:gemini-2.5-flash-lite')).toEqual([
      { provider: 'groq', model: 'llama-3.1-8b-instant' },
      { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
    ])
    expect(parseChain('bogus:x,groq:m')).toEqual([{ provider: 'groq', model: 'm' }])
  })
})

describe('handleComplete', () => {
  it('honors the kill switch', async () => {
    const deps: CompleteDeps = { env: { AI_DISABLED: '1' }, fetch: () => { throw new Error('no') } }
    const res = await handleComplete(post(CLIENT), deps)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ reason: 'disabled' })
  })

  it('rejects bad payloads', async () => {
    const deps: CompleteDeps = { env: {}, fetch: () => { throw new Error('no') } }
    expect((await handleComplete(post({}), deps)).status).toBe(400)
    expect(
      (await handleComplete(post({ context: 'hi there you', clientId: '!!' }), deps)).status,
    ).toBe(400)
  })

  it('returns the primary provider result', async () => {
    const deps: CompleteDeps = {
      env: { GROQ_API_KEY: 'k1', GEMINI_API_KEY: 'k2' },
      fetch: async (url) => {
        expect(String(url)).toContain('groq.com')
        return groqResponse(' jumps over')
      },
    }
    const res = await handleComplete(post(CLIENT), deps)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { text: string; provider: string }
    expect(body.text).toBe(' jumps over')
    expect(body.provider).toBe('groq')
  })

  it('falls back to gemini when groq 429s', async () => {
    const deps: CompleteDeps = {
      env: { GROQ_API_KEY: 'k1', GEMINI_API_KEY: 'k2' },
      fetch: async (url) => {
        if (String(url).includes('groq.com')) return new Response('rate', { status: 429 })
        return geminiResponse(' jumps over the dog')
      },
    }
    const res = await handleComplete(post(CLIENT), deps)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { text: string; provider: string }
    expect(body.provider).toBe('gemini')
  })

  it('reports exhaustion when every upstream fails', async () => {
    const deps: CompleteDeps = {
      env: { GROQ_API_KEY: 'k1', GEMINI_API_KEY: 'k2' },
      fetch: async () => new Response('nope', { status: 429 }),
    }
    const res = await handleComplete(post(CLIENT), deps)
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ reason: 'exhausted' })
  })

  it('skips providers with no key configured', async () => {
    const deps: CompleteDeps = {
      env: { GEMINI_API_KEY: 'k2' },
      fetch: async (url) => {
        expect(String(url)).toContain('googleapis.com')
        return geminiResponse(' done')
      },
    }
    const res = await handleComplete(post(CLIENT), deps)
    expect(res.status).toBe(200)
  })

  it('enforces the per-client daily cap via redis', async () => {
    let used = 0
    const deps: CompleteDeps = {
      env: {
        UPSTASH_REDIS_REST_URL: 'https://redis.example',
        UPSTASH_REDIS_REST_TOKEN: 't',
        DAILY_CAP: '2',
        GROQ_API_KEY: 'k1',
      },
      fetch: async (url, init) => {
        const u = String(url)
        if (u.includes('redis.example')) {
          const cmds = JSON.parse(String(init?.body)) as string[][]
          const first = cmds[0]!
          if (first[0] === 'EXISTS') return new Response(JSON.stringify([{ result: 0 }]))
          const key = first[1]!
          if (key.startsWith('rl:') || key.startsWith('cap:ip:')) {
            return new Response(JSON.stringify([{ result: 1 }, { result: 1 }]))
          }
          used += 1
          return new Response(JSON.stringify([{ result: used }, { result: 1 }]))
        }
        return groqResponse(' ok fine')
      },
    }
    expect((await handleComplete(post(CLIENT), deps)).status).toBe(200)
    expect((await handleComplete(post(CLIENT), deps)).status).toBe(200)
    const third = await handleComplete(post(CLIENT), deps)
    expect(third.status).toBe(429)
    expect(((await third.json()) as { reason: string }).reason).toBe('cap')
  })
})
