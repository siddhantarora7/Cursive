import { describe, expect, it } from 'vitest'
import { LiveStats } from './live'

/** type `n` chars evenly over `ms`, starting at `t0` */
function type(s: LiveStats, t0: number, n: number, ms: number): number {
  for (let i = 0; i < n; i++) s.record(t0 + (i * ms) / n)
  return t0 + ms
}

describe('LiveStats', () => {
  it('is silent before enough signal', () => {
    const s = new LiveStats()
    expect(s.wpm(1000)).toBe(0)
    s.record(1000)
    expect(s.wpm(1001)).toBe(0) // < 5 chars → no reading
  })

  it('computes a sane WPM for steady typing', () => {
    const s = new LiveStats()
    // 300 chars over 60s window-capped → 5 cps = 60 wpm
    const end = type(s, 0, 60, 12_000) // 5 chars/s for 12s
    const wpm = s.wpm(end)
    expect(wpm).toBeGreaterThanOrEqual(55)
    expect(wpm).toBeLessThanOrEqual(65)
  })

  it('drops to zero after the window empties', () => {
    const s = new LiveStats()
    const end = type(s, 0, 60, 12_000)
    expect(s.wpm(end + 30_000)).toBe(0)
  })

  it('tracks streaks and breaks them on pauses', () => {
    const s = new LiveStats()
    const end = type(s, 0, 50, 10_000)
    expect(s.streakSeconds(end)).toBeGreaterThanOrEqual(9)
    expect(s.streakSeconds(end + 5_000)).toBe(0) // paused → broken
    s.record(end + 5_000) // typing again → new streak from here
    expect(s.streakSeconds(end + 5_500)).toBe(0)
    expect(s.streakSeconds(end + 6_100)).toBeLessThanOrEqual(1)
  })

  it('combo levels scale with speed and die when idle', () => {
    const fast = new LiveStats()
    const end = type(fast, 0, 120, 12_000) // 10 cps ≈ 120 wpm
    expect(fast.comboLevel(end)).toBe(3)
    expect(fast.comboLevel(end + 10_000)).toBe(0)
    const slow = new LiveStats()
    const end2 = type(slow, 0, 36, 12_000) // 3 cps ≈ 36 wpm
    expect(slow.comboLevel(end2)).toBe(1)
  })
})
