import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { useTabEgg } from '../primitives/useTabEgg'
import { CTA, HERO } from '../copy'
import { TextureButton } from '../primitives/TextureButton'
import { TypingCapsule } from '../visuals/TypingCapsule'

/*
 * The headline performs the product before any copy is read.
 *
 * "Type half." is what you do, so it is ink from the first frame. "Tab the
 * rest." is what Cursive offers, so it arrives muted and resolves to ink once,
 * 900ms after paint. That is a suggestion being accepted, rendered in the
 * largest type on the page.
 *
 * It fires once and never loops. A headline that keeps re-animating stops
 * being a demonstration and becomes a distraction, and by the time anyone has
 * scrolled back to it they have already seen the real thing three times.
 */

export function Hero() {
  const reduced = useReducedMotion()
  const [accepted, setAccepted] = useState(false)

  /*
   * Press Tab with nothing focused and the headline re-accepts itself: the
   * tail drops back to ghost grey and inks again. The page's own keyboard
   * shortcut is the product's only keyboard shortcut.
   */
  const egg = useTabEgg()
  const [replay, setReplay] = useState(false)

  useEffect(() => {
    if (!egg) return
    setReplay(true)
    const back = setTimeout(() => setReplay(false), 620)
    return () => clearTimeout(back)
  }, [egg])

  useEffect(() => {
    if (reduced) {
      setAccepted(true)
      return
    }
    const t = setTimeout(() => setAccepted(true), 900)
    return () => clearTimeout(t)
  }, [reduced])

  return (
    <section className="relative overflow-hidden px-6 pb-24 pt-24 sm:pb-32 sm:pt-28">
      <div
        className="relative mx-auto flex max-w-3xl flex-col items-center text-center"
        style={{ zIndex: 'var(--z-raised)' }}
      >
        {/* Links to the plans rather than just asserting: the claim is
            checkable in one click, which is the whole posture of the page. */}
        <a
          href="#plans"
          className="l-glass mb-8 inline-flex items-center gap-2.5 rounded-full px-4 py-2 no-underline transition-transform duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
        >
          <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[#c9a227]" />
          <span className="l-meta text-ink">{HERO.badge}</span>
        </a>

        <h1 className="l-display text-[clamp(2.75rem,7vw,6rem)]">
          <span className="text-ink">{HERO.lead}</span>{' '}
          <span
            style={{
              color: accepted && !replay ? '#1A1A1A' : '#8A8A8A',
              transition: reduced ? 'none' : 'color 420ms cubic-bezier(0.25,1,0.5,1)',
            }}
          >
            {HERO.tail}
          </span>
        </h1>

        <p className="l-prose mt-7 text-[1.0625rem] text-ink/85 sm:text-lg">{HERO.sub}</p>

        <div className="mt-9 flex flex-col items-center gap-4">
          <TextureButton href={CTA.href} size="lg">
            {CTA.label}
          </TextureButton>
          <p className="l-meta text-meta">{HERO.meta}</p>
        </div>
      </div>

      {/* The capsule owns the marquees, so the point where the rough draft
          becomes the clean version is always the capsule itself. */}
      <div className="relative mt-20 flex justify-center sm:mt-24">
        <TypingCapsule />
      </div>
    </section>
  )
}
