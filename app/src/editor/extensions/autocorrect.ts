import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { correctWord } from '../../core/autocorrect/correct'
import type { Dictionary } from '../../core/autocorrect/dictionary'

/**
 * Phone-keyboard-style autocorrect at the word boundary:
 *  - typing a delimiter (space/punctuation) after a misspelled word replaces
 *    it (one undo step: correction + delimiter together)
 *  - the corrected word flashes briefly so the change is never silent
 *  - Backspace immediately after a correction reverts to what was typed and
 *    adds the word to a session ignore list (never re-corrected)
 *  - skipped inside code blocks / code marks and during IME composition
 */

interface AcState {
  /** revert info for the most recent correction; null once anything else happens */
  last: {
    caret: number // position right after the inserted delimiter
    wordFrom: number
    corrected: string
    original: string
    delim: string
  } | null
  flash: { from: number; to: number } | null
}

type AcMeta =
  | { type: 'corrected'; last: NonNullable<AcState['last']>; flash: NonNullable<AcState['flash']> }
  | { type: 'reverted' }
  | { type: 'flash-done' }

const acKey = new PluginKey<AcState>('autocorrect')
const DELIMITER = /^[ .,;:!?)\]}]$/

function applyAc(tr: Transaction, prev: AcState): AcState {
  const meta = tr.getMeta(acKey) as AcMeta | undefined
  if (meta) {
    if (meta.type === 'corrected') return { last: meta.last, flash: meta.flash }
    if (meta.type === 'reverted') return { last: null, flash: null }
    return { ...prev, flash: null }
  }
  if (!tr.docChanged && !tr.selectionSet) return prev
  // any other edit or caret move ends the revert window; flash just remaps
  let flash = prev.flash
  if (flash && tr.docChanged) {
    const from = tr.mapping.map(flash.from)
    const to = tr.mapping.map(flash.to)
    flash = from < to ? { from, to } : null
  }
  return { last: null, flash }
}

export interface AutocorrectOptions {
  isEnabled: () => boolean
  getDictionary: () => Dictionary | null
}

export const Autocorrect = Extension.create<AutocorrectOptions>({
  name: 'autocorrect',

  addOptions() {
    return { isEnabled: () => false, getDictionary: () => null }
  },

  addStorage() {
    return { ignore: new Set<string>() }
  },

  addProseMirrorPlugins() {
    const ext = this

    return [
      new Plugin<AcState>({
        key: acKey,
        state: { init: () => ({ last: null, flash: null }), apply: applyAc },
        props: {
          decorations(state) {
            const s = acKey.getState(state)
            if (!s?.flash) return DecorationSet.empty
            return DecorationSet.create(state.doc, [
              Decoration.inline(s.flash.from, s.flash.to, { class: 'autocorrect-flash' }),
            ])
          },

          handleTextInput(view, from, to, text) {
            if (from !== to || !DELIMITER.test(text)) return false
            if (view.composing) return false
            if (!ext.options.isEnabled()) return false
            const dict = ext.options.getDictionary()
            if (!dict) return false

            const $from = view.state.doc.resolve(from)
            if ($from.parent.type.spec.code) return false
            const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼')
            const m = textBefore.match(/[A-Za-z]+$/)
            if (!m) return false
            const word = m[0]
            const ignore = (ext.storage as { ignore: Set<string> }).ignore
            if (ignore.has(word.toLowerCase())) return false

            const wordFrom = from - word.length
            const codeMark = view.state.schema.marks.code
            if (codeMark && view.state.doc.rangeHasMark(wordFrom, from, codeMark)) return false

            const corrected = correctWord(word, dict)
            if (corrected === null) return false

            const tr = view.state.tr.insertText(corrected + text, wordFrom, from)
            const caret = wordFrom + corrected.length + text.length
            tr.setMeta(acKey, {
              type: 'corrected',
              last: { caret, wordFrom, corrected, original: word, delim: text },
              flash: { from: wordFrom, to: wordFrom + corrected.length },
            } satisfies AcMeta)
            view.dispatch(tr)

            window.setTimeout(() => {
              if (acKey.getState(view.state)?.flash) {
                const doneTr = view.state.tr.setMeta(acKey, { type: 'flash-done' } satisfies AcMeta)
                doneTr.setMeta('addToHistory', false)
                view.dispatch(doneTr)
              }
            }, 700)
            return true
          },
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const state = this.editor.state
        const s = acKey.getState(state)
        if (!s?.last || !state.selection.empty || state.selection.head !== s.last.caret) {
          return false
        }
        const { wordFrom, corrected, original, delim } = s.last
        ;(this.storage as { ignore: Set<string> }).ignore.add(original.toLowerCase())
        return this.editor.commands.command(({ tr, dispatch }) => {
          if (dispatch) {
            tr.insertText(original + delim, wordFrom, wordFrom + corrected.length + delim.length)
            tr.setMeta(acKey, { type: 'reverted' } satisfies AcMeta)
          }
          return true
        })
      },
    }
  },
})
