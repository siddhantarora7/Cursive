import type { Dictionary } from './dictionary'
import { slipDistance } from './slips'

/**
 * Word-boundary autocorrect, phone-keyboard style. Conservative on purpose —
 * silently changing what someone typed is the fastest way to lose trust:
 *  - only pure-alpha words, 3+ letters, lowercase or First-capped
 *  - never touches a word the dictionary knows
 *  - one edit away: generate every Damerau edit and look it up. Cheap, and it
 *    catches slips that change the first letter.
 *  - two edits away: scan the common slice of the dictionary with a
 *    keyboard-aware distance (see slips.ts). Deliberately narrower, because
 *    two edits is enough rope to reach a genuinely different word.
 *  - corrections must land on a reasonably common word (rank cap)
 */

/** Don't correct TO words rarer than this rank. */
const MAX_CANDIDATE_RANK = 30_000

const ALPHA = /^[a-z]+$/
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

export function correctWord(word: string, dict: Dictionary): string | null {
  if (word.length < 3 || word.length > 20) return null
  const firstCapped = /^[A-Z][a-z]+$/.test(word)
  if (!firstCapped && !/^[a-z]+$/.test(word)) return null // acronyms, camelCase, digits, apostrophes
  const lower = word.toLowerCase()
  if (!ALPHA.test(lower)) return null
  if (dict.has(lower)) return null

  let best: string | null = null
  let bestRank = MAX_CANDIDATE_RANK + 1
  const consider = (candidate: string) => {
    const rank = dict.get(candidate)
    if (rank !== undefined && rank < bestRank) {
      best = candidate
      bestRank = rank
    }
  }

  const n = lower.length
  // transpositions (checked like any candidate; frequency decides)
  for (let i = 0; i < n - 1; i++) {
    consider(lower.slice(0, i) + lower[i + 1]! + lower[i]! + lower.slice(i + 2))
  }
  // deletions
  for (let i = 0; i < n; i++) {
    consider(lower.slice(0, i) + lower.slice(i + 1))
  }
  // substitutions
  for (let i = 0; i < n; i++) {
    for (const c of LETTERS) {
      if (c !== lower[i]) consider(lower.slice(0, i) + c + lower.slice(i + 1))
    }
  }
  // insertions
  for (let i = 0; i <= n; i++) {
    for (const c of LETTERS) {
      consider(lower.slice(0, i) + c + lower.slice(i))
    }
  }

  if (best === null) best = findTwoEditSlip(lower, dict)
  if (best === null) return null
  const result: string = best
  return firstCapped ? result[0]!.toUpperCase() + result.slice(1) : result
}

/*
 * Guards for the two-edit search. Each one was chosen against measured false
 * corrections on a list of real words the dictionary does not know, not from
 * taste — the numbers are in the test file next to this.
 */

/** Two edits is half of a four-letter word; below that it is a coin flip. */
const MIN_FAR_LENGTH = 4
/** Tighter than the one-edit cap: two edits should only reach familiar words. */
const MAX_FAR_RANK = 20_000
/**
 * A slip rarely changes a word's length by more than one. Dropping this to 1
 * is what stops `indexeddb` → `indexed`, `pytorch` → `porch`, `sqlite` → `site`
 * — all of which are two clean deletions and all of which are wrong.
 */
const MAX_FAR_LENGTH_DIFF = 1

/**
 * Best word within two keyboard-plausible edits, or null.
 *
 * Scans the common slice of the dictionary rather than generating edits: the
 * two-edit neighbourhood of a word is hundreds of thousands of strings, while
 * the slice is 20k entries of which the length and first-letter tests reject
 * all but a few hundred. Requiring the first letter to match is a real limit —
 * a slip on the first key is not corrected at this distance — but it is what
 * keeps the scan inside a frame, and one-edit generation above already covers
 * first-letter slips.
 */
function findTwoEditSlip(word: string, dict: Dictionary): string | null {
  if (word.length < MIN_FAR_LENGTH) return null
  const initial = word[0]!
  let best: string | null = null
  let bestDistance = 3

  for (const [candidate, rank] of dict) {
    if (rank >= MAX_FAR_RANK) break // the map is in frequency order
    if (candidate[0] !== initial) continue
    if (Math.abs(candidate.length - word.length) > MAX_FAR_LENGTH_DIFF) continue
    // a mistyped key is only credible when no letter also went missing
    const d = slipDistance(word, candidate, 2, candidate.length === word.length)
    // ties break on rank, and the map is walked most-frequent-first, so the
    // first candidate at a given distance is already the most common one
    if (d < bestDistance) {
      best = candidate
      bestDistance = d
      if (d === 1) break // nothing can beat this later in the scan
    }
  }
  return best
}

/** Don't expand a lone letter to anything rarer than this rank. */
const MAX_SINGLE_RANK = 50
const CONSONANTS = 'bcdfghjklmnpqrstvwxyz'

/**
 * Lone-letter fixes, applied at the word boundary like everything else:
 *  - `i` → `I` (always; English's one-letter pronoun is never lowercase)
 *  - a lone consonant followed by a SPACE (only — `plan b.` stays alone)
 *    expands to the most frequent two-letter word one insertion away,
 *    e.g. `n` → `in`, `t` → `to`. Restricted to very common targets.
 */
export function correctLoneLetter(word: string, dict: Dictionary, delim: string): string | null {
  if (word === 'i') return 'I'
  if (word.length !== 1 || delim !== ' ') return null
  if (!CONSONANTS.includes(word)) return null
  let best: string | null = null
  let bestRank = MAX_SINGLE_RANK
  for (const c of LETTERS) {
    for (const candidate of [c + word, word + c]) {
      const rank = dict.get(candidate)
      if (rank !== undefined && rank < bestRank) {
        best = candidate
        bestRank = rank
      }
    }
  }
  return best
}
