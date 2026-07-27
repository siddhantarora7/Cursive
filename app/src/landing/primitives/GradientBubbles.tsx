import { useReducedMotion } from 'motion/react'

/*
 * Gold and ink gradient bubbles, drifting behind the middle of the page.
 *
 * The reference for this is the Aurora-style blob background, minus the WebGL:
 * these are radial gradients whose own colour stops fade to transparent, which
 * is already soft. A `filter: blur()` over a 900px element is one of the most
 * expensive things you can put on a scrolling page and it buys nothing here.
 *
 * Cream still owns the field. The blobs top out around 10% opacity, so they
 * read as warmth in the paper rather than as a background of their own, and
 * no section ever changes colour.
 */

type Blob = {
  x: number
  y: number
  size: number
  tone: 'gold' | 'ink'
  strength: number
  bx: number
  by: number
  dur: number
  delay: number
}

const BLOBS: Blob[] = [
  { x: 12, y: 14, size: 720, tone: 'gold', strength: 0.1, bx: 60, by: -40, dur: 32, delay: 0 },
  { x: 84, y: 30, size: 560, tone: 'ink', strength: 0.05, bx: -50, by: 44, dur: 38, delay: -8 },
  { x: 68, y: 66, size: 820, tone: 'gold', strength: 0.085, bx: 46, by: 52, dur: 29, delay: -16 },
  { x: 22, y: 78, size: 620, tone: 'ink', strength: 0.045, bx: -38, by: -46, dur: 35, delay: -4 },
  { x: 48, y: 44, size: 900, tone: 'gold', strength: 0.06, bx: 30, by: -58, dur: 41, delay: -22 },
]

const TONE = {
  gold: '201, 162, 39',
  ink: '26, 26, 26',
} as const

export function GradientBubbles({ opacity = 1 }: { opacity?: number }) {
  const reduced = useReducedMotion()

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 'var(--z-ambient)', opacity }}
    >
      {BLOBS.map((b, i) => (
        <span
          key={i}
          className={reduced ? 'absolute block' : 'l-bubble absolute block'}
          style={
            {
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.size,
              height: b.size,
              marginLeft: -b.size / 2,
              marginTop: -b.size / 2,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 50%, rgba(${TONE[b.tone]}, ${b.strength}) 0%, rgba(${TONE[b.tone]}, ${b.strength * 0.55}) 38%, rgba(${TONE[b.tone]}, 0) 70%)`,
              '--bx': `${b.bx}px`,
              '--by': `${b.by}px`,
              '--bdur': `${b.dur}s`,
              '--bdelay': `${b.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
