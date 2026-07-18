/**
 * Live typing stats — pure, clock-injected. Powers the FX combo glow and the
 * Demo-mode overlay now; the Phase 3 stats engine builds on the same events.
 */

const WPM_WINDOW_MS = 12_000
const CHARS_PER_WORD = 5
/** a pause this long breaks the streak */
const STREAK_GAP_MS = 2_000

export class LiveStats {
  private times: number[] = []
  private streakStart = 0
  private lastKey = 0

  /** call on every produced character (not modifiers) */
  record(now: number): void {
    this.times.push(now)
    // drop everything left of the window; array stays tiny (window * ~20cps)
    const cutoff = now - WPM_WINDOW_MS
    let i = 0
    while (i < this.times.length && this.times[i]! < cutoff) i++
    if (i > 0) this.times.splice(0, i)
    if (now - this.lastKey > STREAK_GAP_MS) this.streakStart = now
    this.lastKey = now
  }

  /** words per minute over the rolling window */
  wpm(now: number): number {
    const cutoff = now - WPM_WINDOW_MS
    const chars = this.times.filter((t) => t >= cutoff).length
    if (chars < 5) return 0
    const spanMs = Math.max(1_000, Math.min(WPM_WINDOW_MS, now - this.times[0]!))
    return Math.round((chars / CHARS_PER_WORD) * (60_000 / spanMs))
  }

  /** seconds of uninterrupted typing */
  streakSeconds(now: number): number {
    if (this.lastKey === 0 || now - this.lastKey > STREAK_GAP_MS) return 0
    return Math.floor((now - this.streakStart) / 1000)
  }

  /** 0 = idle … 3 = on fire; drives the FX glow */
  comboLevel(now: number): 0 | 1 | 2 | 3 {
    const wpm = this.wpm(now)
    if (now - this.lastKey > STREAK_GAP_MS || wpm < 30) return 0
    if (wpm < 55) return 1
    if (wpm < 85) return 2
    return 3
  }
}
