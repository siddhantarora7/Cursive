import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'

/*
 * Buttons.
 *
 * `gloss` is the brand action: a glossy black cap, lit from above, with a
 * specular highlight over the upper half and a pooled glow underneath. It is
 * the only button on the page that looks like this, so nothing else competes
 * with "start writing".
 *
 * `secondary` and `outline` are deliberately flat by comparison. The plans
 * section used the brand button and read as three equally-weighted primary
 * actions; a page with three primary buttons has none.
 *
 * Renders an <a> when `href` is given and a <button> otherwise, so a link is a
 * real link: middle-clickable, right-clickable, crawlable.
 */

type Variant = 'gloss' | 'secondary' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const PAD: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-[0.8125rem]',
  md: 'px-5 py-2.5 text-[0.9375rem]',
  lg: 'px-7 py-3.5 text-base',
}

const PULL: Record<Size, number> = { sm: 3, md: 5, lg: 8 }

/*
 * Magnet: the button leans toward the pointer as it approaches and springs
 * back when it leaves. The pull is small and capped well inside the button's
 * own bounds, because a control that chases the cursor far enough to be dodged
 * has stopped being a button.
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
      const dx = e.clientX - (b.left + b.width / 2)
      const dy = e.clientY - (b.top + b.height / 2)
      const radius = Math.max(b.width, b.height) * 1.35
      const dist = Math.hypot(dx, dy)

      if (dist > radius) {
        setNear(false)
        x.set(0)
        y.set(0)
        return
      }
      setNear(true)
      const falloff = 1 - dist / radius
      x.set((dx / radius) * pull * falloff * 2)
      y.set((dy / radius) * pull * falloff * 2)
    }

    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduced, pull, x, y])

  return { ref, x, y, near, reduced }
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

export function TextureButton({
  children,
  variant = 'gloss',
  size = 'md',
  href,
  onClick,
  className = '',
  ...rest
}: Props) {
  const { ref, x, y, near, reduced } = useMagnet(PULL[size])
  const gloss = variant === 'gloss'
  const lit = near && gloss

  const base =
    'group relative inline-flex select-none items-center justify-center gap-2 rounded-[12px] ' +
    'font-body font-medium leading-none no-underline overflow-hidden ' +
    'focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue ' +
    'active:translate-y-px'

  const skin =
    variant === 'gloss'
      ? 'l-gloss text-white'
      : variant === 'secondary'
        ? 'border border-hairline bg-sheet text-ink l-raise hover:bg-white'
        : 'border border-ink/25 bg-transparent text-ink hover:border-ink/45 hover:bg-[rgb(80_68_30/0.04)]'

  const inner = (
    <>
      {/* Glow pooled under the cap, lit as the pointer closes in. */}
      {gloss && !reduced && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-4 -z-10 rounded-[22px] transition-opacity duration-300"
          style={{
            opacity: lit ? 1 : 0,
            background:
              'radial-gradient(closest-side, rgba(232,201,95,0.4), rgba(201,162,39,0.13) 55%, rgba(201,162,39,0) 100%)',
          }}
        />
      )}

      {/* Specular cap over the upper half. */}
      {gloss && (
        <span
          aria-hidden
          className="l-gloss-cap pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[12px]"
        />
      )}

      {/* Sweep, replayed each time the pointer arrives. */}
      {!reduced && lit && (
        <span
          aria-hidden
          className="l-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent)',
          }}
        />
      )}

      <span className="relative">{children}</span>
    </>
  )

  const motionStyle = reduced ? undefined : { x, y }
  const cls = `${base} ${skin} ${PAD[size]} ${className}`

  if (href) {
    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={cls}
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
      className={cls}
      style={motionStyle}
      {...rest}
    >
      {inner}
    </motion.button>
  )
}
