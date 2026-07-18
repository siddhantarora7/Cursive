import type { Dictionary } from './dictionary'

/**
 * Word-boundary autocorrect, phone-keyboard style. Conservative on purpose —
 * silently changing what someone typed is the fastest way to lose trust:
 *  - only pure-alpha words, 3+ letters, lowercase or First-capped
 *  - never touches a word the dictionary knows
 *  - candidates are Damerau edit-distance 1 only (covers transpositions,
 *    the dominant real-world typo), ranked by corpus frequency
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

  if (best === null) return null
  const result: string = best
  return firstCapped ? result[0]!.toUpperCase() + result.slice(1) : result
}
