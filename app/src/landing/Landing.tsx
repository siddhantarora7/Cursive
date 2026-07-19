import { useEffect } from 'react'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { App } from '../ui/App'
import { Bento } from './Bento'
import { TextureButton } from './TextureButton'
import '../styles/landing.css'
import '@fontsource-variable/newsreader'
import '@fontsource-variable/public-sans'
import '@fontsource-variable/jetbrains-mono'

/**
 * The marketing route ("/") — dark stage, teal rays, and the REAL editor as
 * the hero: visitors type immediately, no signup. "/write" is the full app.
 */

function useReveals() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.15 },
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export function Landing() {
  useReveals()
  return (
    <div className="font-body min-h-screen bg-night text-mist-ink">
      {/* ===== nav ===== */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/cursive-logo.png" alt="Cursive" className="size-8 rounded-lg invert" />
          <span className="font-display text-xl font-semibold tracking-tight">Cursive</span>
        </a>
        <nav className="flex items-center gap-2">
          <a href="#features" className="hidden px-3 py-2 text-sm text-white/60 transition-colors hover:text-white sm:block">
            Features
          </a>
          <a href="#privacy" className="hidden px-3 py-2 text-sm text-white/60 transition-colors hover:text-white sm:block">
            Privacy
          </a>
          <TextureButton variant="accent" size="sm" onClick={() => (location.href = '/write')}>
            Open the app
          </TextureButton>
        </nav>
      </header>

      {/* ===== hero ===== */}
      <section className="relative overflow-hidden pb-24">
        <div className="rays-stage">
          <div className="ray" /><div className="ray" /><div className="ray" /><div className="ray" /><div className="ray" />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-14 text-center">
          <p className="font-mono-brand mb-5 text-[0.78rem] tracking-[0.18em] text-teal-glow/80 uppercase">
            Monkeytype for writing · Copilot built in
          </p>
          <h1 className="font-display mx-auto max-w-3xl text-5xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl md:text-7xl">
            The most satisfying place on the internet to type.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/60">
            Ghost-text completions you accept with Tab. A caret that glides. Typos that fix
            themselves. No account, nothing stored on our servers — it's already running below.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <TextureButton
              variant="accent"
              size="lg"
              onClick={() => {
                document.querySelector<HTMLElement>('.hero-window .cursive-editor')?.focus()
                document.getElementById('hero-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            >
              Start typing <ArrowRight size={18} />
            </TextureButton>
            <TextureButton variant="primary" size="lg" onClick={() => (location.href = '/write')}>
              Full screen
            </TextureButton>
          </div>

          {/* the actual product, framed */}
          <div id="hero-editor" className="hero-window mx-auto mt-14 h-[560px] max-w-5xl text-left">
            <App />
          </div>
          <p className="font-mono-brand mt-4 text-[0.72rem] text-white/35">
            ↑ not a mockup — your words persist in this browser
          </p>
        </div>
      </section>

      {/* ===== features ===== */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-display reveal mb-3 text-center text-4xl font-medium tracking-tight sm:text-5xl">
          Chrome when you need it, <span className="text-teal-glow">flow</span> when you don't.
        </h2>
        <p className="reveal mx-auto mb-12 max-w-2xl text-center text-white/55">
          A full document toolbar that fades away in Zen mode, riding on an editor tuned like an instrument.
        </p>
        <Bento />
      </section>

      {/* ===== free tier strip ===== */}
      <section className="border-y border-white/8 bg-night-soft/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-14 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <h2 className="font-display reveal text-3xl font-medium tracking-tight">
              150 free suggestions a day. Or bring your own key.
            </h2>
            <p className="reveal mt-3 max-w-xl text-[0.95rem] leading-relaxed text-white/55">
              The free tier runs on fast open models through our proxy — those providers may train
              on the snippet sent, and we say so up front. Paste your own OpenAI, Anthropic, Gemini,
              or OpenRouter key and it goes straight from your browser to them: unlimited, uncapped,
              never touching our servers.
            </p>
          </div>
          <TextureButton variant="secondary" size="lg" onClick={() => (location.href = '/write')}>
            Try it now
          </TextureButton>
        </div>
      </section>

      {/* ===== privacy ===== */}
      <section id="privacy" className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h2 className="font-display reveal mb-4 text-3xl font-medium tracking-tight">Your words belong to you.</h2>
        <p className="reveal text-[0.95rem] leading-relaxed text-white/55">
          Documents persist to IndexedDB in your browser and nowhere else. No accounts, no
          analytics on your writing, no server-side storage. At suggestion time — and only then —
          up to ~1,000 characters before your cursor plus your document-intent line are sent to
          the AI provider. Set suggestions to <span className="text-mist-ink">Off</span> and
          nothing leaves at all. Everything except AI works offline.
        </p>
      </section>

      {/* ===== footer ===== */}
      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-8 text-[0.8rem] text-white/40">
          <span className="flex items-center gap-2">
            <img src="/cursive-logo.png" alt="" className="size-5 rounded invert" /> Cursive — local-first, feel-first.
          </span>
          <a
            href="https://github.com/siddhantarora7/Cursive"
            className="flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <ExternalLink size={14} /> Source
          </a>
        </div>
      </footer>
    </div>
  )
}
