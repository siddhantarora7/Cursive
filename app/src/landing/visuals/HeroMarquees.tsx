import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { CLEAN_TEXT, DRAFT_TEXT } from '../copy'

/*
 * The two curved text marquees behind the hero.
 *
 * The back curve carries the message the way it actually gets typed: it loops
 * back on itself, runs upside down through the curl, and reads faint. The
 * front curve is a thick ink-blue ribbon carrying the version that gets sent,
 * set in cream. They meet behind the capsule, which is the point. The capsule
 * is where one becomes the other.
 *
 * Two implementation details matter and are easy to get wrong:
 *
 * 1. Seamless scroll. The text is rendered twice and the animation travels
 *    exactly one copy's width, so the second copy is always covering the path
 *    as the first leaves it. That width is measured from the live text rather
 *    than estimated, because guessing it leaves a visible jump once a cycle.
 *
 * 2. Positioning. Both SVGs are anchored to the vertical centre of a layer
 *    that is itself centred on the capsule, and each path's business end sits
 *    at that centre line, so the curves converge on the capsule at every
 *    viewport width instead of drifting off with the layout.
 *
 * The scroll itself is SMIL on the text element's x attribute: no JavaScript
 * per frame, which matters because this runs the whole time the hero is on
 * screen.
 *
 * Hidden below md. At phone width the curves collide with the headline and
 * there is no version of this that composes rather than merely shrinks.
 */

/*
 * Pixels per second, shared by both curves. Deriving each curve's duration
 * from its own measured span was the desync: the two texts differed in length,
 * so they ran at different speeds and nothing on the ribbon ever lined up with
 * the draft feeding into the capsule. With equal-width texts and one rate,
 * pair i meets the capsule on both curves at the same moment.
 */
const RATE = 74

/*
 * Where the capsule sits, in each SVG's own coordinates.
 *
 * The marquee layer is 1900 wide and centred on the capsule, so the capsule's
 * centre is at layer x 950. The draft SVG occupies layer 0..1000, the ribbon
 * SVG 900..1900, which puts that same point at 950 in one and 50 in the other.
 */
const DRAFT_SYNC_X = 950
const CLEAN_SYNC_X = 50

/*
 * The capsule's width, in the same units.
 *
 * Aligning the two curves at the capsule's centre is correct and still reads
 * as broken, because the centre is hidden underneath the capsule. What a
 * reader actually compares is the last words visible at the left edge against
 * the first words emerging at the right edge, and those are a whole capsule
 * apart. Shifting the ribbon by that width aligns what can be seen.
 */
const CAPSULE_W = 480

/**
 * Distance along `path` at which it reaches `targetX`.
 *
 * Sampled rather than solved because the draft path doubles back on itself, so
 * x is not monotonic and there is no closed form. Ties resolve to the later
 * sample, which picks the final approach to the capsule rather than the loop
 * that crossed the same x earlier.
 */
function lengthAtX(path: SVGPathElement, targetX: number): number {
  const total = path.getTotalLength()
  let best = 0
  let bestErr = Infinity
  for (let i = 0; i <= 600; i++) {
    const len = (total * i) / 600
    const err = Math.abs(path.getPointAtLength(len).x - targetX)
    if (err <= bestErr) {
      bestErr = err
      best = len
    }
  }
  return best
}

