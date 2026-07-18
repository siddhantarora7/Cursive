/**
 * The completion prompt — shared by the free-tier proxy (api/ imports this)
 * and the BYOK direct adapters, so the quality filter's join contract
 * (mid-word → repeat the word) holds on every path.
 */

export const MAX_COMPLETION_TOKENS = 40

export function systemPrompt(intent: string): string {
  let p =
    'You are an invisible inline autocomplete inside a writing app. ' +
    'Continue the text exactly from where it stops. ' +
    'Reply with ONLY the continuation: no quotes, no commentary, no formatting. ' +
    'At most 12 words; stop at a natural phrase boundary. ' +
    'Match the tone, language, and capitalization of the text. ' +
    'If the text stops in the middle of a word, start your reply by repeating that whole word from its first letter.'
  if (intent.trim()) {
    p += ` The writer describes this document as: ${intent.trim().slice(0, 300)}`
  }
  return p
}
