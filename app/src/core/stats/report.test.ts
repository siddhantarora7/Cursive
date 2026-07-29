import { describe, expect, it } from 'vitest'
import { buildMonthlyReport, derivePersona } from './report'
import { emptyDay, type DayAggregate } from './events'

function day(date: string, patch: Partial<DayAggregate> = {}): DayAggregate {
  return { ...emptyDay(date), ...patch }
}

/** a day whose words all landed in one hour */
function dayAt(date: string, hour: number, words: number): DayAggregate {
  const d = day(date, { words })
  d.hourBuckets[hour] = words
  return d
}

describe('buildMonthlyReport', () => {
  it('sums only the requested month', () => {
    const r = buildMonthlyReport(
      [
        day('2026-02-28', { words: 500, keystrokes: 2500 }),
        day('2026-03-01', { words: 100, keystrokes: 500 }),
        day('2026-03-02', { words: 250, keystrokes: 1250 }),
        day('2026-04-01', { words: 900, keystrokes: 4500 }),
      ],
      '2026-03',
    )
    expect(r.words).toBe(350)
    expect(r.keystrokes).toBe(1750)
    expect(r.daysWritten).toBe(2)
  })

  it('finds the best hour and the best day', () => {
    const r = buildMonthlyReport(
      [dayAt('2026-03-01', 9, 100), dayAt('2026-03-02', 23, 400), dayAt('2026-03-03', 9, 150)],
      '2026-03',
    )
    expect(r.bestHour).toBe(23)
    expect(r.bestDay).toEqual({ date: '2026-03-02', words: 400 })
  })

  it('counts a streak that began before the month at its true length', () => {
    // a calendar boundary is our bookkeeping, not the writer's achievement
    const days = ['2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'].map((d) =>
      day(d, { words: 100 }),
    )
    expect(buildMonthlyReport(days, '2026-03').longestStreak).toBe(5)
  })

  it('breaks a streak on a missed day', () => {
    const days = ['2026-03-01', '2026-03-02', '2026-03-05', '2026-03-06', '2026-03-07'].map((d) =>
      day(d, { words: 100 }),
    )
    expect(buildMonthlyReport(days, '2026-03').longestStreak).toBe(3)
  })

  it('merges and ranks vocabulary across the month', () => {
    const r = buildMonthlyReport(
      [
        day('2026-03-01', { words: 10, wordFreq: { harbour: 3, tide: 1 } }),
        day('2026-03-02', { words: 10, wordFreq: { harbour: 2, lighthouse: 4 } }),
      ],
      '2026-03',
    )
    expect(r.topWords.slice(0, 3)).toEqual([
      { word: 'harbour', count: 5 },
      { word: 'lighthouse', count: 4 },
      { word: 'tide', count: 1 },
    ])
  })

  it('reports no acceptance rate when nothing was ever offered', () => {
    // "never shown" and "shown, never taken" are different facts; 0% would lie
    const r = buildMonthlyReport([day('2026-03-01', { words: 100 })], '2026-03')
    expect(r.ghost.rate).toBeNull()
  })

  it('computes the acceptance rate over both accept modes', () => {
    const r = buildMonthlyReport(
      [day('2026-03-01', { words: 100, shown: 10, acceptedAll: 3, acceptedWord: 1, wordsFromGhost: 22 })],
      '2026-03',
    )
    expect(r.ghost.rate).toBeCloseTo(0.4)
    expect(r.ghost.wordsFromGhost).toBe(22)
  })

  it('is empty but well-formed for a month with nothing in it', () => {
    const r = buildMonthlyReport([], '2026-03')
    expect(r.words).toBe(0)
    expect(r.daysWritten).toBe(0)
    expect(r.bestHour).toBeNull()
    expect(r.bestDay).toBeNull()
    expect(r.topWords).toEqual([])
    expect(r.persona.title).toBe('The Blank Page')
  })
})

describe('derivePersona', () => {
  const base = {
    month: '2026-03',
    daysWritten: 10,
    words: 2000,
    keystrokes: 10_000,
    activeMinutes: 200,
    longestStreak: 3,
    bestHour: 14,
    bestDay: null,
    topWords: [],
    ghost: { shown: 0, accepted: 0, rate: null, wordsFromGhost: 0 },
  }

  it('recognises the late-night writer', () => {
    expect(derivePersona({ ...base, bestHour: 23 }).title).toBe('The Night Writer')
    expect(derivePersona({ ...base, bestHour: 2 }).title).toBe('The Night Writer')
  })

  it('recognises the early riser', () => {
    expect(derivePersona({ ...base, bestHour: 6 }).title).toBe('First Light')
  })

  it('prefers a long streak over a generic month', () => {
    expect(derivePersona({ ...base, longestStreak: 20 }).title).toBe('The Metronome')
  })

  it('distinguishes heavy ghost use from deliberate refusal', () => {
    expect(
      derivePersona({ ...base, ghost: { shown: 100, accepted: 50, rate: 0.5, wordsFromGhost: 300 } })
        .title,
    ).toBe('The Duet')
    expect(
      derivePersona({ ...base, ghost: { shown: 200, accepted: 4, rate: 0.02, wordsFromGhost: 8 } })
        .title,
    ).toBe('The Purist')
  })

  it('falls back to something true rather than something flattering', () => {
    expect(derivePersona(base).title).toBe('The Regular')
  })
})
