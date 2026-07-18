import { useEffect, useState } from 'react'
import type { LiveStats } from '../core/stats/live'

/** Demo mode: large keystroke captions + a WPM/streak badge, built for screen recordings. */

const KEY_LABELS: Record<string, string> = {
  ' ': '␣',
  Enter: '⏎',
  Backspace: '⌫',
  Tab: '⇥ Tab',
  Escape: 'Esc',
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
}

let nextId = 0

export function DemoOverlay({ stats }: { stats: LiveStats }) {
  const [keys, setKeys] = useState<Array<{ id: number; label: string; big: boolean }>>([])
  const [wpm, setWpm] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Meta' || e.key === 'Control' || e.key === 'Alt') return
      const mods =
        (e.metaKey ? '⌘' : '') + (e.ctrlKey ? '⌃' : '') + (e.altKey ? '⌥' : '') + (e.shiftKey && e.key.length > 1 ? '⇧' : '')
      const base = KEY_LABELS[e.key] ?? (e.key.length === 1 ? e.key : e.key)
      const label = mods ? `${mods} ${base.toUpperCase()}` : base
      const big = Boolean(mods) || e.key === 'Tab'
      const id = nextId++
      setKeys((k) => [...k.slice(-5), { id, label, big }])
      window.setTimeout(() => setKeys((k) => k.filter((x) => x.id !== id)), 1100)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const tick = window.setInterval(() => {
      const now = Date.now()
      setWpm(stats.wpm(now))
      setStreak(stats.streakSeconds(now))
    }, 400)
    return () => window.clearInterval(tick)
  }, [stats])

  return (
    <div className="demo-overlay" aria-hidden="true">
      <div className="demo-badge">
        <span className="demo-wpm">{wpm}</span>
        <span className="demo-wpm-label">wpm</span>
        {streak >= 3 && <span className="demo-streak">🔥 {streak}s</span>}
      </div>
      <div className="demo-keys">
        {keys.map((k) => (
          <span key={k.id} className={`demo-key${k.big ? ' big' : ''}`}>
            {k.label}
          </span>
        ))}
      </div>
    </div>
  )
}
