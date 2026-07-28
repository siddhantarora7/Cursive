import { useEffect, useRef, useState } from 'react'
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
}) {
  const ref = useRef<SVGTextPathElement>(null)
  const reduced = useReducedMotion()
  const [span, setSpan] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // The element holds two copies; one copy's width is the loop distance.
    const measure = () => {
      try {
        const total = el.getComputedTextLength()
        if (total > 0) setSpan(total / 2)
      } catch {
        /* getComputedTextLength throws if the node is not yet rendered */
      }
    }
    measure()
    // Re-measure once webfonts land, since metrics change under them.
    if (document.fonts?.ready) void document.fonts.ready.then(measure)
  }, [])

  const doubled = `${text}   ${text}   `

  return (
    <svg
      className={className}
      viewBox="0 0 1000 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        id={pathId}
        d={d}
        fill="none"
        {...(stroke
          ? { stroke, strokeWidth: 34, strokeLinecap: 'round' as const }
          : {})}
      />
      <text x={0} fontSize={14.5} fontWeight={weight} className="font-mono">
        <textPath
          ref={ref}
          href={`#${pathId}`}
          fill={fill}
          opacity={opacity}
          style={{ baselineShift: shift }}
        >
          {doubled}
        </textPath>
        {!reduced && span > 0 && (
          <animate
            key={span}
            attributeName="x"
            dur={`${Math.round(span / RATE)}s`}
            values={`${-span};0`}
            repeatCount="indefinite"
          />
        )}
      </text>
    </svg>
  )
}

export function HeroMarquees() {
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
      />
    </div>
  )
}
