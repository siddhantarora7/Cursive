import { FAQ } from '../copy'

/*
 * Objection handling, in the browser's own disclosure widget.
 *
 * `<details>` rather than a hand-rolled accordion: it is keyboard operable,
 * announced correctly, works before hydration, and is findable by the
 * browser's own in-page search when closed in engines that support it. A
 * div-with-onClick would be a worse version of all four.
 *
 * The answers name the uncomfortable parts (documents die with your browser
 * data, suggestions need a connection) because a FAQ that only says
 * reassuring things is the one nobody believes.
 */

export function Faq() {
  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="l-display text-center text-[clamp(1.75rem,3.4vw,2.75rem)]">
          {FAQ.heading}
        </h2>

        <div className="mt-12 border-t border-hairline">
          {FAQ.items.map((item) => (
            <details key={item.q} className="group border-b border-hairline">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[1.0625rem] leading-snug text-ink transition-colors hover:text-blue focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="relative h-4 w-4 shrink-0 text-meta transition-transform duration-300 group-open:rotate-45"
                >
                  <span className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-current" />
                  <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-current" />
                </span>
              </summary>
              <p className="l-prose pb-6 pr-10 text-[0.9375rem] leading-relaxed text-ink/70">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
