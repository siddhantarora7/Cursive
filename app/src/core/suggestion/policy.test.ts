import { describe, expect, it } from 'vitest'
import { SuggestionPolicy, type PolicyAction } from './policy'

const cfg = {
  debounceMs: 400,
  minContextWords: 3,
  maxSuggestionWords: 12,
  cacheSize: 8,
  backoffBaseMs: 1000,
  backoffCapMs: 60000,
}

const CTX = 'The quick brown fox jumps '

function kinds(actions: PolicyAction[]): string[] {
  return actions.map((a) => a.kind)
}

describe('SuggestionPolicy', () => {
  it('schedules a debounce on typing and requests after the pause', () => {
    const p = new SuggestionPolicy(cfg)
    const a1 = p.handle({ kind: 'typed', context: CTX }, 1000)
    expect(a1).toEqual([{ kind: 'schedule', at: 1400 }])
    const a2 = p.handle({ kind: 'tick' }, 1400)
    expect(kinds(a2)).toEqual(['request'])
  })

  it('does not request with fewer than 3 words of context', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'typed', context: 'too shor' }, 0)
    expect(p.handle({ kind: 'tick' }, 400)).toEqual([])
  })

  it('cancels the in-flight request when typing resumes', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'typed', context: CTX }, 0)
    const [req] = p.handle({ kind: 'tick' }, 400)
    expect(req!.kind).toBe('request')
    const id = req!.kind === 'request' ? req!.id : -1
    const a = p.handle({ kind: 'typed', context: CTX + 'o' }, 500)
    expect(a).toContainEqual({ kind: 'cancel', id })
  })

  it('shows a vetted response and ignores stale responses', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'typed', context: CTX }, 0)
    const [req] = p.handle({ kind: 'tick' }, 400)
    const id = req!.kind === 'request' ? req!.id : -1
    // stale id → ignored
    expect(p.handle({ kind: 'response', id: id + 99, raw: 'over the hill' }, 600)).toEqual([])
    const shown = p.handle({ kind: 'response', id, raw: 'over the hill' }, 700)
    expect(shown).toEqual([{ kind: 'show', text: 'over the hill' }])
  })

  it('drops garbage responses silently', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'typed', context: CTX }, 0)
    const [req] = p.handle({ kind: 'tick' }, 400)
    const id = req!.kind === 'request' ? req!.id : -1
    expect(p.handle({ kind: 'response', id, raw: 'Sure, here you go:' }, 600)).toEqual([])
  })

  it('serves a cache hit without a request', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'typed', context: CTX }, 0)
    const [req] = p.handle({ kind: 'tick' }, 400)
    const id = req!.kind === 'request' ? req!.id : -1
    p.handle({ kind: 'response', id, raw: 'over the hill' }, 600)
    p.handle({ kind: 'moved' }, 700) // clears shown state
    p.handle({ kind: 'typed', context: CTX }, 1000)
    const a = p.handle({ kind: 'tick' }, 1400)
    expect(a).toEqual([{ kind: 'show', text: 'over the hill' }])
  })

  it('backs off exponentially on failures and recovers', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'typed', context: CTX }, 0)
    const [r1] = p.handle({ kind: 'tick' }, 400)
    p.handle({ kind: 'failure', id: r1!.kind === 'request' ? r1!.id : -1, cause: 'rate' }, 500)
    // within backoff window (500 + 1000): no request
    p.handle({ kind: 'typed', context: CTX }, 600)
    expect(p.handle({ kind: 'tick' }, 1000)).toEqual([])
    // after the window: requests again
    p.handle({ kind: 'typed', context: CTX }, 1600)
    const a = p.handle({ kind: 'tick' }, 2000)
    expect(kinds(a)).toEqual(['request'])
  })

  it('pauses until the given time when the daily cap is exhausted', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'typed', context: CTX }, 0)
    const [req] = p.handle({ kind: 'tick' }, 400)
    p.handle(
      { kind: 'capExhausted', id: req!.kind === 'request' ? req!.id : -1, resumeAt: 100_000 },
      500,
    )
    p.handle({ kind: 'typed', context: CTX }, 600)
    expect(p.handle({ kind: 'tick' }, 1000)).toEqual([])
    p.handle({ kind: 'typed', context: CTX }, 100_100)
    expect(kinds(p.handle({ kind: 'tick' }, 100_500))).toEqual(['request'])
  })

  it('does not re-request the same context after a dismissal', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'typed', context: CTX }, 0)
    const [req] = p.handle({ kind: 'tick' }, 400)
    p.handle({ kind: 'response', id: req!.kind === 'request' ? req!.id : -1, raw: 'over it' }, 500)
    p.handle({ kind: 'dismissed' }, 600)
    p.handle({ kind: 'typed', context: CTX }, 700)
    expect(p.handle({ kind: 'tick' }, 1100)).toEqual([]) // same context: stay quiet
    p.handle({ kind: 'typed', context: CTX + 'more ' }, 1200)
    expect(kinds(p.handle({ kind: 'tick' }, 1600))).toEqual(['request']) // context moved on
  })

  it('suppresses requests during IME composition', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'compositionStart' }, 0)
    p.handle({ kind: 'typed', context: CTX }, 100)
    expect(p.handle({ kind: 'tick' }, 500)).toEqual([])
    p.handle({ kind: 'compositionEnd' }, 600)
    p.handle({ kind: 'typed', context: CTX }, 700)
    expect(kinds(p.handle({ kind: 'tick' }, 1100))).toEqual(['request'])
  })

  it('stops entirely when disabled', () => {
    const p = new SuggestionPolicy(cfg)
    p.handle({ kind: 'setEnabled', enabled: false }, 0)
    p.handle({ kind: 'typed', context: CTX }, 100)
    expect(p.handle({ kind: 'tick' }, 500)).toEqual([])
  })
})
