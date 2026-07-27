import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Keycap } from '../primitives/Keycap'
import { HeroMarquees } from './HeroMarquees'

/*
 * The hero capsule: Wispr's silhouette, carrying Cursive's meaning.
 *
 * A field of bars marquees leftward on a transform-only CSS animation. A fixed
 * split sits at 62% of the capsule: bars to the left of it are ink (what you
 * have typed), bars to the right are muted (the suggestion waiting on you).
 * Every few seconds the Tab key beneath ticks and the split runs out to 100%,
 * turning the whole field ink, then a new suggestion fades back in.
 *
 * So the motion is the reference's, and it encodes ghost-text-then-accept
 * without a word of explanation. The split is a clip-path on a stationary
 * overlay rather than anything on the moving row, which keeps the cursor
 * fixed in screen space while the bars flow through it.
 *
 * Bar heights come from a fixed seeded sequence: identical on every load, so
 * two people looking at the page see the same thing.
 */

const BAR_COUNT = 40
const SPLIT = 62

/** Deterministic pseudo-random in [0,1). Stable across loads and machines. */
function seeded(i: number): number {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

/* Keystroke cadence: mostly mid-height with occasional peaks and rests, which
   is what real typing looks like. A flat random field reads as an equaliser. */
const HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const base = seeded(i)
  const accent = seeded(i * 3) > 0.82 ? 0.3 : 0
  const rest = seeded(i * 7) > 0.9 ? -0.22 : 0
  return Math.min(0.94, Math.max(0.16, 0.3 + base * 0.45 + accent + rest))
})

function Bars({ className }: { className: string }) {
  // Doubled so the marquee wraps seamlessly at -50%.
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
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (reduced) return
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
  }, [reduced])

  return (
    <div className="relative flex flex-col items-center gap-5">
      {/*
       * The marquees are anchored here, to a wrapper containing the capsule
       * and nothing else, so the two curves converge on the capsule itself.
       * Anchoring them any further out silently drags the crossing point off
       * centre by however tall the hint below happens to be.
       */}
      <div className="relative">
        <HeroMarquees />
        <div
          className="relative h-[3.75rem] w-[min(16.5rem,72vw)] overflow-hidden rounded-full border-2 border-ink bg-sheet l-raise"
          style={{ zIndex: 'var(--z-raised)' }}
        >
          {/* The suggestion, underneath. */}
          <div className="absolute inset-0">
            <Bars className="bg-muted/45" />
          </div>

          {/* What is committed, clipped to the split. On accept the clip opens
              to full width, which is the whole idea in one property. */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: `inset(0 ${accepted ? 0 : 100 - SPLIT}% 0 0)`,
              transition: `clip-path ${accepted ? 520 : 700}ms var(--ease-out-quart)`,
            }}
          >
            <Bars className="bg-ink" />
          </div>

          {/* The caret, parked at the split. */}
          <span
            aria-hidden
            className="absolute top-1/2 h-7 w-[2px] -translate-y-1/2 rounded-full bg-blue transition-opacity duration-300"
            style={{ left: `${SPLIT}%`, opacity: accepted ? 0 : 1 }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Keycap size="sm" pressed={accepted}>
          Tab
        </Keycap>
        <span className="l-meta text-meta">to take it</span>
      </div>
    </div>
  )
}
