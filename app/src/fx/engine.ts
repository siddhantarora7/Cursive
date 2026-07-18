/**
 * The effects layer: one canvas above the editor, pointer-events: none,
 * its own rAF loop. THE HARD GUARANTEE: the input path only ever pushes a
 * tiny event into a pre-allocated ring buffer — if this loop janks or dies,
 * typing is structurally untouched.
 *
 * Budget: ≤ 2 ms/frame. A rolling frame-cost estimate degrades the system
 * (halve spawn rate → disable) if the budget is blown; the loop fully parks
 * when nothing is alive.
 */

export interface FxFlags {
  sparks: boolean
  streak: boolean
  shake: boolean
}

interface FxEvent {
  type: 0 | 1 // 0 = key, 1 = accept-burst
  x: number
  y: number
}

const POOL = 512
const RING = 64
// particle slots: x, y, vx, vy, life, ttl, size, hue-jitter
const STRIDE = 8

export class FxLayer {
  private ctx: CanvasRenderingContext2D | null
  private p = new Float32Array(POOL * STRIDE)
  private alive = 0
  private ring: FxEvent[] = Array.from({ length: RING }, () => ({ type: 0, x: 0, y: 0 }))
  private ringHead = 0
  private ringTail = 0
  private raf = 0
  private lastT = 0
  private flags: FxFlags = { sparks: true, streak: true, shake: false }
  private combo = 0
  private comboPulse = 0
  private caret = { x: 0, y: 0 }
  private color = { r: 94, g: 200, b: 191 }
  private accent = { r: 94, g: 200, b: 191 }
  private costEma = 0
  private degrade = 0 // 0 none, 1 halved, 2 disabled
  private shakeAmp = 0
  private reduced: MediaQueryList
  private resizeObs: ResizeObserver
  private spawnScale = 1

  constructor(
    private canvas: HTMLCanvasElement,
    /** element that receives the (optional) screen shake */
    private shakeTarget: HTMLElement,
  ) {
    this.ctx = canvas.getContext('2d')
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(canvas.parentElement ?? canvas)
    this.resize()
    document.addEventListener('visibilitychange', this.onVisibility)
    this.readThemeColors()
  }

  setFlags(flags: FxFlags): void {
    this.flags = flags
    if (!flags.shake) this.applyShake(0)
  }

