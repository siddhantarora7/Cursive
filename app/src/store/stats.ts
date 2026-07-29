import { applyEvent } from '../core/stats/daily'
import { emptyDay, localDate, type DayAggregate, type StatEvent } from '../core/stats/events'
import { getDb } from './db'

/**
 * Local stats persistence. Everything here stays in this browser — there is no
 * network call in this file and there must never be one. The reducers live in
 * core/stats; this is only the clock, the rollover, and the writes.
 */

/** Stats churn per keystroke, so they are written far less eagerly than docs. */
const SAVE_DEBOUNCE_MS = 5_000

export class StatsRecorder {
  private day: DayAggregate | null = null
  private timer = 0
  private ready: Promise<void>

  constructor() {
    this.ready = this.load(localDate(Date.now()))
  }

  private async load(date: string): Promise<void> {
    const stored = await (await getDb()).get('stats', date)
    // a fresh load must not inherit yesterday's cursor into active-time maths
    this.day = stored ? { ...emptyDay(date), ...stored, lastKeyAt: -1 } : emptyDay(date)
  }

  /**
   * Fold one event in. Cheap and synchronous — it runs on the editor's
   * transaction path. Events arriving before the day has loaded are dropped
   * rather than queued; a handful of keystrokes at boot is not worth the
   * complexity of a buffer.
   */
  record(ev: StatEvent): void {
    const date = localDate(ev.at)
    if (this.day === null) return
    if (this.day.date !== date) {
      // crossed midnight mid-session: bank the finished day, start a fresh one
      void this.persist(this.day)
      this.day = emptyDay(date)
    }
    applyEvent(this.day, ev)
    this.schedule()
  }

  private schedule(): void {
    if (this.timer !== 0) return
    this.timer = window.setTimeout(() => {
      this.timer = 0
      if (this.day) void this.persist(this.day)
    }, SAVE_DEBOUNCE_MS)
  }

  private async persist(day: DayAggregate): Promise<void> {
    await (await getDb()).put('stats', { ...day }, day.date)
  }

  /**
   * Force a write. Returns the write so a reader (the stats panel) can wait for
   * it; `pagehide` callers ignore the promise, which is all they can do anyway.
   */
  flush(): Promise<void> {
    window.clearTimeout(this.timer)
    this.timer = 0
    return this.day ? this.persist(this.day) : Promise.resolve()
  }

  dispose(): void {
    void this.flush()
  }

  /** Resolves once today's aggregate has loaded; for tests and the report view. */
  whenReady(): Promise<void> {
    return this.ready
  }
}

/** Every day on record, oldest first. */
export async function listDays(): Promise<DayAggregate[]> {
  const db = await getDb()
  const all = await db.getAll('stats')
  return all
    .filter((d): d is DayAggregate => typeof d?.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date))
}
