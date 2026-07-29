import { useEffect, useMemo, useState } from 'react'
import { buildMonthlyReport, type MonthlyReport } from '../core/stats/report'
import type { DayAggregate } from '../core/stats/events'
import { listDays } from '../store/stats'
import { renderWrappedPng } from './wrappedCanvas'
import { Icon } from './icons'

/**
 * The monthly report. Every number is computed in this browser from the local
 * `stats` store — there is no request in this component, and there must never
 * be one. The PNG is the only artefact that leaves, and only because the user
 * saved it themselves.
 */

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number) as [number, number]
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function hourLabel(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm'
  const twelve = h % 12 === 0 ? 12 : h % 12
  return `${twelve}${suffix}`
}

export function WrappedPanel({ onClose }: { onClose: () => void }) {
  const [days, setDays] = useState<DayAggregate[] | null>(null)
  const [month, setMonth] = useState(() => monthKey(new Date()))

  useEffect(() => {
    void listDays().then(setDays)
  }, [])

  const months = useMemo(() => {
    const keys = new Set((days ?? []).map((d) => d.date.slice(0, 7)))
    keys.add(monthKey(new Date()))
    return [...keys].sort().reverse()
  }, [days])

  const report: MonthlyReport | null = useMemo(
    () => (days === null ? null : buildMonthlyReport(days, month)),
    [days, month],
  )

  const download = () => {
    if (!report) return
    const url = renderWrappedPng(report, monthLabel(report.month))
    const a = document.createElement('a')
    a.href = url
    a.download = `cursive-${report.month}.png`
    a.click()
  }

  return (
    <div
      className="settings-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside className="settings-panel wrapped-panel" role="dialog" aria-label="Your writing stats">
        <header className="settings-head">
          <h2>Your writing</h2>
          <button type="button" className="tb-btn" onClick={onClose} aria-label="Close stats">
            <Icon name="close" />
          </button>
        </header>

        {months.length > 1 && (
          <div className="wrapped-months">
            {months.map((m) => (
              <button
                key={m}
                type="button"
                className={`wrapped-month${m === month ? ' selected' : ''}`}
                onClick={() => setMonth(m)}
              >
                {monthLabel(m)}
              </button>
            ))}
          </div>
        )}

        {report === null ? (
          <p className="wrapped-empty">Reading your local history…</p>
        ) : report.words === 0 && report.keystrokes === 0 ? (
          <p className="wrapped-empty">
            Nothing written in {monthLabel(month)} yet. This page fills itself in as you write —
            all of it computed here, none of it sent anywhere.
          </p>
        ) : (
          <>
            <section className="wrapped-persona">
              <h3>{report.persona.title}</h3>
              <p>{report.persona.blurb}</p>
            </section>

            <section className="wrapped-grid">
              <Stat value={report.words.toLocaleString()} label="words" />
              <Stat value={String(report.daysWritten)} label={report.daysWritten === 1 ? 'day' : 'days'} />
              <Stat value={String(report.longestStreak)} label="day streak" />
              <Stat
                value={report.bestHour === null ? '—' : hourLabel(report.bestHour)}
                label="best hour"
              />
              <Stat value={formatMinutes(report.activeMinutes)} label="writing time" />
              <Stat
                value={report.ghost.rate === null ? '—' : `${Math.round(report.ghost.rate * 100)}%`}
                label="ghost accepted"
              />
            </section>

            {report.topWords.length > 0 && (
              <section className="wrapped-words">
                <h4>Your words this month</h4>
                <ul>
                  {report.topWords.map((w) => (
                    <li key={w.word}>
                      <span className="ww-word">{w.word}</span>
                      <span className="ww-count">{w.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {report.ghost.shown > 0 && (
              <p className="wrapped-note">
                Cursive offered {report.ghost.shown.toLocaleString()} suggestions and you took{' '}
                {report.ghost.accepted.toLocaleString()} — {report.ghost.wordsFromGhost.toLocaleString()}{' '}
                words arrived by Tab.
              </p>
            )}

            <div className="wrapped-actions">
              <button type="button" className="wrapped-save" onClick={download}>
                Save as image
              </button>
              <span className="wrapped-privacy">Computed here. Never uploaded.</span>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="wrapped-stat">
      <span className="ws-value">{value}</span>
      <span className="ws-label">{label}</span>
    </div>
  )
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`
  return `${Math.floor(total / 60)}h ${total % 60}m`
}