  /** re-read particle colors from CSS variables — call on theme change, never per frame */
  readThemeColors(): void {
    const probe = (v: string) => {
      const el = document.createElement('div')
      el.style.color = `var(${v})`
      el.style.display = 'none'
      document.body.appendChild(el)
      const m = getComputedStyle(el).color.match(/(\d+)[, ]+(\d+)[, ]+(\d+)/)
      el.remove()
      return m ? { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) } : null
    }
    this.color = probe('--c-caret') ?? this.color
    this.accent = probe('--c-accent') ?? this.accent
  }

  /** INPUT PATH — one ring-buffer write, nothing else */
  pushKey(x: number, y: number): void {
    const e = this.ring[this.ringHead]!
    e.type = 0
    e.x = x
    e.y = y
    this.ringHead = (this.ringHead + 1) % RING
    if (this.ringHead === this.ringTail) this.ringTail = (this.ringTail + 1) % RING
    this.wake()
  }

  pushAccept(x: number, y: number): void {
    const e = this.ring[this.ringHead]!
    e.type = 1
    e.x = x
    e.y = y
    this.ringHead = (this.ringHead + 1) % RING
    this.wake()
  }

  setCaret(x: number, y: number): void {
    this.caret.x = x
    this.caret.y = y
  }

  setCombo(level: number): void {
    if (level > this.combo) this.comboPulse = 1
    this.combo = level
    if (level > 0) this.wake()
  }

  private get enabled(): boolean {
    return (
      this.degrade < 2 &&
      !this.reduced.matches &&
      (this.flags.sparks || this.flags.streak || this.flags.shake)
    )
  }

  private wake(): void {
    if (!this.raf && this.enabled && document.visibilityState === 'visible') {
      this.lastT = performance.now()
      this.raf = requestAnimationFrame(this.frame)
    }
  }

  private onVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    } else {
      this.wake()
    }
  }

  private resize(): void {
    const parent = this.canvas.parentElement
    if (!parent) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = parent.clientWidth
    const h = parent.clientHeight
    this.canvas.width = Math.max(1, Math.round(w * dpr))
    this.canvas.height = Math.max(1, Math.round(h * dpr))
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  private spawn(x: number, y: number, count: number, spread: number, accent: boolean): void {
    const n = Math.round(count * this.spawnScale)
    for (let i = 0; i < n && this.alive < POOL; i++) {
      const o = this.alive * STRIDE
      const a = -Math.PI / 2 + (Math.random() - 0.5) * spread
      const speed = 40 + Math.random() * 110
      this.p[o] = x + (Math.random() - 0.5) * 3
      this.p[o + 1] = y
      this.p[o + 2] = Math.cos(a) * speed
      this.p[o + 3] = Math.sin(a) * speed - 20
      this.p[o + 4] = 0
      this.p[o + 5] = 0.3 + Math.random() * 0.35
      this.p[o + 6] = 1 + Math.random() * 1.6
      this.p[o + 7] = accent ? 1 : 0
      this.alive++
    }
  }

  private frame = (t: number): void => {
    this.raf = 0
    const start = performance.now()
    const dt = Math.min(0.05, (t - this.lastT) / 1000)
    this.lastT = t
    const ctx = this.ctx
    if (!ctx || !this.enabled) return

    // drain input events
    while (this.ringTail !== this.ringHead) {
      const e = this.ring[this.ringTail]!
      this.ringTail = (this.ringTail + 1) % RING
      if (e.type === 0) {
        if (this.flags.sparks) this.spawn(e.x, e.y, 3 + this.combo * 2, 1.6, false)
        if (this.flags.shake && this.combo >= 2) this.shakeAmp = Math.min(2.5, this.shakeAmp + 0.8)
      } else if (this.flags.sparks) {
        this.spawn(e.x, e.y, 22, Math.PI * 1.4, true)
      }
    }

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.globalCompositeOperation = 'lighter'

    // streak glow under the caret
    if (this.flags.streak && this.combo > 0) {
      this.comboPulse = Math.max(0, this.comboPulse - dt * 2)
      const base = [0, 0.05, 0.09, 0.14][this.combo]! + this.comboPulse * 0.06
      const radius = 60 + this.combo * 30
      const g = ctx.createRadialGradient(
        this.caret.x, this.caret.y, 0,
        this.caret.x, this.caret.y, radius,
      )
      const { r, g: gg, b } = this.accent
      g.addColorStop(0, `rgba(${r},${gg},${b},${base})`)
      g.addColorStop(1, `rgba(${r},${gg},${b},0)`)
      ctx.fillStyle = g
      ctx.fillRect(this.caret.x - radius, this.caret.y - radius, radius * 2, radius * 2)
    }

    // particles
    const { r, g: gg, b } = this.color
    const { r: ar, g: ag, b: ab } = this.accent
    let i = 0
    while (i < this.alive) {
      const o = i * STRIDE
      this.p[o + 4] = this.p[o + 4]! + dt
      if (this.p[o + 4]! >= this.p[o + 5]!) {
        // swap-remove
        this.alive--
        const last = this.alive * STRIDE
        for (let k = 0; k < STRIDE; k++) this.p[o + k] = this.p[last + k]!
        continue
      }
      this.p[o + 3] = this.p[o + 3]! + 320 * dt // gravity
      this.p[o] = this.p[o]! + this.p[o + 2]! * dt
      this.p[o + 1] = this.p[o + 1]! + this.p[o + 3]! * dt
      const k = 1 - this.p[o + 4]! / this.p[o + 5]!
      const accent = this.p[o + 7]! > 0.5
      ctx.fillStyle = accent
        ? `rgba(${ar},${ag},${ab},${0.8 * k})`
        : `rgba(${r},${gg},${b},${0.7 * k})`
      const size = this.p[o + 6]! * (0.5 + k * 0.5)
      ctx.fillRect(this.p[o]! - size / 2, this.p[o + 1]! - size / 2, size, size)
      i++
    }
    ctx.globalCompositeOperation = 'source-over'

    // shake decay
    if (this.shakeAmp > 0.05) {
      this.applyShake(this.shakeAmp)
      this.shakeAmp *= Math.pow(0.001, dt)
    } else if (this.shakeAmp !== 0) {
      this.shakeAmp = 0
      this.applyShake(0)
    }

    // self-degradation: budget is 2ms; blow p~95 of 8ms and we back off
    const cost = performance.now() - start
    this.costEma = this.costEma * 0.95 + cost * 0.05
    if (this.costEma > 8) {
      this.degrade++
      this.spawnScale = this.degrade >= 1 ? 0.5 : 1
      this.costEma = 0
      if (this.degrade >= 2) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.applyShake(0)
        return // parked for good
      }
    }

    const active = this.alive > 0 || this.combo > 0 || this.shakeAmp > 0
    if (active) this.raf = requestAnimationFrame(this.frame)
  }

  private applyShake(amp: number): void {
    this.shakeTarget.style.transform = amp
      ? `translate(${(Math.random() - 0.5) * amp}px, ${(Math.random() - 0.5) * amp}px)`
      : ''
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    this.resizeObs.disconnect()
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.applyShake(0)
  }
}
