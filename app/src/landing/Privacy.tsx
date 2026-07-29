import { useEffect } from 'react'
import '@fontsource/baskervville/400.css'
import '@fontsource-variable/public-sans'
import '@fontsource-variable/jetbrains-mono'
import './landing.css'
import { FOOTER, NAV } from './copy'

/*
 * The real privacy page, rebuilt on the new design system with its content
 * carried over unchanged.
 *
 * Everything stated here has to stay true to the architecture: local-first
 * storage, no accounts, no analytics, and the free-tier training disclosure
 * required by docs/ARCHITECTURE.md section 5. The e2e suite asserts that
 * disclosure is present, which is deliberate; it is the one claim on this site
 * that a redesign must never quietly drop.
 */

const SECTIONS = [
  {
    title: 'Your documents stay in your browser',
    body: `Everything you write is stored in this browser’s IndexedDB and nowhere else. There are no accounts, no analytics, and no server-side copies of your documents. Clearing your browser data deletes your documents, so export anything you want to keep.`,
  },
  {
    title: 'What leaves your device, and when',
    body: `When AI suggestions are on, Cursive sends a short slice of text around your caret (at most about a thousand characters), your optional document intent line, and a random anonymous id to the suggestion service at the moment a suggestion is requested. Nothing else is sent, and nothing is sent while AI is off.`,
  },
  {
    title: 'Free tier and training data',
    body: `Free-tier suggestions are served through free provider APIs (currently Groq and Google). Under those providers’ free-API terms, the text slices sent for a suggestion may be used by them to improve their models. If that is not acceptable for what you are writing, use your own API key (requests then go directly from your browser to your provider under your own terms) or switch AI off. This is also stated in Settings next to the Free / Bring-your-own-key choice.`,
  },
  {
    title: 'Bring your own key',
    body: `A key you add is kept in this browser’s localStorage only. It is never sent to Cursive servers. Requests made with it go straight from your browser to the provider you chose.`,
  },
  {
    title: 'Abuse limits',
    body: `To keep the free tier alive, the suggestion service counts requests per anonymous id and per IP address for a day. These counters hold no text and expire on their own.`,
  },
]

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy · Cursive'
  }, [])

  return (
    <div className="l-grain min-h-svh bg-cream font-body text-ink">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-6">
        <a
          href="/"
          className="flex items-center gap-2 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          <span aria-hidden="true" className="brand-mark h-[22px] w-[22px]" />
          <span className="font-display text-xl leading-none text-ink">Cursive</span>
        </a>
        <a
          href="/app"
          className="font-body text-sm text-blue no-underline underline-offset-4 hover:underline"
        >
          Open the editor
        </a>
      </header>

      <main className="mx-auto w-full max-w-2xl px-6 pb-24 pt-8">
        <h1 className="l-display text-[clamp(2.25rem,5vw,3.25rem)]">Privacy</h1>
        <p className="l-prose mt-5 text-[1.0625rem] text-ink/80">
          The short version: your documents never leave this browser, and the only thing
          that ever goes over the network is a small slice of text around your caret at
          the moment you ask for a suggestion.
        </p>

        <div className="mt-12 flex flex-col gap-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-2xl leading-snug text-ink">{s.title}</h2>
              <p className="l-prose mt-3 text-[0.9375rem] leading-relaxed text-ink/80">
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-16 border-t border-hairline pt-8 text-sm text-meta">
          Questions? Open an issue on{' '}
          <a
            href={NAV.repo}
            className="text-blue underline decoration-blue/25 underline-offset-4 hover:decoration-blue"
          >
            GitHub
          </a>
          .
        </p>
        <p className="l-meta mt-6 text-meta">{FOOTER.line}</p>
      </main>
    </div>
  )
}
