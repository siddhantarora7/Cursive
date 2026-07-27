import { METRICS } from '../copy'

/*
 * Three facts, sized as a strip rather than a stats hero.
 *
 * The numbers stay deliberately small. Blown up they become the big-number /
 * small-label SaaS template, which is exactly the cliche this page is trying
 * not to be, and these are claims about what Cursive does not do rather than
 * traction metrics worth shouting.
 */

export function MetaStrip() {
  return (
    <section className="px-6 pb-10 pt-2 sm:pb-16">
      <ul className="mx-auto list-none flex max-w-3xl flex-col divide-y divide-hairline border-y border-hairline sm:flex-row sm:divide-x sm:divide-y-0">
        {METRICS.map((m) => (
          <li
            key={m.label}
            className="flex flex-1 items-baseline justify-center gap-2.5 px-4 py-4 sm:flex-col sm:items-center sm:gap-1 sm:py-5"
          >
            <span className="font-display text-2xl leading-none text-ink tabular-nums">
              {m.value}
            </span>
            <span className="l-meta text-center text-meta">{m.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
