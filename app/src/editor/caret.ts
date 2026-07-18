import type { EditorView } from '@tiptap/pm/view'

/**
 * The smooth caret: a single GPU-composited element lerped toward the real
 * caret position (Monkeytype-style). The rAF loop parks when the caret is
 * settled; it never does layout work beyond one coordsAtPos read per change.
 * Also publishes caret geometry for other consumers (FX layer, demo captions).
 */

export interface CaretGeometry {
  x: number
  y: number
  height: number
}

type GeometryListener = (g: CaretGeometry) => void

export interface SmoothCaretConfig {
  /** 0 = instant, 1 = very floaty. prefers-reduced-motion forces 0. */
  smoothing: number
  blink: boolean
}

export class SmoothCaret {
  private el: HTMLDivElement
  private raf = 0
  private cur: CaretGeometry | null = null
  private target: CaretGeometry | null = null
  private visible = false
  private idleTimer = 0
  private listeners = new Set<GeometryListener>()
  private reducedMotion: MediaQueryList

  constructor(
    private container: HTMLElement, // the scroll container (position: relative)
    private view: EditorView,
    private config: SmoothCaretConfig,
  ) {
    this.el = document.createElement('div')
    this.el.className = 'smooth-caret hidden'
    container.appendChild(this.el)
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    container.addEventListener('scroll', this.update, { passive: true })
  }

  setConfig(config: SmoothCaretConfig): void {
    this.config = config
  }

  onGeometry(fn: GeometryListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /** Call on every transaction / selection change / focus change. */
  update = (): void => {
    const { state } = this.view
    if (!this.view.hasFocus() || !state.selection.empty) {
      this.hide()
      return
    }
    let coords: { left: number; top: number; bottom: number }
    try {
      coords = this.view.coordsAtPos(state.selection.head)
    } catch {
      this.hide()
      return
    }
    const box = this.container.getBoundingClientRect()
    const g: CaretGeometry = {
      x: coords.left - box.left,
      y: coords.top - box.top + this.container.scrollTop,
      height: coords.bottom - coords.top,
    }
    this.target = g
    for (const fn of this.listeners) fn(g)
    if (!this.visible) {
      this.visible = true
      this.el.classList.remove('hidden')
      this.cur = g // appear in place, don't fly in from 0,0
    }
    this.el.classList.remove('blinking')
    window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      if (this.config.blink && !this.reducedMotion.matches) this.el.classList.add('blinking')
    }, 350)
    if (!this.raf) this.raf = requestAnimationFrame(this.frame)
  }

  hide(): void {
    if (!this.visible) return
    this.visible = false
    this.el.classList.add('hidden')
  }

  private frame = (): void => {
    this.raf = 0
    if (!this.target || !this.cur || !this.visible) return
    const smoothing = this.reducedMotion.matches ? 0 : this.config.smoothing
    // exponential approach; factor tuned so 0.5 ≈ pleasantly buttery
    const k = smoothing <= 0 ? 1 : 1 - Math.pow(0.0015, (1 - smoothing * 0.65) / 8)
    this.cur = {
      x: this.cur.x + (this.target.x - this.cur.x) * k,
      y: this.cur.y + (this.target.y - this.cur.y) * k,
      height: this.cur.height + (this.target.height - this.cur.height) * k,
    }
    const settled =
      Math.abs(this.cur.x - this.target.x) < 0.15 &&
      Math.abs(this.cur.y - this.target.y) < 0.15 &&
      Math.abs(this.cur.height - this.target.height) < 0.15
    if (settled) this.cur = { ...this.target }
    this.render()
    if (!settled) this.raf = requestAnimationFrame(this.frame)
  }

  private render(): void {
    if (!this.cur) return
    const style = document.documentElement.dataset.caretStyle ?? 'bar'
    const h = this.cur.height
    let w = 2
    let y = this.cur.y
    let height = h
    if (style === 'block') {
      w = Math.max(7, h * 0.52)
    } else if (style === 'underline') {
      w = Math.max(7, h * 0.52)
      y = this.cur.y + h - 3
      height = 3
    }
    this.el.style.transform = `translate3d(${this.cur.x}px, ${y}px, 0)`
    this.el.style.height = `${height}px`
    this.el.style.width = `${w}px`
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.idleTimer)
    this.container.removeEventListener('scroll', this.update)
    this.el.remove()
    this.listeners.clear()
  }
}
