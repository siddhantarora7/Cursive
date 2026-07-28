import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import '@fontsource/baskervville/400.css'
import '@fontsource-variable/public-sans'
import '@fontsource-variable/jetbrains-mono'
import './landing.css'
import { PinProvider } from './primitives/PinContext'
import { GradientBubbles } from './primitives/GradientBubbles'
import { ScrollRail } from './primitives/ScrollRail'
import { useScrollSpy } from './primitives/useScrollSpy'
import { NAV } from './copy'
import { Nav } from './sections/Nav'
import { Hero } from './sections/Hero'
import { MetaStrip } from './sections/MetaStrip'

/*
 * Route composition.
 *
 * The hero and the strip are the first paint and ship in the entry chunk.
 * Everything from the ghost demo down is one lazy chunk fetched by an
 * IntersectionObserver well before it is needed, so the landing route's first
 * load stays small without the reader ever seeing a gap.
 *
 * Two structural rules hold the whole page together and are easy to break by
 * accident:
 *
 *   1. No ancestor of a pinned section may have `overflow: hidden`, or
 *      `position: sticky` silently stops working. The hero clips its own
 *      marquees; nothing above it clips anything.
 *   2. Exactly one element owns the background. Every section is transparent,
 *      so there is no colour change anywhere down the scroll.
 */

const Below = lazy(() => import('./sections/Below'))

/** Mounts children once they are within `margin` of the viewport. */
function Deferred({ children, margin = '900px' }: { children: ReactNode; margin?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin])

  return <div ref={ref}>{show ? children : null}</div>
}

/*
 * The ambient key field.
 *
 * Viewport-fixed rather than absolutely placed in the flow: the keys have to
 * stay in view and drift for the whole middle of the page, and an absolute
 * layer spanning thirty viewports would scatter eight keys so far apart that
 * you would never see two at once.
 *
 * Opacity is a function of document scroll, so the field bleeds in once the
 * hero is behind you and back out before the finale. It never overlaps the
 * two moments that should be clean: the first impression and the last one.
 */
function AmbientField() {
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0.08, 0.2, 0.72, 0.85], [0, 0.2, 0.2, 0])

  if (reduced) return null

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ opacity, zIndex: 'var(--z-ambient)' }}
    >
      {/* Gold and ink blobs only. The drifting key field used to run the whole
          length of the page, which spent the motif everywhere and left the
          section that is actually about keys with nothing to reveal; it now
          lives solely in ThreeKeys. */}
      <GradientBubbles opacity={0.9} />
    </motion.div>
  )
}

/* The rail and the nav read from the same list, so they cannot disagree. */
const RAIL_STOPS = NAV.links.map((l) => ({ id: l.href.slice(1), label: l.label }))

export default function Landing() {
  const railActive = useScrollSpy(RAIL_STOPS.map((s) => s.id))

  useEffect(() => {
    document.title = 'Cursive · Type half. Tab the rest.'
  }, [])

  return (
    <PinProvider>
      <div className="l-grain relative min-h-svh bg-cream font-body text-ink">
        <AmbientField />
        <Nav />
        <ScrollRail stops={RAIL_STOPS} active={railActive} />

        <main>
          <Hero />
          <MetaStrip />

          <Deferred>
            <Suspense fallback={<div className="min-h-svh" />}>
              <Below />
            </Suspense>
          </Deferred>
        </main>
      </div>
    </PinProvider>
  )
}
