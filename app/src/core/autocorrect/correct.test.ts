import { describe, expect, it } from 'vitest'
import { correctLoneLetter, correctWord } from './correct'
import { readFileSync } from 'node:fs'
import { parseDictionary } from './dictionary'

// tiny rank-ordered dictionary for tests (rank = position, most frequent first)
const dict = parseDictionary(
  [
    'the', 'of', 'in', 'was', 'on', 'what', 'an', 'and', 'quite', 'although',
    'bad', 'hello', 'world', 'it', 'that', 'this', 'dont', 'its', 'tea', 'ten',
  ].join('\n'),
)

describe('correctWord — Damerau edit-distance-1 against a frequency-ranked dictionary', () => {
  it('fixes the classic transpositions and slips', () => {
    expect(correctWord('waht', dict)).toBe('what')
    expect(correctWord('wsa', dict)).toBe('was')
    expect(correctWord('qutie', dict)).toBe('quite')
    expect(correctWord('altough', dict)).toBe('although')
    expect(correctWord('bda', dict)).toBe('bad')
    expect(correctWord('teh', dict)).toBe('the')
    expect(correctWord('helo', dict)).toBe('hello')
  })

  it('preserves leading capitalization', () => {
    expect(correctWord('Waht', dict)).toBe('What')
    expect(correctWord('Teh', dict)).toBe('The')
  })

  it('never touches valid words', () => {
    expect(correctWord('what', dict)).toBeNull()
    expect(correctWord('Hello', dict)).toBeNull()
    expect(correctWord('its', dict)).toBeNull()
  })

  it('prefers the more frequent candidate when several are one edit away', () => {
    // "tha" → the (rank 0) beats that (rank 10) and tea (rank 14)
    expect(correctWord('tha', dict)).toBe('the')
  })

  it('lone i becomes I after any delimiter', () => {
    expect(correctLoneLetter('i', dict, ' ')).toBe('I')
    expect(correctLoneLetter('i', dict, '.')).toBe('I')
    expect(correctLoneLetter('i', dict, ',')).toBe('I')
  })

  it('a lone consonant before a space expands to the most frequent neighbor word', () => {
    expect(correctLoneLetter('n', dict, ' ')).toBe('in') // in (rank 2) beats on/an
    expect(correctLoneLetter('f', dict, ' ')).toBe('of')
  })

  it('lone-letter expansion stays conservative', () => {
    expect(correctLoneLetter('n', dict, '.')).toBeNull() // only before a space
    expect(correctLoneLetter('a', dict, ' ')).toBeNull() // valid word
    expect(correctLoneLetter('q', dict, ' ')).toBeNull() // no common target
    expect(correctLoneLetter('no', dict, ' ')).toBeNull() // singles only
  })

  it('leaves words it cannot confidently fix alone', () => {
    expect(correctWord('xqzv', dict)).toBeNull() // no candidate
    expect(correctWord('hi', dict)).toBeNull() // too short
    expect(correctWord('HTML', dict)).toBeNull() // all-caps / acronym
    expect(correctWord('camelCase', dict)).toBeNull() // inner capital
    expect(correctWord('web3', dict)).toBeNull() // digits
    expect(correctWord("do'nt", dict)).toBeNull() // apostrophes: not our business
  })
})

/*
 * Two-edit corrections, tested against the real 82k list rather than a toy
 * dictionary: every guard in the two-edit path is tuned against real English
 * frequency and real vocabulary, so a toy dictionary would prove nothing.
 *
 * The words below are the ones reported broken from actual use, and a list of
 * real words the dictionary does not know. Both halves matter — a recall test
 * on its own would happily accept a version that rewrites people's vocabulary.
 */
describe('correctWord — two edits away', () => {
  const real = parseDictionary(
    readFileSync(new URL('../../assets/en-words.txt', import.meta.url), 'utf8'),
  )

  it('fixes the two-edit typos that one-edit search could not reach', () => {
    expect(correctWord('imemsne', real)).toBe('immense') // two transpositions
    expect(correctWord('sandiwchws', real)).toBe('sandwiches') // transposition + w→e
    expect(correctWord('wtht', real)).toBe('with') // a letter added and dropped
    expect(correctWord('diffuclt', real)).toBe('difficult')
  })

  it('still fixes everything one edit away', () => {
    expect(correctWord('speciments', real)).toBe('specimens')
    expect(correctWord('propserity', real)).toBe('prosperity')
    expect(correctWord('teh', real)).toBe('the')
    expect(correctWord('recieve', real)).toBe('receive')
  })

  it('leaves unknown-but-real words alone', () => {
    // each of these was rewritten by an unguarded distance-2 search
    expect(correctWord('vercel', real)).toBeNull() // → vessel
    expect(correctWord('eslint', real)).toBeNull() // → elliot
    expect(correctWord('vitest', real)).toBeNull() // → votes
    expect(correctWord('pytorch', real)).toBeNull() // → porch
    expect(correctWord('indexeddb', real)).toBeNull() // → indexed
    expect(correctWord('upstash', real)).toBeNull() // → upstate
    expect(correctWord('webpack', real)).toBeNull() // → webpage
    expect(correctWord('roadmap', real)).toBeNull() // → roadway
    expect(correctWord('tiptap', real)).toBeNull() // → titan
  })

  it('does not reach three edits, where correcting becomes guessing', () => {
    // "alregitht" is three edits from "alright". Allowing three raised false
    // corrections on the list above from 15 to 18 before any guard was added.
    expect(correctWord('alregitht', real)).toBeNull()
  })

  it('stays inside a frame on the input path', () => {
    // worst case is a word with no correction at all: the full scan runs
    const t0 = performance.now()
    for (let i = 0; i < 50; i++) correctWord('qqqqqqqq', real)
    expect((performance.now() - t0) / 50).toBeLessThan(8)
  })
})
