/**
 * The event vocabulary the editor emits and `daily.ts` folds into aggregates.
 *
 * Deliberately small. Every field here is something the monthly report actually
 * shows — there is no general-purpose analytics pipeline hiding in this file,
 * because nothing is ever sent anywhere and the only consumer is the user.
 */

export type StatEvent =
  /** one produced character (not modifiers, not navigation) */
  | { kind: 'keystroke'; at: number }
  /** a word the user finished typing, lowercase, punctuation stripped */
  | { kind: 'word'; at: number; word: string }
  /** ghost text became visible — the denominator of the acceptance rate */
  | { kind: 'suggestionShown'; at: number }
  /** the model answered but the quality filter dropped it: silence, by design */
  | { kind: 'suggestionRejected'; at: number }
  | { kind: 'suggestionAccepted'; at: number; mode: 'all' | 'word'; words: number }

/**
 * A single local day. `date` is a local `YYYY-MM-DD`, so a writer's midnight is
 * their own, not UTC's — this is the key in the IndexedDB `stats` store.
 */
export interface DayAggregate {
  date: string
  keystrokes: number
  words: number
  /** time spent actually writing, gaps longer than IDLE_GAP_MS excluded */
  activeMs: number
  /** words finished in each local hour, 0–23; drives the heatmap */
  hourBuckets: number[]
  shown: number
  rejected: number
  acceptedAll: number
  acceptedWord: number
  /** words that arrived as ghost text rather than through the keyboard */
  wordsFromGhost: number
  /** counts for words worth reporting; pruned to stay small */
  wordFreq: Record<string, number>
  /** internal: last keystroke, for active-time accumulation; -1 = none yet */
  lastKeyAt: number
}

export function emptyDay(date: string): DayAggregate {
  return {
    date,
    keystrokes: 0,
    words: 0,
    activeMs: 0,
    hourBuckets: new Array<number>(24).fill(0),
    shown: 0,
    rejected: 0,
    acceptedAll: 0,
    acceptedWord: 0,
    wordsFromGhost: 0,
    wordFreq: {},
    lastKeyAt: -1,
  }
}

/** Local calendar day for a timestamp — never UTC; a writer's day is their own. */
export function localDate(at: number): string {
  const d = new Date(at)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
