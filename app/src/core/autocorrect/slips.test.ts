import { describe, expect, it } from 'vitest'
import { keysAdjacent, slipDistance } from './slips'

describe('keysAdjacent', () => {
  it('knows same-row neighbours', () => {
    expect(keysAdjacent('w', 'e')).toBe(true)
    expect(keysAdjacent('i', 'o')).toBe(true)
    expect(keysAdjacent('q', 'p')).toBe(false)
  })

  it('accounts for the row stagger, which is the whole point', () => {
    // s sits between the a/d row and w/e above it
    expect(keysAdjacent('s', 'w')).toBe(true)
    expect(keysAdjacent('s', 'e')).toBe(true)
    // …but not r, two columns over. This single pair is what stops
    // "vercel" from being corrected to "vessel".
    expect(keysAdjacent('s', 'r')).toBe(false)
  })

  it('is reflexive and symmetric', () => {
    expect(keysAdjacent('k', 'k')).toBe(true)
    expect(keysAdjacent('c', 'd')).toBe(keysAdjacent('d', 'c'))
  })
})

describe('slipDistance', () => {
  it('prices a transposition as one edit', () => {
    expect(slipDistance('teh', 'the', 2)).toBe(1)
    expect(slipDistance('imemsne', 'immense', 2)).toBe(2) // two transpositions
  })

  it('prices an adjacent-key substitution as one edit', () => {
    expect(slipDistance('wprd', 'word', 2)).toBe(1) // p and o are neighbours
  })

  it('prices a distant substitution out of reach', () => {
    // 'z' is nowhere near 'o'; this is a different word, not a slip
    expect(slipDistance('zne', 'one', 1)).toBeGreaterThan(1)
  })

  it('abandons early rather than computing a distance nobody asked for', () => {
    expect(slipDistance('completely', 'different', 2)).toBeGreaterThan(2)
    expect(slipDistance('short', 'muchlongerword', 2)).toBeGreaterThan(2)
  })

  it('can refuse substitutions entirely, for callers that need the stricter rule', () => {
    expect(slipDistance('wprd', 'word', 2, false)).toBeGreaterThan(1)
    // transpositions and indels still cost one, so this stays reachable
    expect(slipDistance('wrod', 'word', 2, false)).toBe(1)
  })
})
