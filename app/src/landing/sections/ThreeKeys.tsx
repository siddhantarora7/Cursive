import { KEYS } from '../copy'
import { Keycap3D } from '../primitives/Keycap3D'
import { AmbientKeys } from '../primitives/AmbientKeys'
import { Spotlight } from '../primitives/Spotlight'

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

export function ThreeKeys() {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      {/* The page-wide gold field already runs behind this section, so adding a
          second one here just doubled the wash and turned the whole band
          yellow. This layer only raises the key field and adds a spotlight
          that lights what the pointer is actually near. */}
      <AmbientKeys opacity={0.85} />
      <Spotlight size={520} />

      <div className="relative mx-auto max-w-4xl" style={{ zIndex: 'var(--z-raised)' }}>
        <div className="text-center">
          <h2 className="l-display text-[clamp(2rem,4.5vw,3.5rem)]">{KEYS.heading}</h2>
          <p className="l-prose mx-auto mt-4 text-[1.0625rem] text-ink/80">{KEYS.body}</p>
          <p className="l-meta mt-6 text-meta">Move your cursor · click a key</p>
        </div>

        <ul className="mt-16 list-none grid grid-cols-1 gap-14 sm:grid-cols-3 sm:gap-8">
          {KEYS.items.map((item) => (
            <li key={item.cap} className="flex flex-col items-center text-center">
              <Keycap3D label={item.cap} sub={item.label} />
              <span className="mt-3 max-w-[22ch] text-sm leading-relaxed text-ink/65">
                {item.note}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
