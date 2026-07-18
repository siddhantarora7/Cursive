/** Pure text utilities shared by the suggestion pipeline, status bar, and export. */

export function wordCount(text: string): number {
  const m = text.match(/\S+/g)
  return m ? m.length : 0
}

/**
 * Take the last `maxChars` of `text`, cutting on a word boundary at the left
 * edge so the model never sees half a word at the start. The right edge (the
 * caret side) is always kept byte-exact — a trailing partial word is the whole
 * point of mid-word completions.
 */
export function sliceContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const window = text.slice(-maxChars)
  const firstSpace = window.search(/\s/)
  if (firstSpace === -1 || firstSpace === window.length - 1) {
    return window // one giant token: hard cut is the only option
  }
  return window.slice(firstSpace + 1)
}

/** The in-progress word the caret sits in, or '' when at a boundary. */
export function lastPartialWord(text: string): string {
  const m = text.match(/[\p{L}\p{N}'’-]+$/u)
  return m ? m[0] : ''
}
