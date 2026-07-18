import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

/** Find & replace. Matches highlight via inline decorations; plain-text matches within text nodes. */

export interface FindState {
  query: string
  matches: Array<{ from: number; to: number }>
  active: number // index into matches, -1 when none
}

const EMPTY: FindState = { query: '', matches: [], active: -1 }

export const findKey = new PluginKey<FindState>('find')

type FindMeta = { type: 'set'; query: string } | { type: 'active'; active: number } | { type: 'clear' }

function scan(doc: PMNode, query: string): Array<{ from: number; to: number }> {
  if (!query) return []
  const q = query.toLowerCase()
  const out: Array<{ from: number; to: number }> = []
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = node.text.toLowerCase()
    let idx = text.indexOf(q)
    while (idx !== -1 && out.length < 2000) {
      out.push({ from: pos + idx, to: pos + idx + q.length })
      idx = text.indexOf(q, idx + q.length)
    }
  })
  return out
}

function applyFind(tr: Transaction, prev: FindState): FindState {
  const meta = tr.getMeta(findKey) as FindMeta | undefined
  if (meta) {
    if (meta.type === 'clear') return EMPTY
    if (meta.type === 'set') {
      const matches = scan(tr.doc, meta.query)
      return { query: meta.query, matches, active: matches.length ? 0 : -1 }
    }
    return { ...prev, active: meta.active }
  }
  if (!tr.docChanged || !prev.query) return prev
  const matches = scan(tr.doc, prev.query)
  return {
    query: prev.query,
    matches,
    active: matches.length ? Math.min(Math.max(prev.active, 0), matches.length - 1) : -1,
  }
}

export const Find = Extension.create({
  name: 'find',

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: { init: () => EMPTY, apply: applyFind },
        props: {
          decorations(state: EditorState) {
            const f = findKey.getState(state)
            if (!f || !f.matches.length) return DecorationSet.empty
            return DecorationSet.create(
              state.doc,
              f.matches.map((m, i) =>
                Decoration.inline(m.from, m.to, {
                  class: i === f.active ? 'find-match find-match-active' : 'find-match',
                }),
              ),
            )
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      setFindQuery:
        (query: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findKey, { type: 'set', query } satisfies FindMeta)
            tr.setMeta('addToHistory', false)
          }
          return true
        },
      clearFind:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findKey, { type: 'clear' } satisfies FindMeta)
            tr.setMeta('addToHistory', false)
          }
          return true
        },
      findStep:
        (dir: 1 | -1) =>
        ({ state, tr, dispatch, view }) => {
          const f = findKey.getState(state)
          if (!f || !f.matches.length) return false
          const active = (f.active + dir + f.matches.length) % f.matches.length
          if (dispatch) {
            const m = f.matches[active]!
            tr.setMeta(findKey, { type: 'active', active } satisfies FindMeta)
            tr.setMeta('addToHistory', false)
            tr.setSelection(TextSelection.create(tr.doc, m.from, m.to))
            tr.scrollIntoView()
            view?.focus()
          }
          return true
        },
      replaceActive:
        (replacement: string) =>
        ({ state, tr, dispatch }) => {
          const f = findKey.getState(state)
          if (!f || f.active < 0) return false
          const m = f.matches[f.active]
          if (!m) return false
          if (dispatch) tr.insertText(replacement, m.from, m.to)
          return true
        },
      replaceAll:
        (replacement: string) =>
        ({ state, tr, dispatch }) => {
          const f = findKey.getState(state)
          if (!f || !f.matches.length) return false
          if (dispatch) {
            for (const m of [...f.matches].reverse()) {
              tr.insertText(replacement, m.from, m.to)
            }
          }
          return true
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    find: {
      setFindQuery: (query: string) => ReturnType
      clearFind: () => ReturnType
      findStep: (dir: 1 | -1) => ReturnType
      replaceActive: (replacement: string) => ReturnType
      replaceAll: (replacement: string) => ReturnType
    }
  }
}
