// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { GhostText, getGhostRemainder } from './ghost-text'

let editor: Editor
let accepted: Array<{ text: string; mode: string }>
let dismissed: number

function makeEditor(): Editor {
  return new Editor({
    element: document.createElement('div'),
    content: '<p>Hello world</p>',
    extensions: [
      StarterKit,
      GhostText.configure({
        onAccept: (text, mode) => accepted.push({ text, mode }),
        onDismiss: () => dismissed++,
      }),
    ],
  })
}

function caretToEnd(): number {
  const end = editor.state.doc.content.size - 1
  editor.commands.setTextSelection(end)
  return editor.state.selection.head
}

beforeEach(() => {
  accepted = []
  dismissed = 0
  editor = makeEditor()
})

describe('ghost text plugin', () => {
  it('shows a ghost without touching the document', () => {
    caretToEnd()
    const before = editor.state.doc.toJSON()
    editor.commands.setGhostText(' and beyond')
    expect(getGhostRemainder(editor.state)).toBe(' and beyond')
    expect(editor.state.doc.toJSON()).toEqual(before)
    expect(editor.getText()).toBe('Hello world') // never in text/count/export
  })

  it('Tab accepts the whole suggestion as one undo step', () => {
    caretToEnd()
    editor.commands.setGhostText(' and beyond')
    editor.commands.acceptGhostText('all')
    expect(editor.getText()).toBe('Hello world and beyond')
    expect(getGhostRemainder(editor.state)).toBeNull()
    expect(accepted).toEqual([{ text: ' and beyond', mode: 'all' }])
    editor.commands.undo()
    expect(editor.getText()).toBe('Hello world')
    expect(getGhostRemainder(editor.state)).toBeNull()
  })

  it('accept-word inserts one word and keeps the rest as ghost', () => {
    caretToEnd()
    editor.commands.setGhostText(' and then some')
    editor.commands.acceptGhostText('word')
    expect(editor.getText()).toBe('Hello world and')
    expect(getGhostRemainder(editor.state)).toBe(' then some')
  })

  it('consume-and-advance: typing the matching char keeps the ghost', () => {
    const pos = caretToEnd()
    editor.commands.setGhostText(' and')
    editor.commands.insertContentAt(pos, ' ')
    expect(getGhostRemainder(editor.state)).toBe('and')
    editor.commands.insertContentAt(pos + 1, 'a')
    expect(getGhostRemainder(editor.state)).toBe('nd')
  })

  it('typing a non-matching char clears the ghost', () => {
    const pos = caretToEnd()
    editor.commands.setGhostText(' and')
    editor.commands.insertContentAt(pos, 'x')
    expect(getGhostRemainder(editor.state)).toBeNull()
  })

  it('typing the entire suggestion through clears it', () => {
    const pos = caretToEnd()
    editor.commands.setGhostText(' ok')
    editor.commands.insertContentAt(pos, ' ok')
    expect(getGhostRemainder(editor.state)).toBeNull()
  })

  it('moving the selection clears the ghost', () => {
    caretToEnd()
    editor.commands.setGhostText(' and beyond')
    editor.commands.setTextSelection(2)
    expect(getGhostRemainder(editor.state)).toBeNull()
  })

  it('undo after accept does not resurrect ghost content into the doc', () => {
    caretToEnd()
    editor.commands.setGhostText(' one')
    editor.commands.acceptGhostText('all')
    caretToEnd()
    editor.commands.setGhostText(' two')
    editor.commands.acceptGhostText('all')
    expect(editor.getText()).toBe('Hello world one two')
    editor.commands.undo()
    expect(editor.getText()).toBe('Hello world one')
    editor.commands.undo()
    expect(editor.getText()).toBe('Hello world')
  })

  it('set/clear ghost transactions do not pollute undo history', () => {
    caretToEnd()
    editor.commands.setGhostText(' noise')
    editor.commands.clearGhostText()
    editor.commands.setGhostText(' more noise')
    editor.commands.clearGhostText()
    editor.commands.undo() // nothing to undo — history untouched
    expect(editor.getText()).toBe('Hello world')
  })
})
