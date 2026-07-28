import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'

/*
 * A progress rail down the right edge.
 *
 * The page is roughly nineteen viewports and three of its sections hold the
 * screen for several of those, which reliably makes people wonder whether
 * scrolling is doing anything. The rail answers that without asking for
 * attention: a hairline, a filled portion, and a tick per section.
 *
 * Ticks are links, so it is a way through the page rather than a readout.
 * Hidden below lg, where the edge is needed for content.
 */

export type RailStop = { id: string; label: string }

export function ScrollRail({ stops, active }: { stops: RailStop[]; active: string | null }) {
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })

  return (
    <nav
      aria-label="Page sections"
      className="fixed right-6 top-1/2 hidden -translate-y-1/2 lg:block"
      style={{ zIndex: 'var(--z-sticky)' }}
    >
      <div className="relative flex flex-col items-end gap-5">
        {/* the track, and the portion behind you */}
        <span aria-hidden className="absolute right-[3px] top-0 h-full w-px bg-hairline" />
        <motion.span
          aria-hidden
          className="absolute right-[3px] top-0 w-px origin-top bg-blue/45"
          style={{ height: '100%', scaleY: reduced ? 1 : fill }}
        />

        {stops.map((s) => {
          const on = s.id === active
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="group relative flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
            >
              <span className="l-meta whitespace-nowrap text-meta opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                {s.label}
              </span>
              <span
                aria-hidden
                className="block rounded-full transition-all duration-300"
                style={{
                  width: on ? 7 : 5,
                  height: on ? 7 : 5,
                  background: on ? '#2B3A67' : '#D8D4C2',
                }}
              />
              <span className="sr-only">{s.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
