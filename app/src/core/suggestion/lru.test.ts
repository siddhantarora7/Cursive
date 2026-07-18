import { describe, expect, it } from 'vitest'
import { LruCache } from './lru'

describe('LruCache', () => {
  it('stores and retrieves', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    expect(c.get('a')).toBe(1)
    expect(c.get('b')).toBeUndefined()
  })

  it('evicts the least recently used entry', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.get('a') // refresh a
    c.set('c', 3) // evicts b
    expect(c.get('a')).toBe(1)
    expect(c.get('b')).toBeUndefined()
    expect(c.get('c')).toBe(3)
  })

  it('updates recency on set of an existing key', () => {
    const c = new LruCache<string, number>(2)
    c.set('a', 1)
    c.set('b', 2)
    c.set('a', 9)
    c.set('c', 3) // evicts b, not a
    expect(c.get('a')).toBe(9)
    expect(c.get('b')).toBeUndefined()
  })
})
