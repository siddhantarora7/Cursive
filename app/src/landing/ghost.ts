/*
 * The landing page's completion source.
 *
 * Entirely local: a curated table, no network, no model, nothing sent
 * anywhere. That is not a shortcut, it is the honest thing to ship on a page
 * whose central claim is that your words stay in your browser. Wiring a real
 * proxy call into the hero would mean every visitor's keystrokes left the page
 * before they had read the paragraph promising they wouldn't.
 *
 * The behaviour it imitates is the real one: suggest only at a natural
 * boundary, never mid-word, and stay silent rather than offer something bad.
 * `core/suggestion` follows the same rule in the actual editor.
 */

/*
 * Full sentences, in the casing they should be offered in. Matching is
 * case-insensitive but the slice comes from these, so accepting "The deadline
 * moved to " yields "Friday" and not "friday". Lowercasing the source to make
 * matching easier means the suggestion arrives in the wrong case, which is
 * exactly the kind of detail that makes a completion feel fake.
 */
const SEEDS = [
  'The deadline moved to Friday, which means we lose the buffer we planned for.',
  'Thanks for flagging it. The cleanest fix is probably to ship the smaller change first.',
  'No update yet, but I should have something to show by Thursday.',
  'I have been thinking about this all week and I keep coming back to the same answer.',
  'Quick note before I forget: the numbers in the deck are out of date.',
  'Happy to take that piece if it helps, I have some room this week.',
  'The short version is that we tried it, it did not work, and here is why.',
  'Let me know if you would rather talk it through than read another thread.',
]

/** Continuations keyed on the last committed word. */
const AFTER: Record<string, string> = {
  the: ' rest of it can wait until Monday.',
  i: ' will put something together this afternoon.',
  we: ' should probably decide before the end of the week.',
  it: ' turned out to be simpler than expected.',
  and: ' that is roughly where things stand.',
  but: ' nothing is blocking us yet.',
  so: ' the plan has not really changed.',
  because: ' the timeline was never realistic to begin with.',
  this: ' is the part I keep getting stuck on.',
  they: ' have not come back to us yet.',
  if: ' that works for you, I will set it up.',
  when: ' you get a moment, have a look and tell me.',
  to: ' be honest, I am not sure it matters much.',
  is: ' probably fine either way.',
  was: ' never really the problem.',
  a: ' little more time would help.',
  my: ' sense is that we are close.',
  your: ' call entirely, either way works.',
}

/** Used when nothing else matches, chosen deterministically from the text. */
const GENERIC = [
  ' and I think that is the right call.',
  ' before anything else changes.',
  ' so nothing is blocked on my end.',
  ' once the details are settled.',
]

/*
 * What an empty, freshly focused field is offered.
 *
 * Without this, clicking in and pressing Tab does nothing at all: there is no
 * text, so there is nothing to complete, so the key correctly does nothing and
 * the whole thing reads as broken. An opener means the first key anyone presses
 * pays off.
 */
export const OPENER = 'The deadline moved to Friday, which means '

/**
 * The completion to show after `text`, or an empty string for none.
 *
 * Returns nothing mid-word: a suggestion that appears while you are still
 * typing a word fights the letters you are about to press, which is the single
 * most annoying thing autocomplete does.
 */
export function completeFor(text: string): string {
  if (text.trim().length < 2) return ''
  if (!/[\s.,;:!?]$/.test(text)) return ''

  const typed = text.trimStart()
  const lower = typed.toLowerCase()

  for (const seed of SEEDS) {
    if (seed.toLowerCase().startsWith(lower) && seed.length > typed.length) {
      return seed.slice(typed.length)
    }
  }

  const words = lower.trim().split(/\s+/)
  const last = words[words.length - 1]?.replace(/[^a-z]/g, '') ?? ''
  const byWord = AFTER[last]
  if (byWord) return byWord

  // Deterministic so the same sentence always gets the same offer.
  const seed = text.length + (text.charCodeAt(0) || 0)
  return GENERIC[seed % GENERIC.length] ?? ''
}
