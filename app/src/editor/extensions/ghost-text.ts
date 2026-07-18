import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { ReplaceStep } from '@tiptap/pm/transform'
import { closeHistory } from '@tiptap/pm/history'

/**
 * Ghost text as a widget decoration — never document content, so it can never
 * enter undo history, copy/paste, word counts, or persistence.
 *
 * Interaction contract:
 *  - Tab accepts all (single undo step), Mod-ArrowRight accepts one word,
 *    Esc dismisses (both only when a ghost is visible; otherwise keys fall through)
 *  - typing a char that matches the ghost's next char consumes it (the visual
 *    text doesn't move — pixels that were ghost become real)
 *  - any other edit, selection move, or blur clears the ghost
 *  - accepted text briefly fades in via a transient inline decoration
 */

interface GhostState {
  /** full suggestion text (including already-consumed prefix) */
  text: string | null
  consumed: number
  /** doc position where the remaining ghost renders (== caret) */
  pos: number
  fade: { from: number; to: number } | null
}

const EMPTY: GhostState = { text: null, consumed: 0, pos: 0, fade: null }

type GhostMeta =
  | { type: 'set'; text: string; pos: number }
  | { type: 'clear' }
  | { type: 'accepted'; from: number; to: number }
  | { type: 'fade-done' }

export const ghostTextKey = new PluginKey<GhostState>('ghostText')

export function getGhostRemainder(state: EditorState): string | null {
  const g = ghostTextKey.getState(state)
  if (!g || g.text === null || g.consumed >= g.text.length) return null
  return g.text.slice(g.consumed)
}

function applyGhost(tr: Transaction, prev: GhostState): GhostState {
  const meta = tr.getMeta(ghostTextKey) as GhostMeta | undefined
  if (meta) {
    switch (meta.type) {
      case 'set':
        return { text: meta.text, consumed: 0, pos: meta.pos, fade: null }
      case 'clear':
        return { ...EMPTY, fade: mapFade(prev.fade, tr) }
      case 'accepted':
        return { ...EMPTY, fade: { from: meta.from, to: meta.to } }
      case 'fade-done':
        return { ...prev, fade: null }
    }
  }

  const fade = mapFade(prev.fade, tr)

  if (prev.text === null) {
    return fade === prev.fade ? prev : { ...prev, fade }
  }

  if (tr.docChanged) {
    // Consume-and-advance: a single text insertion at the ghost position that
    // matches the ghost's next characters keeps the ghost alive.
    const inserted = singleInsertionAt(tr, prev.pos)
    if (inserted !== null) {
      const remainder = prev.text.slice(prev.consumed)
      if (remainder.startsWith(inserted) && inserted.length < remainder.length) {
        return {
          text: prev.text,
          consumed: prev.consumed + inserted.length,
          pos: prev.pos + inserted.length,
          fade,
        }
      }
      if (remainder === inserted) return { ...EMPTY, fade } // typed the whole thing
    }
    return { ...EMPTY, fade }
  }

  if (tr.selectionSet && tr.selection.head !== prev.pos) {
    return { ...EMPTY, fade }
  }

  return fade === prev.fade ? prev : { ...prev, fade }
}

function mapFade(fade: GhostState['fade'], tr: Transaction): GhostState['fade'] {
  if (!fade || !tr.docChanged) return fade
  const from = tr.mapping.map(fade.from)
  const to = tr.mapping.map(fade.to)
  return from < to ? { from, to } : null
}

/** If tr is exactly one plain-text insertion at `pos`, return the inserted string. */
function singleInsertionAt(tr: Transaction, pos: number): string | null {
  if (tr.steps.length !== 1) return null
  const step = tr.steps[0]
  if (!(step instanceof ReplaceStep)) return null
  if (step.from !== pos || step.to !== pos) return null
  const node = step.slice.content.firstChild
  if (step.slice.content.childCount !== 1 || !node || !node.isText || !node.text) return null
  return node.text
}

