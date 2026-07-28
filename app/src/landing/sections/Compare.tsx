import { COMPARE } from '../copy'

/*
 * The comparison, kept honest.
 *
 * Every row is checkable in ten seconds and the rows where a rival ties or
 * wins are left in: Docs is also free, ChatGPT also never sees a document you
 * do not paste. A table where the home column is green all the way down is
 * read as marketing and believed by nobody, and it invites the reader to go
 * find the row you left out.
 *
 * The Cursive column is the only one with a surface behind it, so the eye has
 * somewhere to land without any cell needing a badge or a tick.
 */

export function Compare() {
  const { columns, rows } = COMPARE

  return (
    <section id="compare" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="l-display text-[clamp(1.75rem,3.4vw,2.75rem)]">{COMPARE.heading}</h2>
          <p className="l-prose mx-auto mt-4 text-[1.0625rem] text-ink/80">{COMPARE.body}</p>
        </div>

        {/* Wide content scrolls inside its own container; the page never does. */}
        <div className="mt-12 -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <caption className="sr-only">
              How Cursive compares with Google Docs, Notion AI and ChatGPT
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-[30%] pb-4" />
                {columns.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={`pb-4 text-center align-bottom ${
                      i === 0 ? 'font-display text-lg text-ink' : 'l-meta font-normal text-meta'
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={row.label} className="border-t border-hairline">
                  <th
                    scope="row"
                    className="py-4 pr-4 text-[0.9375rem] font-normal leading-snug text-ink/75"
                  >
                    {row.label}
                  </th>
                  {row.values.map((v, i) => (
                    <td
                      key={i}
                      className={`px-3 py-4 text-center text-[0.9375rem] leading-snug ${
                        i === 0
                          ? 'bg-[rgb(255_255_255/0.5)] font-medium text-ink shadow-[inset_1px_0_0_rgb(228_225_210),inset_-1px_0_0_rgb(228_225_210)]'
                          : 'text-ink/60'
                      } ${i === 0 && r === rows.length - 1 ? 'rounded-b-xl shadow-[inset_1px_0_0_rgb(228_225_210),inset_-1px_0_0_rgb(228_225_210),inset_0_-1px_0_rgb(228_225_210)]' : ''}`}
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="l-meta mt-6 text-center text-meta">{COMPARE.note}</p>
      </div>
    </section>
  )
}
