import { useEffect, useId, useRef, type ReactNode } from 'react'
import {
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type MotionValue,
} from 'motion/react'
import { usePinReport } from './PinContext'

/*
 * The one mechanism behind every pinned section on this page.
 *
 * A tall outer wrapper (`vh` viewports) holds a `position: sticky` child that
 * is exactly one viewport tall. As the wrapper scrolls past, the child stays
 * put and `useScroll` reports 0 to 1 across the whole wrapper. Children get
 * that progress as a MotionValue and decide what to do with it.
 *
 * This never touches the wheel: no event interception, no programmatic smooth
 * scroll, no scroll trapping. The reader can flick past a pinned section at
 * whatever speed they like, and scrolling back rewinds the animation because
 * everything is a pure function of position rather than of elapsed time.
 *
 * Under reduced motion the wrapper loses its extra height entirely and the
 * child renders at progress 1, its finished frame. It becomes an ordinary
 * stacked section, which is the honest equivalent rather than a jump cut.
 */

type Props = {
  /** How many viewports of scroll the section consumes. */
  vh?: number
  id?: string
  className?: string
  /** Extra classes for the sticky viewport-height child. */
  innerClassName?: string
  children: (progress: MotionValue<number>) => ReactNode
}

export function Pin({ vh = 3, id, className, innerClassName = '', children }: Props) {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const fallbackId = useId()
  const key = id ?? fallbackId
  const report = usePinReport()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  // Reduced-motion progress: a constant 1, so children render finished.
  const settled = useMotionValue(1)

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    report(key, !reduced && v > 0.001 && v < 0.999)
  })

  useEffect(() => () => report(key, false), [key, report])

  const progress = reduced ? settled : scrollYProgress

  if (reduced) {
    return (
      <section id={id} className={className}>
        <div className={innerClassName}>{children(progress)}</div>
      </section>
    )
  }

  return (
    <section id={id} ref={ref} className={className} style={{ height: `${vh * 100}svh` }}>
      <div
        className={`sticky top-0 flex h-svh w-full flex-col items-center justify-center overflow-hidden ${innerClassName}`}
      >
        {children(progress)}
      </div>
    </section>
  )
}
