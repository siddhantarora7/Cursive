import { localDate, type DayAggregate, type StatEvent } from './events'

/**
 * Folding events into one local day.
 *
 * `applyEvent` mutates the aggregate it is given and returns nothing. That is
 * deliberate: this runs on the editor's transaction path, at keystroke rate,
 * and rebuilding a 24-slot array plus a frequency map per character would put
 * allocation pressure exactly where PERF.md forbids it. It stays honest core
 * code — no DOM, no I/O, deterministic given (state, event) — so it is tested
 * the same way a pure reducer would be.
 */

/** A gap longer than this is a break, not writing time. */
export const IDLE_GAP_MS = 20_000

/** Words shorter than this are never interesting in a "most used" list. */
const MIN_INTERESTING_WORD = 4

/** Pruning bounds for the frequency map: it must not grow without limit. */
const FREQ_SOFT_CAP = 400
const FREQ_KEEP = 200

/**
 * Common words carry no signal about what someone wrote about. Kept short on
 * purpose — an aggressive list starts deleting the writer's actual vocabulary.
 * Only words of 4+ characters can reach this check, so "the", "and", "a" and
 * friends never need to appear here.
 */
const STOPWORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'here', 'they', 'them', 'then',
  'than', 'were', 'what', 'when', 'which', 'while', 'would', 'could',
  'should', 'been', 'being', 'because', 'about', 'into', 'over', 'just',
  'like', 'some', 'such', 'only', 'also', 'very', 'more', 'most', 'much',
  'many', 'there', 'their', 'those', 'these', 'your', 'yours', 'will',
  'shall', 'must', 'does', 'done', 'each', 'every', 'both', 'other',
  'another', 'where', 'whose', 'whom', 'after', 'before', 'still', 'even',
])

export function applyEvent(day: DayAggregate, ev: StatEvent): void {
  switch (ev.kind) {
    case 'keystroke': {
      day.keystrokes += 1
      if (day.lastKeyAt >= 0) {
        const gap = ev.at - day.lastKeyAt
        // a pause longer than IDLE_GAP_MS is a break; anything shorter counts
        if (gap > 0 && gap <= IDLE_GAP_MS) day.activeMs += gap
      }
      day.lastKeyAt = ev.at
      break
    }

    case 'word': {
      const w = normalizeWord(ev.word)
      day.words += 1
      day.hourBuckets[new Date(ev.at).getHours()]! += 1
      if (w.length >= MIN_INTERESTING_WORD && !STOPWORDS.has(w)) {
        day.wordFreq[w] = (day.wordFreq[w] ?? 0) + 1
        if (Object.keys(day.wordFreq).length > FREQ_SOFT_CAP) pruneFreq(day)
      }
      break
    }

    case 'suggestionShown':
      day.shown += 1
      break

    case 'suggestionRejected':
      day.rejected += 1
      break

    case 'suggestionAccepted': {
      if (ev.mode === 'all') day.acceptedAll += 1
      else day.acceptedWord += 1
      day.wordsFromGhost += ev.words
      break
    }
  }
}

/** Lowercase, strip surrounding punctuation, keep internal apostrophes. */
export function normalizeWord(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[^\p{L}\p{N}'’]+$/u, '')
}

/** Keep the busiest FREQ_KEEP words. Amortised: runs once per 200 new words. */
function pruneFreq(day: DayAggregate): void {
  const kept = Object.entries(day.wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, FREQ_KEEP)
  day.wordFreq = Object.fromEntries(kept)
}

/**
 * Which day an event belongs to. The caller uses this to decide whether to roll
 * over to a fresh aggregate — a session that crosses midnight must not smear
 * across two days.
 */
export function dayOf(ev: StatEvent): string {
  return localDate(ev.at)
}
