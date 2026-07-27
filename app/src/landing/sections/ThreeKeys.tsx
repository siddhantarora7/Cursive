import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import { KEYS } from '../copy'
import { Keycap } from '../primitives/Keycap'
import { AmbientKeys } from '../primitives/AmbientKeys'

/*
 * "The entire interface."
 *
 * This is where the ambient key field, which has been drifting at the edge of
 * perception behind the middle of the page, comes up to full strength. It is
 * the payoff for a motif that would otherwise just be wallpaper: the faint
 * shapes you have been half-noticing resolve into the three keys that are the
 * entire product surface, and then recede again afterwards.
 *
 * Each key presses once as it enters view, staggered, then rests. Not a loop:
 * a loop turns three physical objects into three blinking lights.
 */

function KeyItem({ item, index }: { item: (typeof KEYS.items)[number]; index: number }) {
  const ref = useRef<HTMLLIElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduced = useReducedMotion()
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    if (!inView || reduced) return
    const down = setTimeout(() => setPressed(true), 160 + index * 130)
    const up = setTimeout(() => setPressed(false), 160 + index * 130 + 190)
    return () => {
      clearTimeout(down)
      clearTimeout(up)
    }
  }, [inView, index, reduced])

  return (
    <li ref={ref} className="flex flex-col items-center text-center">
      <Keycap size="lg" pressed={pressed}>
        {item.cap}
      </Keycap>
      <span className="l-meta mt-5 text-ink">{item.label}</span>
      <span className="mt-2 max-w-[22ch] text-sm leading-relaxed text-ink/65">{item.note}</span>
    </li>
  )
}

export function ThreeKeys() {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <AmbientKeys opacity={0.85} />

      <div className="relative mx-auto max-w-3xl" style={{ zIndex: 'var(--z-raised)' }}>
        <div className="text-center">
          <h2 className="l-display text-[clamp(2rem,4.5vw,3.5rem)]">{KEYS.heading}</h2>
          <p className="l-prose mx-auto mt-4 text-[1.0625rem] text-ink/80">{KEYS.body}</p>
        </div>

        <ul className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
          {KEYS.items.map((item, i) => (
            <KeyItem key={item.cap} item={item} index={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}
