import { useEffect, useState } from 'react'

/*
 * Which section is currently in view.
 *
 * An IntersectionObserver with a band across the middle of the viewport rather
 * than scroll-position arithmetic: nothing runs per frame, and it stays correct
 * while a pinned section is holding the screen, which offset maths does not.
 *
 * The band is deliberately narrow (a strip around the vertical centre) so that
 * usually exactly one section intersects it, and ties resolve to whichever
 * covers more of it.
 *
 * The wrinkle worth documenting: every section this tracks lives in a lazily
 * loaded chunk, so on first mount none of the ids resolve. A plain effect finds
 * nothing, gives up, and never runs again, which silently pins the indicator to
 * its initial guess forever. A MutationObserver watches for the sections
 * arriving and re-arms the real observer when they do.
 */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join(',')

  useEffect(() => {
    const list = key.split(',').filter(Boolean)
    let io: IntersectionObserver | null = null
    let found = 0

    const arm = () => {
      const els = list
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => Boolean(el))

      // Only rebuild when the set of resolvable sections has actually grown.
      if (els.length === found) return
      found = els.length
      io?.disconnect()
      if (els.length === 0) return

      const visible = new Map<string, number>()
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio)
            else visible.delete(e.target.id)
          }
          let best: string | null = null
          let bestRatio = -1
          for (const [id, ratio] of visible) {
            if (ratio > bestRatio) {
              best = id
              bestRatio = ratio
            }
          }
          setActive(best)
        },
        { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.02, 0.25, 0.5, 1] },
      )
      els.forEach((el) => io?.observe(el))
    }

    arm()

    const mo = new MutationObserver(arm)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      io?.disconnect()
    }
  }, [key])

  return active
}
