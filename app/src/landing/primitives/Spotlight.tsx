import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

/*
 * A soft light that follows the pointer across its parent.
 *
 * Adapted from the ibelick spotlight pattern, with two changes. The original
 * mutates its parent's inline styles on mount (`position`, `overflow`) as a
 * side effect, which is a surprising thing for a decorative child to do to a
 * layout it does not own; here the parent is expected to be positioned and the
 * component simply reads its box. And the light is warm gold rather than zinc,
 * because on cream a cool grey spotlight reads as a dirty smudge.
 *
 * Pointer-only by design: there is no hover state on touch, so this stays
 * invisible there rather than pretending.
 */

export function Spotlight({ size = 420, className = '' }: { size?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [on, setOn] = useState(false)

  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 30, mass: 0.6 })
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 30, mass: 0.6 })

  const left = useTransform(x, (v) => v - size / 2)
  const top = useTransform(y, (v) => v - size / 2)

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    const parent = el?.parentElement
    if (!parent) return

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const box = parent.getBoundingClientRect()
      x.set(e.clientX - box.left)
      y.set(e.clientY - box.top)
    }
    const enter = (e: PointerEvent) => e.pointerType === 'mouse' && setOn(true)
    const leave = () => setOn(false)

    parent.addEventListener('pointermove', move)
    parent.addEventListener('pointerenter', enter)
    parent.addEventListener('pointerleave', leave)
    return () => {
      parent.removeEventListener('pointermove', move)
      parent.removeEventListener('pointerenter', enter)
      parent.removeEventListener('pointerleave', leave)
    }
  }, [reduced, x, y])

  if (reduced) return <div ref={ref} className="hidden" />

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute rounded-full transition-opacity duration-500 ${className}`}
      style={{
        width: size,
        height: size,
        left,
        top,
        opacity: on ? 1 : 0,
        zIndex: 'var(--z-ambient)',
        background:
          'radial-gradient(circle at 50% 50%, rgba(232,201,95,0.28) 0%, rgba(201,162,39,0.14) 34%, rgba(201,162,39,0) 68%)',
      }}
    />
  )
}
