import { useState } from 'react'
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react'
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

/*
 * The first quarter of the pin is an arrival: the editor grows from small and
 * low into full size and settles, with a gold bloom coming up under it. Only
 * then does anything type.
 *
 * Scale, translate and opacity are read straight off the scroll MotionValue
 * rather than mirrored into React state, so the growth is a compositor
 * transform with no re-render behind it. The typing below is state, but it
 * only changes when a frame actually differs.
 */
const GROW_END = 0.25

function Demo({ progress }: { progress: MotionValue<number> }) {
  const [frame, setFrame] = useState<Frame>(() => frameAt(0))

  const scale = useTransform(progress, [0, GROW_END], [0.52, 1], { clamp: true })
  const lift = useTransform(progress, [0, GROW_END], [110, 0], { clamp: true })
  const settle = useTransform(progress, [0, GROW_END * 0.7], [0.35, 1], { clamp: true })
  const bloom = useTransform(progress, [GROW_END * 0.45, GROW_END], [0, 1], { clamp: true })

  useMotionValueEvent(progress, 'change', (v) => {
    // Typing occupies the remaining scroll once the editor has landed.
    const next = frameAt((v - GROW_END) / (1 - GROW_END))
    setFrame((prev) => (same(prev, next) ? prev : next))
  })

  const stage = stageAt(frame.stage)
  const typedText = stage.typed.slice(0, frame.typed)
  const typing = frame.ghost === 0

  return (
    <div className="mx-auto w-full max-w-[min(64rem,72vw)] px-6">
      <div className="text-center">
        <h2 className="l-display text-[clamp(1.75rem,3.4vw,2.75rem)]">{GHOST.heading}</h2>
        <p className="l-prose mx-auto mt-4 text-[1.0625rem] text-ink/80">{GHOST.body}</p>
      </div>

      <motion.div
        className="relative mt-10"
        style={{ scale, y: lift, opacity: settle, transformOrigin: 'center top' }}
      >
        {/* gold bloom, arriving as the editor lands */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-10 rounded-[36px]"
          style={{
            opacity: bloom,
            background:
              'radial-gradient(closest-side, rgba(232,201,95,0.3), rgba(201,162,39,0.1) 55%, rgba(201,162,39,0) 100%)',
          }}
        />
        <EditorMock className="l-raise-lg" bare>
          <p className="min-h-[7em] text-[1.0625rem]">
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
      </motion.div>

      <div className="mt-6 flex flex-col items-center gap-5">
        <div className="flex items-center gap-3">
          <Keycap size="sm" pressed={frame.tab}>
            Tab
          </Keycap>
          <span className="l-meta text-meta">
            {frame.inked ? 'accepted' : frame.ghost > 0 ? 'to accept' : 'keep typing'}
          </span>
        </div>

        {/* Position, without a counter reading like file metadata. */}
        <div
          className="flex items-center gap-2"
          role="status"
          aria-label={`Sentence ${frame.stage + 1} of ${N}`}
        >
          {STAGES.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === frame.stage ? 20 : 6,
                background: i === frame.stage ? '#2B3A67' : '#E4E1D2',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function GhostDemo() {
  return (
    <Pin id="ghost" vh={4.5} innerClassName="pt-20">
      {(p) => <Demo progress={p} />}
    </Pin>
  )
}
