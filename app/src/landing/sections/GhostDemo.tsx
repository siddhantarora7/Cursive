import { useState } from 'react'
import { useMotionValueEvent, type MotionValue } from 'motion/react'
import { GHOST } from '../copy'
import { Pin } from '../primitives/Pin'
import { Keycap } from '../primitives/Keycap'
import { EditorMock } from '../visuals/EditorMock'

/*
 * The core demonstration, pinned for three and a bit viewports.
 *
 * Everything here is a pure function of scroll position rather than of elapsed
 * time. Scroll down and the sentence types itself, the suggestion arrives in
 * gray, the Tab key depresses, and the gray becomes ink. Scroll back up and it
 * rewinds exactly, because there is no timer holding state that scrolling can
 * get out of sync with. That property is the whole reason to pin rather than
 * to autoplay on view.
 *
 * Three sentences share the section, one per stage, so the point being made is
 * that this happens continuously rather than once.
 */

type Stage = { typed: string; ghost: string }

const STAGES: Stage[] = GHOST.stages.map((s) => ({ typed: s.typed, ghost: s.ghost }))
const N = STAGES.length
const FIRST: Stage = STAGES[0] ?? { typed: '', ghost: '' }

/** Index is always clamped into range; this keeps that fact in the types. */
function stageAt(i: number): Stage {
  return STAGES[i] ?? FIRST
}

/* Phase boundaries within a single stage, in local progress. */
const TYPE_END = 0.5
const GHOST_END = 0.66
const TAB_END = 0.76

type Frame = {
  stage: number
  typed: number
  ghost: number
  tab: boolean
  inked: boolean
}

function frameAt(v: number): Frame {
  const clamped = Math.min(0.9999, Math.max(0, v))
  const raw = clamped * N
  const stage = Math.min(N - 1, Math.floor(raw))
  const local = raw - stage
  const prefix = stageAt(stage).typed

  if (local < TYPE_END) {
    return {
      stage,
      typed: Math.round((local / TYPE_END) * prefix.length),
      ghost: 0,
      tab: false,
      inked: false,
    }
  }
  if (local < GHOST_END) {
    return {
      stage,
      typed: prefix.length,
      ghost: (local - TYPE_END) / (GHOST_END - TYPE_END),
      tab: false,
      inked: false,
    }
  }
  if (local < TAB_END) {
    return { stage, typed: prefix.length, ghost: 1, tab: true, inked: false }
  }
  return { stage, typed: prefix.length, ghost: 1, tab: false, inked: true }
}

function same(a: Frame, b: Frame) {
  return (
    a.stage === b.stage &&
    a.typed === b.typed &&
    Math.abs(a.ghost - b.ghost) < 0.02 &&
    a.tab === b.tab &&
    a.inked === b.inked
  )
}

function Demo({ progress }: { progress: MotionValue<number> }) {
  const [frame, setFrame] = useState<Frame>(() => frameAt(progress.get()))

  useMotionValueEvent(progress, 'change', (v) => {
    const next = frameAt(v)
    setFrame((prev) => (same(prev, next) ? prev : next))
  })

  const stage = stageAt(frame.stage)
  const typedText = stage.typed.slice(0, frame.typed)
  const typing = frame.ghost === 0

  return (
    <div className="mx-auto w-full max-w-2xl px-6">
      <div className="text-center">
        <h2 className="l-display text-[clamp(1.75rem,3.4vw,2.75rem)]">{GHOST.heading}</h2>
        <p className="l-prose mx-auto mt-4 text-[1.0625rem] text-ink/80">{GHOST.body}</p>
      </div>

      <EditorMock
        className="mt-10 l-raise-lg"
        label="notes.md"
        status={`${frame.stage + 1} / ${N}`}
      >
        <p className="min-h-[5.5em]">
          <span>{typedText}</span>
          {frame.ghost > 0 && (
            <span
              style={{
                color: frame.inked ? '#1A1A1A' : '#8A8A8A',
                opacity: frame.inked ? 1 : 0.35 + frame.ghost * 0.65,
                transition: 'color 260ms cubic-bezier(0.25,1,0.5,1)',
              }}
            >
              {stage.ghost}
            </span>
          )}
          {typing && <span className="l-caret text-blue" aria-hidden />}
        </p>
      </EditorMock>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Keycap size="sm" pressed={frame.tab}>
          Tab
        </Keycap>
        <span className="l-meta text-meta">
          {frame.inked ? 'taken' : frame.ghost > 0 ? 'to take it' : 'keep typing'}
        </span>
      </div>
    </div>
  )
}

export function GhostDemo() {
  return (
    <Pin id="ghost" vh={3.4} innerClassName="pt-20">
      {(p) => <Demo progress={p} />}
    </Pin>
  )
}
