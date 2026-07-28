import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Keycap } from '../primitives/Keycap'
import { HeroMarquees } from './HeroMarquees'
import { OPENER, completeFor } from '../ghost'

/*
 * The hero capsule: Wispr's silhouette, carrying Cursive's meaning, and then
 * becoming the product the moment you touch it.
 *
 * Idle, it is a field of bars marqueeing left with a split at 62%: bars left
 * of the split are ink (typed), bars right of it are muted (the suggestion).
 * Every few seconds the Tab key ticks, the split runs to 100%, and a new
 * suggestion fades in. That is the reference's motion, encoding
 * ghost-text-then-accept without a word of explanation.
 *
 * Click it and the bars give way to a real writing surface: your keystrokes,
 * a real caret, real ghost text ahead of it, Tab to accept. It is the same
 * object doing the abstract thing and the literal thing, which is why the
 * curved marquees still make sense wrapped around it.
 *
 * Keystrokes are captured by a genuinely focusable <input> that is visually
 * hidden but present, so IME, mobile keyboards, autofill suppression and
 * screen readers all behave. The visible text is rendered separately because
 * an <input> cannot paint two colours.
 */

const BAR_COUNT = 40
const SPLIT = 62

/** Deterministic pseudo-random in [0,1). Stable across loads and machines. */
function seeded(i: number): number {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

/*
 * Capped well short of the capsule's inner height. At 94% the tallest bars met
 * the border at top and bottom and read as thickened segments of it, which is
 * why the outline looked heavy in places and hairline elsewhere.
 */
const HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const base = seeded(i)
  const accent = seeded(i * 3) > 0.82 ? 0.3 : 0
  const rest = seeded(i * 7) > 0.9 ? -0.22 : 0
  return Math.min(0.66, Math.max(0.14, 0.26 + base * 0.34 + accent * 0.6 + rest))
})

function Bars({ className }: { className: string }) {
  const bars = [...HEIGHTS, ...HEIGHTS]
  return (
    <div className="l-barfield absolute inset-y-0 left-0 flex w-max items-center gap-[4px] px-4">
      {bars.map((h, i) => (
        <span
          key={i}
          className={`block w-[4px] shrink-0 rounded-full ${className}`}
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  )
}

export function TypingCapsule() {
  const reduced = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)

  const [accepted, setAccepted] = useState(false)
  const [live, setLive] = useState(false)
  const [value, setValue] = useState('')
  const [tabHint, setTabHint] = useState(false)

  const ghost = live ? (value ? completeFor(value) : OPENER) : ''

  /* The idle demo loop, paused entirely while someone is actually writing. */
  useEffect(() => {
    if (reduced || live) return
    let timer: ReturnType<typeof setTimeout>
    const loop = (state: boolean) => {
      timer = setTimeout(
        () => {
          setAccepted(state)
          loop(!state)
        },
        state ? 4200 : 1500,
      )
    }
    loop(true)
    return () => clearTimeout(timer)
  }, [reduced, live])

  const accept = () => {
    if (!ghost) return
    setValue((v) => v + ghost)
    setTabHint(true)
    window.setTimeout(() => setTabHint(false), 220)
  }

  return (
    <div className="relative flex flex-col items-center gap-5">
      {/*
       * The marquees are anchored here, to a wrapper containing the capsule
       * and nothing else, so the two curves converge on the capsule itself.
       * Anchoring them any further out drags the crossing point off centre by
       * however tall whatever sits below happens to be.
       */}
      <div className="relative">
        <HeroMarquees />

        <div
          onPointerDown={() => inputRef.current?.focus()}
          className="relative flex h-[3.75rem] w-[min(30rem,84vw)] cursor-text items-center overflow-hidden rounded-full border border-ink/70 bg-sheet px-5 l-raise"
          style={{ zIndex: 'var(--z-raised)' }}
        >
          {/* Idle: the abstract bar field. */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: live ? 0 : 1, pointerEvents: 'none' }}
          >
            <div className="absolute inset-0">
              <Bars className="bg-muted/45" />
            </div>
            <div
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 ${accepted ? 0 : 100 - SPLIT}% 0 0)`,
                transition: `clip-path ${accepted ? 520 : 700}ms var(--ease-out-quart)`,
              }}
            >
              <Bars className="bg-ink" />
            </div>
            <span
              aria-hidden
              className="absolute top-1/2 h-7 w-[2px] -translate-y-1/2 rounded-full bg-blue transition-opacity duration-300"
              style={{ left: `${SPLIT}%`, opacity: accepted ? 0 : 1 }}
            />
          </div>

          {/* Live: your words, with a real suggestion ahead of the caret. */}
          <div
            className="relative w-full truncate whitespace-pre font-mono text-[0.9375rem] transition-opacity duration-300"
            style={{ opacity: live ? 1 : 0 }}
            aria-hidden
          >
            <span className="text-ink">{value}</span>
            <span className="l-caret text-blue" />
            <span className="text-muted">{ghost}</span>
          </div>

          <label className="sr-only" htmlFor="cursive-try">
            Try Cursive: type a sentence and press Tab to accept the suggestion
          </label>
          <input
            id="cursive-try"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setLive(true)}
            onBlur={() => !value && setLive(false)}
            onKeyDown={(e) => {
              // Only swallow Tab when there is something to accept, so the key
              // keeps moving focus the rest of the time.
              if (e.key === 'Tab' && ghost) {
                e.preventDefault()
                accept()
              }
              if (e.key === 'Escape') {
                setValue('')
                e.currentTarget.blur()
              }
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="absolute inset-0 h-full w-full cursor-text bg-transparent px-5 font-mono text-[0.9375rem] text-transparent caret-transparent outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Keycap size="sm" pressed={live ? tabHint : accepted}>
          Tab
        </Keycap>
        <span className="l-meta text-meta">
          {live ? (ghost ? 'to accept' : 'keep typing') : 'to accept · click to try it'}
        </span>
      </div>
    </div>
  )
}
