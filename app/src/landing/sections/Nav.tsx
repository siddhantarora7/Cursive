import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { CTA, NAV } from '../copy'
import { TextureButton } from '../primitives/TextureButton'
import { usePinEngaged } from '../primitives/PinContext'
import { useScrollSpy } from '../primitives/useScrollSpy'

/*
 * The sticky pill.
 *
 * Two states beyond resting. It gains a surface (hairline plus warm shadow)
 * once the hero is behind you, because from that point on there is content
 * passing underneath it that it needs to be legible against. And it retreats
 * whenever a pinned section is engaged: three of the sections on this page
 * deliberately hold the viewport for multiple screens, and a nav bar sitting
 * on top of them for that whole time competes with the thing it is meant to
 * be framing. Retreating means smaller, dimmer, and links dropped, keeping
 * only the mark and the call to action.
 *
 * The top state is detected with an IntersectionObserver on a sentinel rather
 * than a scroll listener, so nothing runs per frame.
 */

export function Nav() {
  const engaged = usePinEngaged()
  const reduced = useReducedMotion()
  const sentinel = useRef<HTMLDivElement>(null)
  const [atTop, setAtTop] = useState(true)
  const active = useScrollSpy(NAV.links.map((l) => l.href.slice(1)))

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => setAtTop(entries.some((e) => e.isIntersecting)),
      { threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const retreat = engaged && !reduced

  return (
    <>
      <div
        ref={sentinel}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-20 w-px"
      />
      <div
        className="sticky top-0 flex w-full justify-center px-4 pt-4 sm:pt-5"
        style={{ zIndex: 'var(--z-nav)' }}
      >
        <motion.header
          animate={{
            scale: retreat ? 0.92 : 1,
            opacity: retreat ? 0.4 : 1,
          }}
          transition={{ duration: reduced ? 0 : 0.32, ease: [0.25, 1, 0.5, 1] }}
          className={`flex items-center gap-1.5 rounded-full px-2 py-2 transition-[background-color,box-shadow,border-color] duration-300 sm:gap-3 sm:px-3 ${
            atTop
              ? 'border border-transparent bg-transparent'
              : 'border border-hairline bg-cream l-raise'
          }`}
        >
          <a
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            <span aria-hidden="true" className="brand-mark h-[22px] w-[22px]" />
            <span className="font-display text-xl leading-none text-ink">Cursive</span>
          </a>

          <nav
            aria-label="Sections"
            className={`hidden items-center gap-1 transition-opacity duration-200 md:flex ${
              retreat ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            {NAV.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                aria-current={active === l.href.slice(1) ? 'true' : undefined}
                className={`rounded-full px-3 py-1.5 font-body text-sm no-underline transition-colors duration-150 hover:bg-[rgb(80_68_30/0.06)] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
                  active === l.href.slice(1)
                    ? 'bg-[rgb(80_68_30/0.07)] text-ink'
                    : 'text-ink/70'
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <TextureButton href={CTA.href} size="sm" className="ml-0.5 shrink-0">
            {CTA.label}
          </TextureButton>
        </motion.header>
      </div>
    </>
  )
}
