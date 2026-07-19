import type { Editor } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import {
  DEFAULT_POLICY,
  SuggestionPolicy,
  type PolicyAction,
  type PolicyEvent,
} from '../core/suggestion/policy'
import { sliceContext } from '../core/text/context'
import { getGhostRemainder } from './extensions/ghost-text'
import { caretInCodeBlock, textBeforeCaret } from './setup'

export type CompletionOutcome =
  | { ok: true; text: string; quota?: { used: number; limit: number } }
  | { ok: false; cause: 'net' | 'rate' }
  | { ok: false; cause: 'cap' }

export type CompletionFn = (req: {
  context: string
  intent: string
  signal: AbortSignal
}) => Promise<CompletionOutcome>

export interface SuggestionControllerOptions {
  complete: CompletionFn
  getIntent: () => string
  /** dictionary check for mid-word tail joins in the quality filter */
  isWord?: (word: string) => boolean
  onQuota?: (quota: { used: number; limit: number }) => void
  onCapExhausted?: () => void
}

const MAX_CONTEXT_CHARS = 1000

/**
 * Glue between the editor, the pure suggestion policy, and the transport.
 * Owns the debounce timer and per-request AbortControllers; every decision
 * lives in core/suggestion/policy.
 */
export class SuggestionController {
  private policy: SuggestionPolicy
  private timer = 0
  private aborters = new Map<number, AbortController>()
  private disposed = false

  constructor(
    private editor: Editor,
    private opts: SuggestionControllerOptions,
  ) {
    this.policy = new SuggestionPolicy(DEFAULT_POLICY, opts.isWord)
    const dom = editor.view.dom
    dom.addEventListener('compositionstart', this.onCompositionStart)
    dom.addEventListener('compositionend', this.onCompositionEnd)
    editor.on('blur', this.onBlur)
  }

  /** Call from the editor's onTransaction. */
  handleTransaction(tr: Transaction): void {
    if (this.disposed) return
    // ghost still alive → this was a set or a consume-advance; nothing to decide
    if (getGhostRemainder(this.editor.state) !== null) return
    if (tr.docChanged) {
      const sel = this.editor.state.selection
      if (!sel.empty || caretInCodeBlock(this.editor)) {
        this.dispatch({ kind: 'moved' })
        return
      }
      const context = sliceContext(textBeforeCaret(this.editor), MAX_CONTEXT_CHARS)
      this.dispatch({ kind: 'typed', context })
    } else if (tr.selectionSet) {
      this.dispatch({ kind: 'moved' })
    }
  }

  notifyAccepted(): void {
    this.dispatch({ kind: 'accepted' })
  }

  notifyDismissed(): void {
    this.dispatch({ kind: 'dismissed' })
  }

  setEnabled(enabled: boolean): void {
    this.dispatch({ kind: 'setEnabled', enabled })
  }

  private onCompositionStart = (): void => {
    this.editor.commands.clearGhostText()
    this.dispatch({ kind: 'compositionStart' })
  }
  private onCompositionEnd = (): void => this.dispatch({ kind: 'compositionEnd' })
  private onBlur = (): void => {
    this.editor.commands.clearGhostText()
    this.dispatch({ kind: 'blur' })
  }

  private dispatch(ev: PolicyEvent): void {
    if (this.disposed) return
    this.run(this.policy.handle(ev, Date.now()))
  }

  private run(actions: PolicyAction[]): void {
    for (const action of actions) {
      switch (action.kind) {
        case 'schedule': {
          window.clearTimeout(this.timer)
          const delay = Math.max(0, action.at - Date.now())
          this.timer = window.setTimeout(() => this.dispatch({ kind: 'tick' }), delay)
          break
        }
        case 'request':
          void this.request(action.id, action.context)
          break
        case 'cancel': {
          this.aborters.get(action.id)?.abort()
          this.aborters.delete(action.id)
          break
        }
        case 'show':
          this.editor.commands.setGhostText(action.text)
          break
        case 'clear':
          this.editor.commands.clearGhostText()
          break
      }
    }
  }

  private async request(id: number, context: string): Promise<void> {
    const aborter = new AbortController()
    this.aborters.set(id, aborter)
    let outcome: CompletionOutcome
    try {
      outcome = await this.opts.complete({
        context,
        intent: this.opts.getIntent(),
        signal: aborter.signal,
      })
    } catch {
      outcome = { ok: false, cause: 'net' }
    }
    this.aborters.delete(id)
    if (this.disposed || aborter.signal.aborted) return
    if (outcome.ok) {
      if (outcome.quota) this.opts.onQuota?.(outcome.quota)
      this.dispatch({ kind: 'response', id, raw: outcome.text })
    } else if (outcome.cause === 'cap') {
      this.opts.onCapExhausted?.()
      this.dispatch({ kind: 'capExhausted', id, resumeAt: nextLocalMidnight() })
    } else {
      this.dispatch({ kind: 'failure', id, cause: outcome.cause })
    }
  }

  dispose(): void {
    this.disposed = true
    window.clearTimeout(this.timer)
    for (const a of this.aborters.values()) a.abort()
    this.aborters.clear()
    const dom = this.editor.view.dom
    dom.removeEventListener('compositionstart', this.onCompositionStart)
    dom.removeEventListener('compositionend', this.onCompositionEnd)
    this.editor.off('blur', this.onBlur)
  }
}

function nextLocalMidnight(): number {
  const d = new Date()
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}
