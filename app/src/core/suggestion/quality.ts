import { lastPartialWord } from '../text/context'

/**
 * Vet a raw model completion against the context it was requested for.
 * Returns the exact string to render after the caret, or null to drop it
 * silently — a bad suggestion is worse than none.
 *
 * Join contract (the prompt in ai/ is written to match):
 *  - raw starts with whitespace → boundary continuation, normalized to the
 *    right spacing for how the context ends
 *  - context ends mid-word → raw must repeat that partial word (models asked to
 *    "continue exactly" usually re-type it); we strip the overlap. A letter-run
 *    that doesn't repeat the partial word is accepted only when `isWord`
 *    confirms partial+run forms a real word (tail continuation, e.g.
 *    "effort" + "less…"); otherwise the join is ambiguous → drop.
 */
/** Scale words and digits — the vocabulary of a statistic rather than a phrase. */
const QUANTITY = /\d|\b(percent|percentage|hundred|thousand|million|billion|trillion)\b/i

/**
 * Drop a continuation that introduces a number the draft does not already
 * contain.
 *
 * Measured: given "median rent in the city rose by ", every free model in every
 * prompt variant produced a confident figure — "nearly twenty five percent",
 * "over 50 percent" — including under a prompt that says, verbatim, never to
 * invent a number. The text is well-formed and in register, so nothing else in
 * this filter can see anything wrong with it, and a writer who presses Tab has
 * a fabricated statistic in their draft with no mark on it.
 *
 * The rule is blunt on purpose: a number in prose is nearly always a factual
 * claim, and a claim is the one thing a next-word predictor has no business
 * supplying. It costs the writer very little — they know their own figures and
 * can type them — and a number they typed themselves stays available to the
 * model as context, so continuing *after* a figure still works.
 *
 * Small number words ("one of the reasons", "a few days") are deliberately not
 * matched: they are rhetorical rather than quantitative.
 */
function inventsAQuantity(joined: string, context: string): boolean {
  const m = joined.match(QUANTITY)
  if (!m) return false
  // the writer already put this number in the draft, so it is theirs, not the
  // model's — continuing a sentence that already says "40 percent" is fine
  return !new RegExp(`\\b${m[0]}\\b`, 'i').test(context)
}

export function vetSuggestion(
  raw: string,
  context: string,
  maxWords: number,
  isWord?: (word: string) => boolean,
): string | null {
  if (!raw) return null

  // keep only the first line
  const nl = raw.indexOf('\n')
  let text = nl === -1 ? raw : raw.slice(0, nl)
  text = text.replace(/\s+$/, '')
  if (!text) return null

  const startsWithSpace = /^\s/.test(text)
  const body = text.replace(/^\s+/, '')
  if (!body) return null

  // formatting junk & assistant chatter
  if (/^([-*#>`]|\d+\.\s)/.test(body)) return null
  if (
    /^(sure|here('|’)?s?\b|certainly|of course|as an ai|i can(no|')t|i'm sorry|okay,|ok,)/i.test(
      body,
    )
  )
    return null
  // assistant-mode leak: the model answered the text instead of continuing it
  if (/thanks? for asking/i.test(body)) return null
  // a question at the caret + a bare first-person answer = a reply, not a continuation
  if (/\?\s*$/.test(context) && /^(i([’']| a)?m\b|yes[,.!]|no[,.!]|(great|good|fine|well),)/i.test(body))
    return null
  if (!/[\p{L}\p{N}]/u.test(body)) return null // punctuation-only

  const partial = lastPartialWord(context)
  const endsWithSpace = /\s$/.test(context)

  let joined: string
  if (startsWithSpace) {
    joined = (endsWithSpace ? '' : ' ') + body
  } else if (endsWithSpace) {
    joined = body
  } else if (partial) {
    // must repeat the in-progress word so we can strip the overlap…
    if (body.length > partial.length && body.slice(0, partial.length).toLowerCase() === partial.toLowerCase()) {
      joined = body.slice(partial.length)
      if (!/^[\p{L}\p{N}]/u.test(joined) && !/^[\s.,;:!?')\]]/.test(joined)) return null
    } else {
      // …or be a tail that completes it into a dictionary word ("effort"+"less")
      const run = body.match(/^[a-zA-Z]+/)
      if (isWord && run && isWord((partial + run[0]).toLowerCase())) {
        joined = body
      } else if (isWord && isWord(partial.toLowerCase())) {
        // The "partial" word is already a finished word ("worth", "the"), and
        // the continuation does not extend it into another one. The model meant
        // the next word and simply dropped the leading space, so supply it.
        // Measured: this was the largest source of lost-but-good suggestions.
        joined = ' ' + body
      } else {
        return null
      }
    }
  } else {
    // context ends with punctuation, raw starts with a letter → new sentence/word
    joined = ' ' + body
  }

  if (!joined.trim()) return null

  // repeats what was just written?
  const tail = context.trim().slice(-64).toLowerCase()
  const j = joined.trim().toLowerCase()
  if (j.length >= 4 && tail.includes(j)) return null

  // stutter at the seam: "…and" + "and then" reads as a typo the moment it
  // renders. The tail check above misses it for words shorter than 4 letters.
  const lastWord = context.trim().match(/[\p{L}\p{N}'’-]+$/u)?.[0]?.toLowerCase()
  const firstWord = j.match(/^[\p{L}\p{N}'’-]+/u)?.[0]
  if (lastWord && firstWord && lastWord === firstWord && !partial) return null

  if (inventsAQuantity(joined, context)) return null

  // truncate to maxWords on a word boundary
  const words = joined.trim().split(/\s+/)
  if (words.length > maxWords) {
    const lead = /^\s/.test(joined) ? ' ' : ''
    joined = lead + words.slice(0, maxWords).join(' ')
  }

  if (joined.length > 140) return null

  return joined
}
