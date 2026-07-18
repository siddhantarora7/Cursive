import { describe, expect, it } from 'vitest'
import { correctLoneLetter, correctWord } from './correct'
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
