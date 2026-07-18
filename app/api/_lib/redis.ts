/**
 * Minimal Upstash Redis REST client (edge-compatible, no SDK).
 * All limit checks fail open: if Redis is unreachable or unconfigured
 * (local dev), the request proceeds — availability over strictness.
 */

export interface RedisEnv {
  url: string
  token: string
}

export function redisFromEnv(env: Record<string, string | undefined>): RedisEnv | null {
  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

type RedisResult = { result?: unknown; error?: string }

export async function redisPipeline(
  redis: RedisEnv,
  commands: (string | number)[][],
  fetchImpl: typeof fetch = fetch,
): Promise<RedisResult[] | null> {
  try {
    const res = await fetchImpl(`${redis.url}/pipeline`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${redis.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return null
    return (await res.json()) as RedisResult[]
  } catch {
    return null
  }
}

/** INCR a counter with a TTL set only on first increment. Returns the count, or null on failure. */
export async function bumpCounter(
  redis: RedisEnv,
  key: string,
  ttlSeconds: number,
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  const out = await redisPipeline(
    redis,
    [
      ['INCR', key],
      ['EXPIRE', key, ttlSeconds, 'NX'],
    ],
    fetchImpl,
  )
  const n = out?.[0]?.result
  return typeof n === 'number' ? n : null
}

export async function keyExists(
  redis: RedisEnv,
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const out = await redisPipeline(redis, [['EXISTS', key]], fetchImpl)
  return out?.[0]?.result === 1
}
