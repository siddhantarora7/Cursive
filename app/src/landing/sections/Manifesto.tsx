import { motion, useReducedMotion, useTransform, type MotionValue } from 'motion/react'
import { MANIFESTO } from '../copy'
import { Pin } from '../primitives/Pin'

/*
 * The one moment on the page that argues rather than demonstrates.
 *
 * Words stack against a hairline down the centre, right-aligned into it, and
 * the column travels upward as you scroll so each word passes a fixed dot.
 * Words that have not reached the dot sit at low opacity; passing it brings
 * them to full ink. The mechanic sets the reading pace, which is the point:
 * the sentence is about pausing, so it makes you take one.
 *
 * The closing line is the page's accent colour. It appears three times in
 * total across the whole document, and this is the one that matters.
 */

const LINE = 68 // px per word row, matched to the type size below

const WORDS: { text: string; accent: boolean }[] = [
  ...MANIFESTO.lead.split(' ').map((text) => ({ text, accent: false })),
  ...MANIFESTO.accent.split(' ').map((text) => ({ text, accent: true })),
]

function Word({
  word,
  index,
  progress,
}: {
  word: { text: string; accent: boolean }
  index: number
  progress: MotionValue<number>
}) {
  /*
   * Each word crosses from faint to solid over a window ending just after its
   * turn at the dot.
   *
   * The range must stay inside [0,1] and strictly increase. Motion compiles a
   * useTransform driven by useScroll into a scroll-linked WAAPI animation, and
   * the input range becomes the keyframe offsets, which the platform rejects
   * outside that interval. An unclamped window on the first word starts
   * negative and throws on mount, taking the render down with it.
   */
  const n = WORDS.length
  const start = Math.max(0, Math.min(0.998, (index - 1.4) / n))
  const end = Math.max(start + 0.002, Math.min(1, (index + 0.15) / n))
  const opacity = useTransform(progress, [start, end], [0.13, 1], { clamp: true })

  return (
    <motion.span
      style={{ opacity, height: LINE }}
      className={`flex items-center justify-end whitespace-nowrap ${
        word.accent ? 'text-red' : 'text-ink'
      }`}
    >
      {word.text}
    </motion.span>
  )
}

function Column({ progress }: { progress: MotionValue<number> }) {
  // Move the column so the word whose turn it is sits on the dot.
  const y = useTransform(progress, (v) => -(v * WORDS.length * LINE))

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* the hairline */}
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-hairline" />

      {/* the travelling dot, fixed at centre while the words move past it */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="block h-2.5 w-2.5 rounded-full bg-red shadow-[0_0_0_5px_rgb(200_73_46/0.14)]" />
      </div>

      {/*
       * Words fade at the top and bottom via a mask, not via an opaque cream
       * overlay painted on top. The overlay was hiding the page's gold field
       * wherever it covered, which produced a visible horizontal seam against
       * the transparent sections either side: a colour change between sections,
       * which is the one thing this page must never have.
       */}
      <motion.div
        style={{
          y,
          top: '50%',
          marginTop: -LINE / 2,
          maskImage:
            'linear-gradient(to bottom, transparent 0%, #000 24%, #000 76%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, #000 24%, #000 76%, transparent 100%)',
        }}
        className="absolute left-0 flex w-1/2 flex-col pr-7 font-display text-[clamp(1.75rem,4vw,3.25rem)] leading-none"
      >
        {WORDS.map((w, i) => (
          <Word key={`${w.text}-${i}`} word={w} index={i} progress={progress} />
        ))}
      </motion.div>
    </div>
  )
}

export function Manifesto() {
  const reduced = useReducedMotion()

  /*
   * Reduced motion gets the sentence rather than a frozen frame of the
   * mechanic. At progress 1 the travelling column has scrolled itself off the
   * top, so rendering the finished state here would be an empty section; the
   * honest equivalent of a word-by-word reveal is the words, set once.
   */
  if (reduced) {
    return (
      <section className="px-6 py-28">
        <blockquote className="mx-auto max-w-2xl text-center font-display text-[clamp(1.75rem,4vw,3rem)] leading-[1.15]">
          <span className="text-ink">{MANIFESTO.lead}</span>{' '}
          <span className="text-red">{MANIFESTO.accent}</span>
        </blockquote>
      </section>
    )
  }

  return (
    <Pin vh={4.5}>
      {(p) => (
        <>
          {/* Screen readers get the sentence as a sentence, not as 19 words. */}
          <p className="sr-only">
            {MANIFESTO.lead} {MANIFESTO.accent}
          </p>
          <div aria-hidden className="h-full w-full">
            <Column progress={p} />
          </div>
        </>
      )}
    </Pin>
  )
}
