import { describe, expect, it } from 'vitest'
import { applyEvent, IDLE_GAP_MS, normalizeWord } from './daily'
import { emptyDay, localDate, type StatEvent } from './events'

/** local timestamp helper: a given hour on 2026-03-14 */
function at(hour: number, minute = 0, second = 0): number {
  return new Date(2026, 2, 14, hour, minute, second).getTime()
}

function fold(events: StatEvent[]) {
  const day = emptyDay('2026-03-14')
  for (const e of events) applyEvent(day, e)
  return day
}

describe('localDate', () => {
  it('uses the local calendar, not UTC', () => {
    // 23:30 local on the 14th is the 14th regardless of the machine's offset
    expect(localDate(at(23, 30))).toBe('2026-03-14')
    expect(localDate(at(0, 15))).toBe('2026-03-14')
  })
})

describe('normalizeWord', () => {
  it('lowercases and strips edge punctuation but keeps apostrophes', () => {
    expect(normalizeWord('“Hello,')).toBe('hello')
    expect(normalizeWord("don't.")).toBe("don't")
    expect(normalizeWord('word—')).toBe('word')
    expect(normalizeWord('...')).toBe('')
  })
})

describe('applyEvent', () => {
  it('counts keystrokes and accumulates only genuine writing time', () => {
    const day = fold([
      { kind: 'keystroke', at: at(9, 0, 0) },
      { kind: 'keystroke', at: at(9, 0, 1) }, // +1s
      { kind: 'keystroke', at: at(9, 0, 3) }, // +2s
      { kind: 'keystroke', at: at(10, 0, 0) }, // an hour away: a break, not work
      { kind: 'keystroke', at: at(10, 0, 2) }, // +2s
    ])
    expect(day.keystrokes).toBe(5)
    expect(day.activeMs).toBe(5000)
  })

  it('counts a gap exactly at the threshold as writing, and beyond it as a break', () => {
    const onEdge = fold([
      { kind: 'keystroke', at: 0 },
      { kind: 'keystroke', at: IDLE_GAP_MS },
    ])
    expect(onEdge.activeMs).toBe(IDLE_GAP_MS)

    const past = fold([
      { kind: 'keystroke', at: 0 },
      { kind: 'keystroke', at: IDLE_GAP_MS + 1 },
    ])
    expect(past.activeMs).toBe(0)
  })

  it('buckets words by the local hour they were finished', () => {
    const day = fold([
      { kind: 'word', at: at(23), word: 'midnight' },
      { kind: 'word', at: at(23), word: 'again' },
      { kind: 'word', at: at(6), word: 'morning' },
    ])
    expect(day.words).toBe(3)
    expect(day.hourBuckets[23]).toBe(2)
    expect(day.hourBuckets[6]).toBe(1)
    expect(day.hourBuckets.reduce((a, b) => a + b, 0)).toBe(3)
  })

  it('keeps vocabulary out of the frequency map when it carries no signal', () => {
    const day = fold([
      { kind: 'word', at: at(9), word: 'the' }, // too short
      { kind: 'word', at: at(9), word: 'that' }, // stopword
      { kind: 'word', at: at(9), word: 'Harbour' },
      { kind: 'word', at: at(9), word: 'harbour,' }, // same word, normalised
    ])
    expect(day.words).toBe(4) // every word still counts toward the total
    expect(day.wordFreq).toEqual({ harbour: 2 })
  })

  it('never lets the frequency map grow without bound', () => {
    const day = emptyDay('2026-03-14')
    for (let i = 0; i < 1200; i++) {
      applyEvent(day, { kind: 'word', at: at(9), word: `word${i}` })
    }
    // repeat one word enough that pruning must keep it
    for (let i = 0; i < 50; i++) {
      applyEvent(day, { kind: 'word', at: at(9), word: 'lighthouse' })
    }
    expect(Object.keys(day.wordFreq).length).toBeLessThanOrEqual(400)
    expect(day.wordFreq['lighthouse']).toBe(50)
    expect(day.words).toBe(1250)
  })

  it('tracks the acceptance numerator and denominator separately', () => {
    const day = fold([
      { kind: 'suggestionShown', at: at(9) },
      { kind: 'suggestionShown', at: at(9) },
      { kind: 'suggestionShown', at: at(9) },
      { kind: 'suggestionRejected', at: at(9) },
      { kind: 'suggestionAccepted', at: at(9), mode: 'all', words: 6 },
      { kind: 'suggestionAccepted', at: at(9), mode: 'word', words: 1 },
    ])
    expect(day.shown).toBe(3)
    expect(day.rejected).toBe(1)
    expect(day.acceptedAll).toBe(1)
    expect(day.acceptedWord).toBe(1)
    expect(day.wordsFromGhost).toBe(7)
  })
})
