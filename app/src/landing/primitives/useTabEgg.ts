import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

/*
 * Press Tab anywhere on the page and the headline finishes itself.
 *
 * The rule that makes this safe: Tab is how keyboard users move, so the egg
 * only fires when focus is on the document body, meaning nobody is tabbing
 * through anything. The moment focus is inside a link, button or the hero
 * input, Tab does what Tab has always done and the egg stays out of the way.
 *
 * It also fires once. An easter egg that retriggers is a keyboard trap wearing
 * a bow tie.
 */
export function useTabEgg(): boolean {
  const [fired, setFired] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || fired) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      // Only when nothing is focused: never steal Tab from real navigation.
      const el = document.activeElement
      if (el && el !== document.body) return
      e.preventDefault()
      setFired(true)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reduced, fired])

  return fired
}
