import type { CompletionFn, CompletionOutcome } from '../editor/suggestionController'
import { getClientId } from '../store/settings'

/**
 * Free-tier transport: our edge proxy holds the provider keys and enforces
 * caps. The client sends only the context slice, the intent, and the
 * anonymous client id.
 */
export function proxyCompletion(): CompletionFn {
  return async ({ context, intent, signal }): Promise<CompletionOutcome> => {
    let res: Response
    try {
      res = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context, intent, clientId: getClientId() }),
        signal,
      })
    } catch {
      return { ok: false, cause: 'net' }
    }
    if (res.status === 429 || res.status === 503) {
      const body = (await res.json().catch(() => ({}))) as { reason?: string }
      // The proxy distinguishes four things and so do we — collapsing them is
      // how "you hit your daily cap" gets shown for "our kill switch is on".
      switch (body.reason) {
        case 'rate':
          return { ok: false, cause: 'rate' }
        case 'cap':
          return { ok: false, cause: 'cap' }
        case 'disabled':
          return { ok: false, cause: 'disabled' }
        case 'exhausted':
          return { ok: false, cause: 'providers' }
        default:
          return { ok: false, cause: 'net' }
      }
    }
    if (!res.ok) return { ok: false, cause: 'net' }
    const body = (await res.json().catch(() => null)) as {
      text?: string
      quota?: { used: number; limit: number }
    } | null
    if (!body || typeof body.text !== 'string') return { ok: false, cause: 'net' }
    return { ok: true, text: body.text, quota: body.quota }
  }
}
