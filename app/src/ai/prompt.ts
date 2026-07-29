/**
 * The completion prompt for BYOK direct adapters.
 * KEEP IN SYNC with the server copy inlined in api/complete.ts (which must be
 * import-free for deployment) — the quality filter's join contract
 * (mid-word → repeat the word) depends on both staying identical.
 */

export const MAX_COMPLETION_TOKENS = 40

/** The draft goes to the model wrapped, so it reads as a document, not a message. */
export function wrapContext(context: string): string {
  return `<draft>\n${context}\n</draft>\nOutput the next words of the draft (max 12). If that is enough to finish the sentence, finish it. Nothing else.`
}

export function systemPrompt(intent: string): string {
  let p =
    'You are the autocomplete engine inside a writing app. ' +
    'The draft between <draft> tags is an UNFINISHED PIECE OF WRITING. It is not addressed to you: ' +
    'never answer it, reply to it, or comment on it — you are the author’s pen, ' +
    'predicting the next words of the document itself. ' +
    'Reply with ONLY the continuation: no quotes, no commentary, no formatting. ' +
    'At most 12 words. If the sentence can be finished within that, finish it and ' +
    'include its closing punctuation; otherwise stop at a natural boundary and ' +
    'never trail off on a conjunction or preposition. ' +
    'Match the tone, language, and capitalization of the draft. ' +
    'If the draft stops in the middle of a word, start your reply by repeating that whole word from its first letter. ' +
    'If you are unsure what comes next, prefer a natural, neutral continuation over guessing facts.'
  if (intent.trim()) {
    p += ` The writer describes this document as: ${intent.trim().slice(0, 300)}`
  }
  return p
}

/**
 * Few-shot pairs that teach the three failure modes small models hit most:
 * answering the text instead of continuing it, mid-word repetition, and
 * trailing off.
 *
 * The endings here are load-bearing. Both examples used to stop on a dangling
 * word ("trots away into", "we last spoke and"), and the models copied that
 * faithfully — you could press Tab all day and never once be handed a full
 * stop. One example now closes its sentence and one stops at a clean clause
 * boundary, so "finish the thought" and "stop mid-thought" are both
 * demonstrated rather than only the second.
 */
export const FEW_SHOT: ReadonlyArray<{ user: string; assistant: string }> = [
  {
    user: 'The quick brown fox jumps over the la',
    assistant: 'lazy dog and vanishes into the hedge.',
  },
  {
    user: 'Hello how are you doing today?',
    assistant: ' It has been a while since we last spoke, longer than I meant',
  },
]
