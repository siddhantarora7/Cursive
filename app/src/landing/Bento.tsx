import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Flame,
  Keyboard,
  Palette,
  ShieldCheck,
  Sparkles,
  SpellCheck2,
} from 'lucide-react'
import { BUILTIN_THEMES } from '../themes'

/** Agent-bento-grid-style feature grid: one hero-wide card, five satellites. */

function Card({
  className = '',
  icon,
  title,
  children,
  visual,
}: {
  className?: string
  icon: ReactNode
  title: string
  children: ReactNode
  visual?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [glow, setGlow] = useState({ x: 50, y: 50, on: false })
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        setGlow({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, on: true })
      }}
      onPointerLeave={() => setGlow((g) => ({ ...g, on: false }))}
      className={`reveal group relative overflow-hidden rounded-2xl border border-white/10 bg-night-soft/80 p-6 transition-colors duration-300 hover:border-teal-glow/30 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: glow.on ? 1 : 0,
          background: `radial-gradient(420px circle at ${glow.x}% ${glow.y}%, oklch(0.78 0.115 188 / 0.08), transparent 65%)`,
        }}
      />
      <div className="relative">
        <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-teal-deep/25 text-teal-glow">
          {icon}
        </div>
        <h3 className="font-body mb-1.5 text-[1.02rem] font-semibold text-mist-ink">{title}</h3>
        <p className="font-body text-[0.88rem] leading-relaxed text-white/55">{children}</p>
        {visual && <div className="mt-4">{visual}</div>}
      </div>
    </div>
  )
}

function GhostDemo() {
  const full = 'the words find you'
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setN((v) => (v + 1) % (full.length + 14)), 130)
    return () => window.clearInterval(t)
  }, [])
  const typed = full.slice(0, Math.min(n, full.length))
  return (
    <div className="font-mono-brand rounded-lg bg-black/40 px-4 py-3 text-[0.85rem]">
      <span className="text-mist-ink">Keep typing and </span>
      <span className="text-mist-ink">{typed}</span>
      <span className="ghost-demo text-white/30">{full.slice(Math.min(n, full.length))}</span>
      <span className="ml-3 rounded border border-white/15 px-1.5 py-0.5 text-[0.65rem] text-white/40">Tab</span>
    </div>
  )
}

export function Bento() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card
        className="md:col-span-2"
        icon={<Sparkles size={18} />}
        title="Ghost text that keeps up"
        visual={<GhostDemo />}
      >
        Inline AI completions appear as you pause — Tab takes everything, ⌘→ takes a word,
        typing straight through them just works. Bad suggestions get dropped silently; you
        never babysit the machine.
      </Card>
      <Card icon={<SpellCheck2 size={18} />} title="Autocorrect that earns trust">
        Local, instant, dictionary-ranked. <em className="text-mist-ink not-italic">waht → what</em> the
        moment you hit space — and one Backspace reverts it and it never argues about that word again.
      </Card>
      <Card
        icon={<Palette size={18} />}
        title="Eight themes + a builder"
        visual={
          <div className="flex gap-2">
            {BUILTIN_THEMES.map((t) => (
              <span
                key={t.id}
                title={t.name}
                className="h-7 flex-1 rounded-md border border-white/10 transition-transform duration-150 hover:-translate-y-0.5"
                style={{ background: `linear-gradient(135deg, ${t.vars.bg} 55%, ${t.vars.caret})` }}
              />
            ))}
          </div>
        }
      >
        Paper to Terminal, every one carrying its own caret. Build your own and share it as a string.
      </Card>
      <Card icon={<Flame size={18} />} title="A feel layer, not a gimmick">
        Buttery caret interpolation, keystroke sparks, a combo glow that warms up with your WPM —
        all on a separate canvas that can never touch input latency. 60fps is a correctness bar here.
      </Card>
      <Card icon={<ShieldCheck size={18} />} title="Local-first, actually">
        Documents live in your browser. No account, no sync, no server copies — the only thing that
        ever leaves is ~1,000 characters at suggestion time, and you can turn that off too.
      </Card>
      <Card icon={<Keyboard size={18} />} title="Made for the keyboard">
        Every control has a shortcut. Zen mode fades the chrome; Demo mode adds keystroke captions
        and a live WPM badge for recording clips worth sharing.
      </Card>
    </div>
  )
}
