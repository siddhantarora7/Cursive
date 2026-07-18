import { Editor } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Placeholder } from '@tiptap/extensions'
import { GhostText, type GhostTextOptions } from './extensions/ghost-text'
import type { PMJson } from '../store/db'

export interface CreateEditorOptions {
  element: HTMLElement
  content: PMJson | null
  spellcheck: boolean
  ghost: GhostTextOptions
  onUpdate: (editor: Editor) => void
  onSelectionUpdate: (editor: Editor) => void
  onTransaction: (editor: Editor, transaction: Transaction) => void
}

/**
 * Vanilla TipTap editor — deliberately not @tiptap/react. React chrome
 * subscribes to editor events; nothing framework-shaped sits between a
 * keystroke and the document.
 */
export function createCursiveEditor(opts: CreateEditorOptions): Editor {
  return new Editor({
    element: opts.element,
    content: opts.content,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
        heading: { levels: [1, 2, 3] },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start typing…' }),
      GhostText.configure(opts.ghost),
    ],
    editorProps: {
      attributes: {
        class: 'cursive-editor',
        spellcheck: opts.spellcheck ? 'true' : 'false',
      },
    },
    onUpdate: ({ editor }) => opts.onUpdate(editor),
    onSelectionUpdate: ({ editor }) => opts.onSelectionUpdate(editor),
    onTransaction: ({ editor, transaction }) => opts.onTransaction(editor, transaction),
  })
}

/** Plain text before the caret, blocks separated by newlines. */
export function textBeforeCaret(editor: Editor): string {
  const { state } = editor
  return state.doc.textBetween(0, state.selection.head, '\n', '\n')
}

/** True when the caret sits inside a code block (no suggestions there). */
export function caretInCodeBlock(editor: Editor): boolean {
  const { $head } = editor.state.selection
  for (let d = $head.depth; d > 0; d--) {
    if ($head.node(d).type.name === 'codeBlock') return true
  }
  return false
}

/** First-line-derived title for the docs list. */
export function deriveTitle(editor: Editor): string {
  const first = editor.state.doc.firstChild
  const text = first?.textContent.trim() ?? ''
  return text.slice(0, 80) || 'Untitled'
}
