import { TRUST } from '../copy'

/*
 * The privacy claim, stated plainly and once.
 *
 * No lock icons, no shield badges, no card. Against every other AI writing
 * tool this is the actual differentiator, and dressing it up as a feature tile
 * would make it look like marketing rather than like a fact. Large type, a row
 * of specifics, and a link to the page where it is spelled out in full.
 */

export function Trust() {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="l-display text-[clamp(2rem,4.5vw,3.5rem)]">{TRUST.heading}</h2>
        <p className="l-prose mx-auto mt-6 text-[1.0625rem] text-ink/80">{TRUST.body}</p>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5">
          {TRUST.facts.map((f) => (
            <li
              key={f}
              className="l-meta rounded-full border border-hairline px-3.5 py-1.5 text-meta"
            >
              {f}
            </li>
          ))}
        </ul>

        <p className="mt-8">
          <a
            href={TRUST.link.href}
            className="font-body text-[0.9375rem] text-blue underline decoration-blue/25 underline-offset-4 transition-colors hover:decoration-blue"
          >
            {TRUST.link.label}
          </a>
        </p>
      </div>
    </section>
  )
}
