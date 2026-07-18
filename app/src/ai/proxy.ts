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
      // cap / exhausted / disabled all mean "pause until tomorrow";
      // transient per-IP rate limiting backs off instead
      return body.reason === 'rate' ? { ok: false, cause: 'rate' } : { ok: false, cause: 'cap' }
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
