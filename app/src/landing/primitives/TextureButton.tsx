import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'

/*
 * Magnet: the button leans toward the pointer as it approaches and springs
 * back when it leaves. The pull is deliberately small (a few pixels) and
 * capped well inside the button's own bounds, because a control that chases
 * the cursor far enough to be dodged stops being a button and becomes a toy.
 *
 * Radius scales with the button, so the large hero CTA has a wider field of
 * attraction than the small one docked in the nav.
 */
function useMagnet(pull: number) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const spring = { stiffness: 260, damping: 20, mass: 0.5 }
  const x = useSpring(useMotionValue(0), spring)
  const y = useSpring(useMotionValue(0), spring)
  const [near, setNear] = useState(false)

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const b = el.getBoundingClientRect()
      const cx = b.left + b.width / 2
      const cy = b.top + b.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const radius = Math.max(b.width, b.height) * 1.35
      const dist = Math.hypot(dx, dy)

      if (dist > radius) {
        if (near) setNear(false)
        x.set(0)
        y.set(0)
        return
      }
      if (!near) setNear(true)
      const falloff = 1 - dist / radius
      x.set((dx / radius) * pull * falloff * 2)
      y.set((dy / radius) * pull * falloff * 2)
    }

    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduced, pull, x, y, near])

  return { ref, x, y, near, reduced }
}

/*
 * Texture buttons. The look comes from three stacked layers rather than a flat
 * fill: a 1px gradient rim, an inner gradient face, and an inset top highlight.
 * That is what reads as a physical, lit object instead of a coloured rectangle.
 *
 * Renders an <a> when `href` is given and a <button> otherwise, so the hero CTA
 * is a real link (middle-clickable, right-clickable, crawlable) rather than a
 * div with a click handler.
 */

type Variant = 'primary' | 'secondary' | 'minimal'
type Size = 'sm' | 'md' | 'lg'

const RIM: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-[#4a5a87] to-[#1b2647]',
  secondary: 'bg-gradient-to-b from-[#efebd8] to-[#d9d5c2]',
  minimal: 'bg-transparent',
}

const FACE: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-[#3c4d7d] to-[#2b3a67] text-cream ' +
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.18),inset_0_-1px_0_rgb(0_0_0/0.15)] ' +
    'group-hover:from-[#455688] group-hover:to-[#31416f]',
  secondary:
    'bg-gradient-to-b from-[#fffef9] to-[#f4f1e2] text-ink ' +
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.9),inset_0_-1px_0_rgb(120_104_60/0.08)] ' +
    'group-hover:from-white group-hover:to-[#f8f5e8]',
  minimal:
    'bg-transparent text-ink shadow-none group-hover:bg-[rgb(80_68_30/0.05)]',
}

const OUTER: Record<Variant, string> = {
  primary:
    'shadow-[0_1px_2px_rgb(28_38_71/0.2),0_6px_14px_-4px_rgb(28_38_71/0.32)] ' +
    'hover:shadow-[0_2px_4px_rgb(28_38_71/0.22),0_10px_22px_-6px_rgb(28_38_71/0.4)]',
  secondary:
    'shadow-[0_1px_2px_rgb(80_68_30/0.06),0_5px_12px_-4px_rgb(80_68_30/0.14)] ' +
    'hover:shadow-[0_2px_4px_rgb(80_68_30/0.08),0_9px_20px_-6px_rgb(80_68_30/0.2)]',
  minimal: 'shadow-none',
}

const PAD: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-[0.8125rem]',
  md: 'px-5 py-2.5 text-[0.9375rem]',
  lg: 'px-7 py-3.5 text-base',
}

type Props = {
  children: ReactNode
  variant?: Variant
  size?: Size
  href?: string
  onClick?: () => void
  className?: string
  'aria-label'?: string
}

const PULL: Record<Size, number> = { sm: 3, md: 5, lg: 8 }

export function TextureButton({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className = '',
  ...rest
}: Props) {
  const { ref, x, y, near, reduced } = useMagnet(PULL[size])
  const lit = near && variant === 'primary'

  const shell =
    `group relative inline-flex rounded-[11px] p-px no-underline l-press ` +
    `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ` +
    `${RIM[variant]} ${OUTER[variant]} ${className}`

  const face =
    `relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-[10px] ` +
    `font-body font-medium leading-none transition-colors duration-150 ` +
    `${FACE[variant]} ${PAD[size]}`

  const inner = (
    <>
      {/* Gold bloom behind the button, lit only as the pointer closes in. The
          one place gold touches the primary action. */}
      {variant === 'primary' && !reduced && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-3 -z-10 rounded-[20px] transition-opacity duration-300"
          style={{
            opacity: lit ? 1 : 0,
            background:
              'radial-gradient(closest-side, rgba(232,201,95,0.42), rgba(201,162,39,0.14) 55%, rgba(201,162,39,0) 100%)',
          }}
        />
      )}
      <span className={face}>
        {/* Specular sweep, re-keyed on each approach so it replays. */}
        {!reduced && (
          <span
            key={lit ? 'lit' : 'dim'}
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 ${lit ? 'l-shine' : 'hidden'}`}
            style={{
              background:
                variant === 'primary'
                  ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.34), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(201,162,39,0.3), transparent)',
            }}
          />
        )}
        <span className="relative">{children}</span>
      </span>
    </>
  )

  const motionStyle = reduced ? undefined : { x, y }

  if (href) {
    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={shell}
        style={motionStyle}
        {...rest}
      >
        {inner}
      </motion.a>
    )
  }
  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={onClick}
      className={shell}
      style={motionStyle}
      {...rest}
    >
      {inner}
    </motion.button>
  )
}
