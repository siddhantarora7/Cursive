/**
 * Typing sound packs — fully synthesized (no assets, no licensing), OFF by
 * default. AudioContext is created lazily on the first keystroke after
 * enabling (autoplay policy) and suspended when the pack is off.
 */

export type SoundPack = 'off' | 'thock' | 'typewriter' | 'pop'
type KeyKind = 'key' | 'space' | 'return'

const MIN_GAP_MS = 14

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private pack: SoundPack = 'off'
  private volume = 0.6
  private lastPlay = 0

  configure(pack: SoundPack, volume: number): void {
    this.pack = pack
    this.volume = volume
    if (this.master) this.master.gain.value = volume * 0.5
    if (pack === 'off') void this.ctx?.suspend()
    else void this.ctx?.resume()
  }

  play(kind: KeyKind): void {
    if (this.pack === 'off') return
    const now = performance.now()
    if (now - this.lastPlay < MIN_GAP_MS) return
    this.lastPlay = now
    const ctx = this.ensureCtx()
    if (!ctx || ctx.state !== 'running') {
      void ctx?.resume()
      return
    }
    switch (this.pack) {
      case 'thock':
        this.thock(ctx, kind)
        break
      case 'typewriter':
        this.typewriter(ctx, kind)
        break
      case 'pop':
        this.pop(ctx, kind)
        break
    }
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = new AudioContext()
    } catch {
      return null
    }
    this.master = this.ctx.createGain()
    this.master.gain.value = this.volume * 0.5
    this.master.connect(this.ctx.destination)
    const len = Math.floor(this.ctx.sampleRate * 0.08)
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return this.ctx
  }

  private burst(
    ctx: AudioContext,
    filterType: BiquadFilterType,
    freq: number,
    dur: number,
    gain: number,
  ): void {
    if (!this.noise || !this.master) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.value = freq
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(filter).connect(g).connect(this.master)
    src.start(t)
    src.stop(t + dur)
  }

  private tone(ctx: AudioContext, freq: number, dur: number, gain: number, type: OscillatorType = 'sine'): void {
    if (!this.master) return
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + dur)
  }

  /** deep mechanical: lowpassed noise + a low thump */
  private thock(ctx: AudioContext, kind: KeyKind): void {
    const deep = kind !== 'key'
    this.burst(ctx, 'lowpass', deep ? 620 : 850 + Math.random() * 200, 0.055, 0.5)
    this.tone(ctx, (deep ? 85 : 105) + Math.random() * 25, 0.07, 0.35)
  }

  /** sharp click, ding-adjacent on return */
  private typewriter(ctx: AudioContext, kind: KeyKind): void {
    this.burst(ctx, 'highpass', 2400, 0.03, 0.4)
    this.burst(ctx, 'bandpass', 1200, 0.045, 0.25)
    if (kind === 'return') this.tone(ctx, 1180, 0.4, 0.12, 'triangle')
  }

  /** soft round blip */
  private pop(ctx: AudioContext, kind: KeyKind): void {
    const f = kind === 'space' ? 260 : 330 + Math.random() * 220
    this.tone(ctx, f, 0.05, 0.3)
  }

  destroy(): void {
    void this.ctx?.close()
    this.ctx = null
  }
}
