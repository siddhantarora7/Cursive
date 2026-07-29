import { describe, expect, it } from 'vitest'
import { describeStatus, formatResumeIn, type SuggestionStatus } from './status'

const NOW = 1_700_000_000_000

describe('formatResumeIn', () => {
  it('rounds to units a writer can act on', () => {
    expect(formatResumeIn(-5)).toBe('now')
    expect(formatResumeIn(0)).toBe('now')
    expect(formatResumeIn(20_000)).toBe('in a moment')
    expect(formatResumeIn(5 * 60_000)).toBe('in 5 min')
    expect(formatResumeIn(59 * 60_000)).toBe('in 59 min')
    expect(formatResumeIn(60 * 60_000)).toBe('in about an hour')
    expect(formatResumeIn(3 * 3_600_000)).toBe('in 3h')
  })
})

describe('describeStatus', () => {
  it('says nothing when there is nothing wrong', () => {
    expect(describeStatus({ kind: 'ready' }, NOW, 'free')).toBeNull()
    expect(describeStatus({ kind: 'off' }, NOW, 'free')).toBeNull()
  })

  it('names the daily allowance, when it returns, and the remedy', () => {
    const d = describeStatus({ kind: 'exhausted', resumeAt: NOW + 3 * 3_600_000 }, NOW, 'free')
    expect(d).not.toBeNull()
    expect(d!.text).toContain('used up for today')
    expect(d!.text).toContain('in 3h')
    expect(d!.cta).toEqual({ label: 'use your own key', target: 'byok' })
    expect(d!.tone).toBe('notice')
  })

  it('does not blame the user for our kill switch, but still offers the exit', () => {
    const d = describeStatus({ kind: 'disabled' }, NOW, 'free')!
    expect(d.text).toContain('our end')
    expect(d.text).not.toContain('used up')
    expect(d.cta).not.toBeNull()
  })

  /* The whole point of the task: these three must not read the same. */
  it('gives exhausted, rate-limited and unreachable three different messages', () => {
    const texts = (
      [
        { kind: 'exhausted', resumeAt: NOW + 60_000 },
        { kind: 'rate-limited', retryAt: NOW + 2_000 },
        { kind: 'unreachable', retryAt: NOW + 2_000 },
      ] as SuggestionStatus[]
    ).map((s) => describeStatus(s, NOW, 'free')!.text)
    expect(new Set(texts).size).toBe(3)
  })

  it('treats a transient stall as quiet and self-healing, with no CTA', () => {
    const rate = describeStatus({ kind: 'rate-limited', retryAt: NOW + 2_000 }, NOW, 'free')!
    expect(rate.tone).toBe('quiet')
    expect(rate.cta).toBeNull()
  })

  it('offers no key CTA when our own service is unreachable', () => {
    // it may well be the user's network; selling them a key here is a lie
    const d = describeStatus({ kind: 'unreachable', retryAt: NOW + 2_000 }, NOW, 'free')!
    expect(d.cta).toBeNull()
    expect(d.tone).toBe('quiet')
  })

  it('points a BYOK user at their own key when their provider is unreachable', () => {
    const d = describeStatus({ kind: 'unreachable', retryAt: NOW + 2_000 }, NOW, 'byok')!
    expect(d.text).toContain('your provider')
    expect(d.cta).toEqual({ label: 'open settings', target: 'byok' })
    expect(d.tone).toBe('notice')
  })

  it('attributes rate limiting to the right party in each mode', () => {
    const free = describeStatus({ kind: 'rate-limited', retryAt: NOW }, NOW, 'free')!
    const byok = describeStatus({ kind: 'rate-limited', retryAt: NOW }, NOW, 'byok')!
    expect(free.text).not.toContain('your provider')
    expect(byok.text).toContain('your provider')
  })
})