function CurvedText({
  pathId,
  d,
  text,
  stroke,
  fill,
  opacity = 1,
  weight = 400,
  shift,
  className,
  syncX,
  onSync,
  onSpan,
  phase = 0,
  armed = false,
}: {
  pathId: string
  d: string
  text: string
  stroke?: string
  fill: string
  opacity?: number
  weight?: number
  shift: string
  className: string
  syncX?: number
  onSync?: (len: number) => void
  onSpan?: (span: number) => void
  phase?: number
  armed?: boolean
}) {
  const ref = useRef<SVGTextPathElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  // Held in a ref so the measure effect never re-runs on a new callback.
  const onSpanRef = useRef(onSpan)
  onSpanRef.current = onSpan
  const reduced = useReducedMotion()
  const [span, setSpan] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // The element holds two copies; one copy's width is the loop distance.
    const measure = () => {
      try {
        const total = el.getComputedTextLength()
        if (total > 0) {
          setSpan(total / 2)
          onSpanRef.current?.(total / 2)
        }
      } catch {
        /* getComputedTextLength throws if the node is not yet rendered */
      }
    }
    measure()
    // Re-measure once webfonts land, since metrics change under them.
    if (document.fonts?.ready) void document.fonts.ready.then(measure)
  }, [])

  useEffect(() => {
    const path = pathRef.current
    if (!path || syncX === undefined || !onSync) return
    onSync(lengthAtX(path, syncX))
  }, [syncX, onSync, d])

  const doubled = `${text}   ${text}   `

  return (
    <svg
      className={className}
      viewBox="0 0 1000 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        ref={pathRef}
        id={pathId}
        d={d}
        fill="none"
        {...(stroke
          ? { stroke, strokeWidth: 34, strokeLinecap: 'round' as const }
          : {})}
      />
      {/*
        * xml:space="preserve" is load-bearing, not tidiness.
        *
        * SVG collapses runs of whitespace by default, which silently discarded
        * every space the two texts are padded with. The pairs then rendered at
        * different widths (579 characters against 561 for supposedly identical
        * strings) and no amount of phase correction could line them up.
        */}
      <text
        x={0}
        fontSize={14.5}
        fontWeight={weight}
        xmlSpace="preserve"
        className="font-mono"
      >
        <textPath
          ref={ref}
          href={`#${pathId}`}
          fill={fill}
          opacity={opacity}
          style={{ baselineShift: shift }}
        >
          {doubled}
        </textPath>
        {!reduced && armed && span > 0 && (
          <animate
            key={`${span}:${Math.round(phase)}`}
            attributeName="x"
            dur={`${Math.round(span / RATE)}s`}
            values={`${-span + phase};${phase}`}
            repeatCount="indefinite"
          />
        )}
      </text>
    </svg>
  )
}

export function HeroMarquees() {
  /*
   * The two curves reach the capsule after travelling different distances, so
   * without a correction the same pair arrives at different times on each and
   * the message never lines up.
   *
   * A character at text-position t sits at path length (x + t), so the one at
   * the capsule is t = L - x. Equating the two curves gives
   * phase = cleanLen - draftLen, not the other way round: the ribbon reaches
   * the capsule almost immediately while the draft has a long loop to travel
   * first, so the ribbon has to be pushed *back*.
   */
  const [draftLen, setDraftLen] = useState<number | null>(null)
  const [cleanLen, setCleanLen] = useState<number | null>(null)
  const [draftSpan, setDraftSpan] = useState<number | null>(null)
  const [cleanSpan, setCleanSpan] = useState<number | null>(null)

  const onDraft = useCallback((l: number) => setDraftLen(l), [])
  const onClean = useCallback((l: number) => setCleanLen(l), [])

  /*
   * Both <animate> elements must be created in the same commit.
   *
   * SMIL starts an animation when its element is inserted, so mounting one
   * curve's animation as soon as its own measurements land and the other's a
   * frame later starts them on different clocks. No static phase can correct
   * that, and it was the real reason the two curves never lined up. Arming
   * them together removes the variable entirely.
   */
  const armed =
    draftLen !== null && cleanLen !== null && draftSpan !== null && cleanSpan !== null

  const phase = armed ? cleanLen - draftLen + CAPSULE_W : 0

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[700px] w-[1900px] -translate-x-1/2 -translate-y-1/2 md:block"
      style={{ zIndex: 'var(--z-ambient)' }}
    >
      {/*
       * Rough draft: curls in from the left, then flattens out and runs
       * horizontally into the capsule at exactly y=350, the layer's centre
       * line and therefore the capsule's.
       *
       * The final control point shares the endpoint's y so the curve *arrives*
       * level instead of still descending. Without that the text meets the
       * capsule at an angle and the two halves stop reading as one continuous
       * line passing through it, which is the entire idea.
       */}
      <CurvedText
        className="absolute left-0 top-1/2 h-auto w-[1000px] -translate-y-1/2"
        pathId="l-curve-draft"
        d="M132 252 C 196 140, 358 120, 428 222 C 498 324, 374 434, 284 388 C 194 342, 226 220, 358 236 C 466 250, 592 350, 700 350 L 1000 350"
        text={DRAFT_TEXT}
        fill="#8A8A8A"
        opacity={0.85}
        shift="-30%"
        syncX={DRAFT_SYNC_X}
        onSync={onDraft}
        onSpan={setDraftSpan}
        armed={armed}
      />

      {/* The corrected version leaves on the same centre line and lifts away. */}
      <CurvedText
        className="absolute right-0 top-1/2 h-auto w-[1000px] -translate-y-1/2"
        pathId="l-curve-clean"
        d="M0 350 C 210 350, 390 342, 566 282 C 742 222, 882 212, 1000 220"
        text={CLEAN_TEXT}
        stroke="#2B3A67"
        fill="#FDFCF0"
        weight={600}
        shift="-32%"
        syncX={CLEAN_SYNC_X}
        onSync={onClean}
        onSpan={setCleanSpan}
        phase={phase}
        armed={armed}
      />
    </div>
  )
}
