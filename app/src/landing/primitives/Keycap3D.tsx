import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

/*
 * An interactive 3D keycap. Real geometry, no dependencies.
 *
 * Five faces in a `preserve-3d` context: the top surface plus four walls, so
 * the silhouette is genuinely solid and the sides catch light as it rotates.
 * The alternative on the table was Spline, whose runtime is roughly eight
 * times this entire page's JavaScript and whose only available scenes belong
 * to other people. A keycap is also the honest object for this product: the
 * whole interface is three keys.
 *
 * Pointer position drives rotation through springs, so the cap settles rather
 * than snapping. Pressing pushes it down its own Z axis. A gold rim-light
 * tracks the pointer across the top face; that is the only place gold touches
 * anything, and it never touches text.
 *
 * Keyboard-reachable and pressable with Enter or Space, because a control that
 * only responds to a mouse is a decoration wearing a control's clothes.
 */

type Props = {
  label: string
  sub?: string
  size?: number
  depth?: number
  onPress?: () => void
}

export function Keycap3D({ label, sub, size = 132, depth = 26, onPress }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [pressed, setPressed] = useState(false)

  const spring = { stiffness: 180, damping: 18, mass: 0.7 }
  const px = useSpring(useMotionValue(0), spring)
  const py = useSpring(useMotionValue(0), spring)

  // Pointer offset from centre, normalised to -1..1, mapped to a modest tilt.
  const rotateY = useTransform(px, [-1, 1], [-18, 18])
  const rotateX = useTransform(py, [-1, 1], [16, -16])
  const glossX = useTransform(px, [-1, 1], ['16%', '84%'])
  const glossY = useTransform(py, [-1, 1], ['12%', '88%'])

  /*
   * The rim-light is lit by proximity, not left on.
   *
   * At rest the pointer offsets are zero, so an always-on gloss parks a gold
   * blob in the dead centre of the cap and sits directly behind the glyph. A
   * keycap nobody is pointing at should look like a clean keycap.
   */
  const [lit, setLit] = useState(false)

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const b = el.getBoundingClientRect()
      const dx = e.clientX - (b.left + b.width / 2)
      const dy = e.clientY - (b.top + b.height / 2)
      /*
       * Saturate at roughly the cap's own edge. Normalising over a much wider
       * region reads as barely moving at all: with the pointer directly on the
       * cap you only ever reach a fifth of the available tilt, so the object
       * looks inert exactly when someone is looking straight at it.
       */
      px.set(Math.max(-1, Math.min(1, dx / (b.width * 0.72))))
      py.set(Math.max(-1, Math.min(1, dy / (b.height * 0.72))))
      setLit(Math.hypot(dx, dy) < Math.max(b.width, b.height) * 1.35)
    }
    const reset = () => {
      px.set(0)
      py.set(0)
      setLit(false)
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerleave', reset)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerleave', reset)
    }
  }, [reduced, px, py])

  const press = () => {
    setPressed(true)
    onPress?.()
    window.setTimeout(() => setPressed(false), 180)
  }

  const wall = 'absolute bg-gradient-to-b from-[#efeada] to-[#d8d2bd]'

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={sub ? `${label}: ${sub}` : label}
        onPointerDown={press}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            press()
          }
        }}
        className="cursor-pointer rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-blue"
        style={{ perspective: 620, width: size, height: size }}
      >
        <motion.div
          className="relative h-full w-full"
          style={{
            transformStyle: 'preserve-3d',
            rotateX: reduced ? 0 : rotateX,
            rotateY: reduced ? 0 : rotateY,
            z: pressed ? -depth * 0.42 : 0,
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        >
          {/* walls, drawn first so the top face sits over their seams */}
          <div
            className={wall}
            style={{
              width: size,
              height: depth,
              top: size - depth / 2,
              transformOrigin: 'top center',
              transform: `rotateX(-90deg) translateZ(${depth / 2}px)`,
              filter: 'brightness(0.9)',
            }}
          />
          <div
            className={wall}
            style={{
              width: depth,
              height: size,
              left: -depth / 2,
              transformOrigin: 'center right',
              transform: `translateX(${depth / 2}px) rotateY(-90deg) translateZ(${depth / 2}px)`,
              filter: 'brightness(0.82)',
            }}
          />
          <div
            className={wall}
            style={{
              width: depth,
              height: size,
              left: size - depth / 2,
              transformOrigin: 'center left',
              transform: `translateX(${-depth / 2}px) rotateY(90deg) translateZ(${depth / 2}px)`,
              filter: 'brightness(0.86)',
            }}
          />

          {/* top face */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[18px] border border-[#e6e0cc]"
            style={{
              transform: `translateZ(${depth / 2}px)`,
              background: 'linear-gradient(168deg, #fffef9 0%, #f7f3e4 58%, #eee8d6 100%)',
              boxShadow:
                'inset 0 2px 0 rgba(255,255,255,0.95), inset 0 -2px 6px rgba(120,104,60,0.1)',
            }}
          >
            {/* gold rim-light, tracking the pointer and lit only near it */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 transition-opacity duration-300"
              style={{
                opacity: lit ? 1 : 0,
                background: useTransform(
                  [glossX, glossY],
                  ([gx, gy]: string[]) =>
                    `radial-gradient(circle at ${gx} ${gy}, rgba(232,201,95,0.34) 0%, rgba(201,162,39,0.1) 34%, rgba(201,162,39,0) 66%)`,
                ),
              }}
            />
            <span className="relative font-mono text-[1.6rem] font-medium text-ink">{label}</span>
          </div>
        </motion.div>
      </div>

      {sub ? <span className="l-meta text-ink">{sub}</span> : null}
    </div>
  )
}
