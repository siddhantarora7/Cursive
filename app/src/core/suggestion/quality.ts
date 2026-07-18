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
 *    that doesn't repeat the partial word is an ambiguous join → drop.
 */
export function vetSuggestion(raw: string, context: string, maxWords: number): string | null {
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
  if (!/[\p{L}\p{N}]/u.test(body)) return null // punctuation-only

  const partial = lastPartialWord(context)
  const endsWithSpace = /\s$/.test(context)

  let joined: string
  if (startsWithSpace) {
    joined = (endsWithSpace ? '' : ' ') + body
  } else if (endsWithSpace) {
    joined = body
  } else if (partial) {
    // must repeat the in-progress word so we can strip the overlap
    if (body.length > partial.length && body.slice(0, partial.length).toLowerCase() === partial.toLowerCase()) {
      joined = body.slice(partial.length)
      if (!/^[\p{L}\p{N}]/u.test(joined) && !/^[\s.,;:!?')\]]/.test(joined)) return null
    } else {
      return null
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

  // truncate to maxWords on a word boundary
  const words = joined.trim().split(/\s+/)
  if (words.length > maxWords) {
    const lead = /^\s/.test(joined) ? ' ' : ''
    joined = lead + words.slice(0, maxWords).join(' ')
  }

  if (joined.length > 140) return null

  return joined
}