function ghostDecorations(state: EditorState): DecorationSet {
  const g = ghostTextKey.getState(state)
  if (!g) return DecorationSet.empty
  const decos: Decoration[] = []
  if (g.text !== null && g.consumed < g.text.length) {
    const remainder = g.text.slice(g.consumed)
    const fresh = g.consumed === 0
    decos.push(
      Decoration.widget(
        g.pos,
        () => {
          const span = document.createElement('span')
          span.className = fresh ? 'ghost-text' : 'ghost-text no-anim'
          span.setAttribute('aria-hidden', 'true')
          span.textContent = remainder
          return span
        },
        { side: 1, key: `ghost:${g.text}:${g.consumed}` },
      ),
    )
  }
  if (g.fade) {
    decos.push(Decoration.inline(g.fade.from, g.fade.to, { class: 'ghost-accepted' }))
  }
  return decos.length ? DecorationSet.create(state.doc, decos) : DecorationSet.empty
}

export interface GhostTextOptions {
  /** called when the user explicitly dismisses (Esc) */
  onDismiss: () => void
  /** called when the user accepts (Tab / Mod-ArrowRight), with the inserted text */
  onAccept: (text: string, mode: 'all' | 'word') => void
}

export const GhostText = Extension.create<GhostTextOptions>({
  name: 'ghostText',

  addOptions() {
    return { onDismiss: () => {}, onAccept: () => {} }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<GhostState>({
        key: ghostTextKey,
        state: {
          init: () => EMPTY,
          apply: applyGhost,
        },
        props: {
          decorations: ghostDecorations,
        },
      }),
    ]
  },

  addCommands() {
    return {
      setGhostText:
        (text: string) =>
        ({ state, dispatch }) => {
          if (!state.selection.empty) return false
          if (dispatch) {
            const tr = state.tr.setMeta(ghostTextKey, {
              type: 'set',
              text,
              pos: state.selection.head,
            } satisfies GhostMeta)
            tr.setMeta('addToHistory', false)
            dispatch(tr)
          }
          return true
        },
      clearGhostText:
        () =>
        ({ state, dispatch }) => {
          const g = ghostTextKey.getState(state)
          if (!g || g.text === null) return false
          if (dispatch) {
            const tr = state.tr.setMeta(ghostTextKey, { type: 'clear' } satisfies GhostMeta)
            tr.setMeta('addToHistory', false)
            dispatch(tr)
          }
          return true
        },
      acceptGhostText:
        (mode: 'all' | 'word' = 'all') =>
        ({ state, tr, dispatch, view }) => {
          const g = ghostTextKey.getState(state)
          if (!g || g.text === null || g.consumed >= g.text.length) return false
          const remainder = g.text.slice(g.consumed)
          let insert = remainder
          if (mode === 'word') {
            const m = remainder.match(/^\s*\S+/)
            if (m && m[0].length < remainder.length) insert = m[0]
          }
          if (dispatch) {
            const from = g.pos
            tr.insertText(insert, from, from)
            closeHistory(tr) // the accept is its own undo step
            if (insert === remainder) {
              tr.setMeta(ghostTextKey, {
                type: 'accepted',
                from,
                to: from + insert.length,
              } satisfies GhostMeta)
              if (view) {
                // remove the fade highlight once the animation has played
                window.setTimeout(() => {
                  const cur = ghostTextKey.getState(view.state)
                  if (cur?.fade) {
                    const doneTr = view.state.tr.setMeta(ghostTextKey, {
                      type: 'fade-done',
                    } satisfies GhostMeta)
                    doneTr.setMeta('addToHistory', false)
                    view.dispatch(doneTr)
                  }
                }, 400)
              }
            } else {
              // partial accept: same transaction re-anchors the ghost past the word
              tr.setMeta(ghostTextKey, {
                type: 'set',
                text: remainder.slice(insert.length),
                pos: from + insert.length,
              } satisfies GhostMeta)
            }
          }
          this.options.onAccept(insert, mode)
          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (getGhostRemainder(this.editor.state) === null) return false
        return this.editor.commands.acceptGhostText('all')
      },
      'Mod-ArrowRight': () => {
        if (getGhostRemainder(this.editor.state) === null) return false
        return this.editor.commands.acceptGhostText('word')
      },
      Escape: () => {
        if (getGhostRemainder(this.editor.state) === null) return false
        const ok = this.editor.commands.clearGhostText()
        if (ok) this.options.onDismiss()
        return ok
      },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ghostText: {
      setGhostText: (text: string) => ReturnType
      clearGhostText: () => ReturnType
      acceptGhostText: (mode?: 'all' | 'word') => ReturnType
    }
  }
}
