import { describe, expect, it } from 'vitest'
import { vetSuggestion } from './quality'

const MAX = 12

/**
 * Join contract (mirrors the prompt in ai/): the model is asked to continue the
 * text exactly, repeating the in-progress word if the context ends mid-word.
 *  - raw starting with whitespace   → boundary join, normalized to one space
 *  - context ends mid-word          → raw must repeat the partial word (we strip
 *    the overlap) or it is dropped — a bad join is worse than none
 *  - context ends with space/punct  → letter-starting raw joins with the right spacing
 */
describe('vetSuggestion', () => {
  it('accepts a boundary continuation with a leading space', () => {
    expect(vetSuggestion(' over the lazy dog', 'The quick brown fox jumps', MAX)).toBe(
      ' over the lazy dog',
    )
  })

  it('strips the repeated partial word for mid-word completions', () => {
    expect(vetSuggestion('completion works', 'ghost text co', MAX)).toBe('mpletion works')
    expect(vetSuggestion('Completion works', 'ghost text co', MAX)).toBe('mpletion works')
  })

  it('drops a letter-start suggestion that does not repeat the partial word (ambiguous join)', () => {
    expect(vetSuggestion('over the fence', 'the fox jumps', MAX)).toBeNull()
  })

  it('accepts a tail continuation when the dictionary confirms the joined word', () => {
    const isWord = (w: string) => w === 'effortless'
    expect(
      vetSuggestion('less and completely natural', 'typing should feel effort', MAX, isWord),
    ).toBe('less and completely natural')
    // dictionary says no → still dropped
    expect(vetSuggestion('over the fence', 'the fox jumps', MAX, isWord)).toBeNull()
  })

  it('drops a pure repeat of the partial word', () => {
    expect(vetSuggestion('jumps', 'the fox jumps', MAX)).toBeNull()
  })

  it('joins cleanly when the context already ends with a space', () => {
    expect(vetSuggestion('over the fence', 'the fox jumps ', MAX)).toBe('over the fence')
    expect(vetSuggestion('  over the fence', 'the fox jumps ', MAX)).toBe('over the fence')
  })

  it('adds a space after sentence punctuation', () => {
    expect(vetSuggestion('The next day', 'It was late.', MAX)).toBe(' The next day')
  })

  it('rejects empty / whitespace / punctuation-only', () => {
    expect(vetSuggestion('', 'some context here ', MAX)).toBeNull()
    expect(vetSuggestion('   ', 'some context here ', MAX)).toBeNull()
    expect(vetSuggestion('.', 'some context here ', MAX)).toBeNull()
    expect(vetSuggestion('...', 'some context here ', MAX)).toBeNull()
  })

  it('rejects assistant chatter', () => {
    for (const bad of [
      'Sure, here is a continuation:',
      "Here's the completed sentence",
      'As an AI language model I',
      'I cannot complete this',
      'Certainly! The next words',
    ]) {
      expect(vetSuggestion(bad, 'the meeting is scheduled for ', MAX)).toBeNull()
    }
  })

  it('rejects assistant-mode replies to the text', () => {
    expect(
      vetSuggestion("I'm doing well thanks for asking how was your", 'Hello how are you doing today?', MAX),
    ).toBeNull()
    expect(
      vetSuggestion(' I am doing pretty well thank', 'Hello how are you doing today?', MAX),
    ).toBeNull()
    expect(vetSuggestion(' Great, thanks for asking!', 'How are you?', MAX)).toBeNull()
    expect(vetSuggestion(' Yes, I can help with that', 'Can you check the numbers?', MAX)).toBeNull()
    // but a legit first-person continuation without a question at the caret survives
    expect(
      vetSuggestion(" I'm doing well despite the long winter.", 'The diary entry began:', MAX),
    ).toBe(" I'm doing well despite the long winter.")
  })

  it('rejects markdown/formatting junk', () => {
    expect(vetSuggestion('- bullet point', 'plain prose context ', MAX)).toBeNull()
    expect(vetSuggestion('## Heading', 'plain prose context ', MAX)).toBeNull()
    expect(vetSuggestion('```js', 'plain prose context ', MAX)).toBeNull()
  })

  it('rejects a suggestion that repeats the context tail', () => {
    expect(vetSuggestion(' brown fox jumps', 'The quick brown fox jumps', MAX)).toBeNull()
    expect(vetSuggestion(' quick brown fox', 'The quick brown fox ', MAX)).toBeNull()
  })

  it('truncates at the max word count on a word boundary', () => {
    const long = ' one two three four five six seven eight nine ten eleven twelve thirteen'
    expect(vetSuggestion(long, 'counting now:', 5)).toBe(' one two three four five')
  })

  it('cuts at the first newline', () => {
    expect(vetSuggestion(' first line\nsecond line', 'context goes here ', MAX)).toBe('first line')
  })

  it('trims trailing whitespace', () => {
    expect(vetSuggestion(' hello there   ', 'well then,', MAX)).toBe(' hello there')
  })
})

/*
 * Cases found by the measurement harness (scripts/eval-suggestions.ts) against
 * real Groq responses, rather than invented at the desk.
 */
describe('vetSuggestion — findings from the eval corpus', () => {
  const dict = new Set(['worth', 'the', 'effort', 'effortless', 'door', 'doorstep', 'mist', 'misty'])
  const isWord = (w: string) => dict.has(w)

  it('rescues a continuation whose model dropped the leading space', () => {
    // "…was worth" + "it to you" — previously dropped, because "worthit" is not
    // a word. But "worth" is finished, so the model meant the next word.
    expect(vetSuggestion('it to you as an individual user', 'whether the time you spent was worth', 12, isWord))
      .toBe(' it to you as an individual user')
  })

  it('still completes a genuine mid-word tail', () => {
    expect(vetSuggestion('less to maintain', 'the work is effort', 12, isWord))
      .toBe('less to maintain')
  })

  it('stays silent when the fragment is neither a word nor completable', () => {
    expect(vetSuggestion('quickly afterwards', 'an outage is xyzq', 12, isWord)).toBeNull()
  })

  it('rejects a stutter once the word boundary is already complete', () => {
    // the space means "and" is finished; repeating it renders "and and"
    expect(vetSuggestion('and then she left', 'she opened the door and ', 12, isWord)).toBeNull()
    expect(vetSuggestion('to the station', 'she walked to ', 12, isWord)).toBeNull()
  })

  it('still strips the overlap when the word is mid-flight, not finished', () => {
    // no trailing space: the model was told to repeat the partial word, so
    // "and…" is the join contract working, not a stutter
    expect(vetSuggestion('and then she left', 'she opened the door and', 12, isWord))
      .toBe(' then she left')
  })

  it('does not mistake a real mid-word completion for a stutter', () => {
    // "doo" + "doorstep" repeats the partial word, which is the join contract
    expect(vetSuggestion('doorstep and knocked', 'she walked up to the doo', 12, isWord))
      .toBe('rstep and knocked')
  })
})
