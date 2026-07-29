/**
 * What a typing slip actually looks like, as opposed to a different word.
 *
 * This exists because plain edit distance is not a good enough filter once you
 * go past one edit. Measured against 25 real words the 82k list does not know
 * (`vercel`, `postgres`, `eslint`, …), an unconstrained distance-2 search
 * "corrected" 15 of them — `vercel` → `vessel`, `eslint` → `elliot`. A writer
 * would rather keep a typo than have their vocabulary quietly overwritten.
 *
 * Real two-edit typos are not arbitrary pairs of edits. They are transpositions
 * (`imemsne` for `immense`), doubled or dropped letters, and substitutions
 * between keys that sit next to each other under the same hand (`sandiwchws`
 * for `sandwiches`: one transposition plus w→e, and w and e are neighbours).
 * Scoring substitutions by keyboard adjacency is what separates the two, and it
 * is the whole reason this module is not just a distance function.
 */

/*
 * QWERTY geometry. Rows are staggered by roughly a quarter key, which is what
 * makes `s`/`w` neighbours but `s`/`r` not. Coordinates rather than a hand-
 * written adjacency table so the stagger is stated once and stays honest.
 */
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const ROW_OFFSET = [0, 0.25, 0.75]

const KEY_POS = new Map<string, [number, number]>()
for (let r = 0; r < ROWS.length; r++) {
  const row = ROWS[r]!
  for (let c = 0; c < row.length; c++) {
    KEY_POS.set(row[c]!, [c + ROW_OFFSET[r]!, r])
  }
}

/** True when two letters sit close enough to be hit by mistake for each other. */
export function keysAdjacent(a: string, b: string): boolean {
  if (a === b) return true
  const pa = KEY_POS.get(a)
  const pb = KEY_POS.get(b)
  if (!pa || !pb) return false
  const dx = Math.abs(pa[0] - pb[0])
  const dy = Math.abs(pa[1] - pb[1])
  return dx <= 1.05 && dy <= 1
}

/**
 * A substitution between distant keys is not a slip, so it is priced out of
 * reach rather than banned outright: the DP can still reach the same result by
 * paying for a delete plus an insert, which is the correct price for "you meant
 * a different word here".
 */
const FAR_SUBSTITUTION = 3

/**
 * Damerau-Levenshtein where substitution cost depends on keyboard distance,
 * abandoned as soon as the cheapest path provably exceeds `max`.
 *
 * `allowSubstitution` is the second measured guard. Callers turn it off when
 * the two words differ in length, because "one key mistyped AND one key
 * dropped" is the shape of nearly every false correction found — `vercel` →
 * `verde`, `vitest` → `votes`, `sqlite` → `spite` are all exactly that — while
 * genuine two-edit typos are transpositions, or letters purely added and
 * dropped. Same length, so no letter was lost: a mistyped key is credible.
 *
 * Runs on the input path, at a word boundary, only for words the dictionary
 * does not know. Measured at 2.6 ms worst case for a full scan of the
 * candidate slice; 0.0006 ms for the overwhelmingly common case of a word the
 * dictionary already knows, which never reaches here.
 */
export function slipDistance(a: string, b: string, max: number, allowSubstitution = true): number {
  const n = a.length
  const m = b.length
  if (Math.abs(n - m) > max) return max + 1

  let prev2: number[] = []
  let prev: number[] = new Array<number>(m + 1)
  let cur: number[] = new Array<number>(m + 1)
  for (let j = 0; j <= m; j++) prev[j] = j

  for (let i = 1; i <= n; i++) {
    cur = new Array<number>(m + 1)
    cur[0] = i
    let rowMin = i
    const ai = a[i - 1]!
    for (let j = 1; j <= m; j++) {
      const bj = b[j - 1]!
      const sub =
        ai === bj ? 0 : allowSubstitution && keysAdjacent(ai, bj) ? 1 : FAR_SUBSTITUTION
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + sub)
      // transposition: the single most common two-key slip, priced at one edit
      if (i > 1 && j > 1 && ai === b[j - 2] && a[i - 2] === bj) {
        v = Math.min(v, prev2[j - 2]! + 1)
      }
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[m]!
}
