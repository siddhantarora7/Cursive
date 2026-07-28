import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useReducedMotion } from 'motion/react'

/*
 * A continuous marquee. Adapted from React Bits' LogoLoop.
 *
 * Two changes from the original worth knowing about:
 *
 *   1. Under `prefers-reduced-motion` the original freezes the transform in
 *      CSS but keeps a requestAnimationFrame loop running forever behind it,
 *      burning a frame callback to compute a position nothing reads. Here the
 *      loop is never started and the track renders a single static row.
 *   2. Sequence width is measured from the live DOM and the copy count derives
 *      from it, so the row tiles exactly rather than relying on a guessed
 *      duplicate count.
 *
 * Velocity easing is kept: hovering decelerates to a stop rather than
 * stopping dead, which is what makes it feel like a physical belt.
 */

export type LoopItem = {
  node: ReactNode
  label: string
}

const SMOOTH_TAU = 0.25
const MIN_COPIES = 2
const COPY_HEADROOM = 2

type Props = {
  items: LoopItem[]
  /** Pixels per second. */
  speed?: number
  direction?: 'left' | 'right'
  gap?: number
  /** Speed while hovered; 0 stops it. */
  hoverSpeed?: number
  fadeColor?: string
  ariaLabel?: string
  className?: string
  renderItem?: (item: LoopItem, key: string) => ReactNode
}

export const LogoLoop = memo(function LogoLoop({
  items,
  speed = 42,
  direction = 'left',
  gap = 14,
  hoverSpeed = 0,
  fadeColor = '#FDFCF0',
  ariaLabel = 'What is true about Cursive',
  className = '',
  renderItem,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const seqRef = useRef<HTMLUListElement>(null)
  const reduced = useReducedMotion()

  const [seqWidth, setSeqWidth] = useState(0)
  const [copies, setCopies] = useState(MIN_COPIES)
  const [hovered, setHovered] = useState(false)

  const targetVelocity = useMemo(
    () => Math.abs(speed) * (direction === 'left' ? 1 : -1),
    [speed, direction],
  )

  const measure = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0
    const width = seqRef.current?.getBoundingClientRect().width ?? 0
    if (width > 0) {
      setSeqWidth(Math.ceil(width))
      setCopies(Math.max(MIN_COPIES, Math.ceil(containerWidth / width) + COPY_HEADROOM))
    }
  }, [])

  useEffect(() => {
    if (!window.ResizeObserver) {
      window.addEventListener('resize', measure)
      measure()
      return () => window.removeEventListener('resize', measure)
    }
    const obs = [containerRef.current, seqRef.current].filter(Boolean).map((el) => {
      const o = new ResizeObserver(measure)
      o.observe(el as Element)
      return o
    })
    measure()
    return () => obs.forEach((o) => o.disconnect())
  }, [measure, items, gap])

  useEffect(() => {
    // Reduced motion: never start the loop at all.
    if (reduced) return
    const track = trackRef.current
    if (!track || seqWidth <= 0) return

    let raf = 0
    let last: number | null = null
    let offset = 0
    let velocity = 0

    const tick = (t: number) => {
      if (last === null) last = t
      const dt = Math.max(0, t - last) / 1000
      last = t

      const target = hovered ? hoverSpeed : targetVelocity
      velocity += (target - velocity) * (1 - Math.exp(-dt / SMOOTH_TAU))

      offset = (((offset + velocity * dt) % seqWidth) + seqWidth) % seqWidth
      track.style.transform = `translate3d(${-offset}px, 0, 0)`
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, seqWidth, hovered, hoverSpeed, targetVelocity])

  const lists = useMemo(
    () =>
      Array.from({ length: reduced ? 1 : copies }, (_, copy) => (
        <ul
          key={copy}
          ref={copy === 0 ? seqRef : undefined}
          aria-hidden={copy > 0}
          className="flex list-none items-center"
          style={{ gap }}
        >
          {items.map((item, i) => (
            <li key={`${copy}-${i}`} style={{ marginRight: gap }} className="shrink-0">
              {renderItem ? renderItem(item, `${copy}-${i}`) : item.label}
            </li>
          ))}
        </ul>
      )),
    [copies, items, gap, renderItem, reduced],
  )

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      className={`relative w-full overflow-hidden ${className}`}
      style={
        {
          '--fade': fadeColor,
          maskImage:
            'linear-gradient(90deg, transparent 0, #000 clamp(24px, 9%, 130px), #000 calc(100% - clamp(24px, 9%, 130px)), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0, #000 clamp(24px, 9%, 130px), #000 calc(100% - clamp(24px, 9%, 130px)), transparent 100%)',
        } as CSSProperties
      }
    >
      <div
        ref={trackRef}
        className={`flex w-max ${reduced ? 'justify-center' : ''}`}
        style={{ willChange: reduced ? undefined : 'transform' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {lists}
      </div>
    </div>
  )
})
