import type { DayAggregate } from './events'

/**
 * The monthly Wrapped, derived from daily aggregates. Pure: the same input
 * always produces the same report, which is what makes the screenshot people
 * share reproducible rather than a mood reading of a live counter.
 */

export interface MonthlyReport {
  /** `YYYY-MM` */
  month: string
  /** days with any writing at all */
  daysWritten: number
  words: number
  keystrokes: number
  activeMinutes: number
  /** longest run of consecutive written days ending inside this month */
  longestStreak: number
  /** hour 0–23 with the most words, or null if nothing was written */
  bestHour: number | null
  /** the day with the most words */
  bestDay: { date: string; words: number } | null
  topWords: Array<{ word: string; count: number }>
  ghost: {
    shown: number
    accepted: number
    /** 0–1; null when nothing was ever shown, which is not a 0% rate */
    rate: number | null
    wordsFromGhost: number
  }
  persona: Persona
}

export interface Persona {
  title: string
  blurb: string
}

/** Month key for a `YYYY-MM-DD` date. */
function monthOf(date: string): string {
  return date.slice(0, 7)
}

/** Days between two `YYYY-MM-DD` dates, calendar-wise. */
function daysApart(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number]
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number]
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/**
 * Build the report for one month.
 *
 * `days` may contain the whole history — days outside the month are used only
 * to extend a streak that began before the 1st, which is the honest way to
 * count a run that a month boundary happens to bisect.
 */
export function buildMonthlyReport(days: DayAggregate[], month: string): MonthlyReport {
  const written = days
    .filter((d) => d.words > 0 || d.keystrokes > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  const inMonth = written.filter((d) => monthOf(d.date) === month)

  const words = sum(inMonth, (d) => d.words)
  const keystrokes = sum(inMonth, (d) => d.keystrokes)
  const activeMinutes = Math.round(sum(inMonth, (d) => d.activeMs) / 60_000)

  const hours = new Array<number>(24).fill(0)
  for (const d of inMonth) {
    for (let h = 0; h < 24; h++) hours[h]! += d.hourBuckets[h] ?? 0
  }
  const peak = Math.max(...hours)
  const bestHour = peak > 0 ? hours.indexOf(peak) : null

  const bestDay = inMonth.reduce<{ date: string; words: number } | null>(
    (best, d) => (best === null || d.words > best.words ? { date: d.date, words: d.words } : best),
    null,
  )

  const freq: Record<string, number> = {}
  for (const d of inMonth) {
    for (const [w, n] of Object.entries(d.wordFreq)) freq[w] = (freq[w] ?? 0) + n
  }
  const topWords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }))

  const shown = sum(inMonth, (d) => d.shown)
  const accepted = sum(inMonth, (d) => d.acceptedAll + d.acceptedWord)
  const ghost = {
    shown,
    accepted,
    // never shown is not the same as never accepted; a 0% badge would be a lie
    rate: shown > 0 ? accepted / shown : null,
    wordsFromGhost: sum(inMonth, (d) => d.wordsFromGhost),
  }

  const report: Omit<MonthlyReport, 'persona'> = {
    month,
    daysWritten: inMonth.length,
    words,
    keystrokes,
    activeMinutes,
    longestStreak: longestStreakEndingIn(written, month),
    bestHour,
    bestDay,
    topWords,
    ghost,
  }
  return { ...report, persona: derivePersona(report) }
}

function sum<T>(xs: T[], f: (x: T) => number): number {
  let t = 0
  for (const x of xs) t += f(x)
  return t
}

/**
 * The longest consecutive run of written days that touches this month. A run
 * that started in the previous month still counts for its full length — the
 * calendar boundary is our bookkeeping, not the writer's achievement.
 */
function longestStreakEndingIn(writtenSorted: DayAggregate[], month: string): number {
  let best = 0
  let run = 0
  let prev: string | null = null

  for (const d of writtenSorted) {
    run = prev !== null && daysApart(prev, d.date) === 1 ? run + 1 : 1
    prev = d.date
    if (monthOf(d.date) === month) best = Math.max(best, run)
  }
  return best
}

/**
 * A label for the shape of the month. Ordered most-specific first so the
 * distinctive result wins over the generic one.
 */
export function derivePersona(r: Omit<MonthlyReport, 'persona'>): Persona {
  const { bestHour, daysWritten, words, longestStreak, ghost } = r

  if (words === 0) {
    return { title: 'The Blank Page', blurb: 'A month of thinking about it. That counts too.' }
  }
  if (bestHour !== null && (bestHour >= 22 || bestHour < 4)) {
    return { title: 'The Night Writer', blurb: 'Your best sentences arrive after everyone else is asleep.' }
  }
  if (bestHour !== null && bestHour >= 4 && bestHour < 8) {
    return { title: 'First Light', blurb: 'You do the hard part before the day gets a vote.' }
  }
  if (longestStreak >= 14) {
    return { title: 'The Metronome', blurb: `${longestStreak} days without missing. That is the whole trick.` }
  }
  if (ghost.rate !== null && ghost.rate >= 0.4) {
    return { title: 'The Duet', blurb: 'You and the ghost finish each other’s sentences.' }
  }
  if (ghost.rate !== null && ghost.rate < 0.1 && ghost.shown >= 50) {
    return { title: 'The Purist', blurb: 'Offered a thousand words. Took your own.' }
  }
  if (daysWritten <= 4 && words >= 3000) {
    return { title: 'The Sprinter', blurb: 'Few sittings, enormous ones.' }
  }
  if (words >= 10_000) {
    return { title: 'The Marathoner', blurb: `${words.toLocaleString()} words is a small book.` }
  }
  return { title: 'The Regular', blurb: 'Showed up, put words down, went about your day.' }
}
