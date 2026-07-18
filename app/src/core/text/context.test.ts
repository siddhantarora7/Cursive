import { describe, expect, it } from 'vitest'
import { lastPartialWord, sliceContext, wordCount } from './context'

describe('wordCount', () => {
  it('counts simple words', () => {
    expect(wordCount('the quick brown fox')).toBe(4)
  })
  it('handles empty and whitespace', () => {
    expect(wordCount('')).toBe(0)
    expect(wordCount('   \n\t ')).toBe(0)
  })
  it('handles punctuation and newlines', () => {
    expect(wordCount('one, two.\nthree!')).toBe(3)
  })
})

describe('sliceContext', () => {
  it('returns short text unchanged', () => {
    expect(sliceContext('hello world', 1000)).toBe('hello world')
  })
  it('cuts at a word boundary on the left, keeping the trailing side intact', () => {
    const text = 'aaa bbb ccc ddd eee'
    const out = sliceContext(text, 12)
    expect(out.length).toBeLessThanOrEqual(12)
    expect(text.endsWith(out)).toBe(true)
    expect(out.startsWith(' ')).toBe(false)
    // never cuts mid-word: first token of the slice is a full token from the source
    expect(['ccc ddd eee', 'ddd eee']).toContain(out)
  })
  it('keeps a trailing partial word (caret mid-word) intact', () => {
    const out = sliceContext('one two three fou', 12)
    expect(out.endsWith('fou')).toBe(true)
  })
  it('hard-cuts a single oversized word', () => {
    const out = sliceContext('x'.repeat(50), 10)
    expect(out).toBe('x'.repeat(10))
  })
})

describe('lastPartialWord', () => {
  it('returns the trailing in-progress word', () => {
    expect(lastPartialWord('hello wor')).toBe('wor')
  })
  it('returns empty when context ends at a boundary', () => {
    expect(lastPartialWord('hello world ')).toBe('')
    expect(lastPartialWord('hello world.')).toBe('')
    expect(lastPartialWord('')).toBe('')
  })
})
