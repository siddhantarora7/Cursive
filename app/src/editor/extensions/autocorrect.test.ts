// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { parseDictionary } from '../../core/autocorrect/dictionary'
import { Autocorrect } from './autocorrect'

const dict = parseDictionary(['the', 'was', 'what', 'hello', 'world'].join('\n'))

let editor: Editor
let enabled: boolean

/** Simulate real typing of one character through the view's input path. */
function typeChar(ch: string): void {
  const view = editor.view
  const pos = editor.state.selection.head
  const deflt = () => view.state.tr.insertText(ch, pos, pos)
  const handled = view.someProp('handleTextInput', (f) => f(view, pos, pos, ch, deflt))
  if (!handled) {
    view.dispatch(deflt())
  }
}

function typeText(text: string): void {
  for (const ch of text) typeChar(ch)
}

beforeEach(() => {
  enabled = true
  editor = new Editor({
    element: document.createElement('div'),
    content: '<p></p>',
    extensions: [
      StarterKit,
      Autocorrect.configure({
        isEnabled: () => enabled,
        getDictionary: () => dict,
      }),
    ],
  })
  editor.commands.focus('end')
})

describe('autocorrect extension', () => {
  it('corrects a misspelled word when the delimiter lands', () => {
    typeText('waht ')
    expect(editor.getText()).toBe('what ')
  })

  it('corrects before punctuation too', () => {
    typeText('teh.')
    expect(editor.getText()).toBe('the.')
  })

  it('leaves valid words alone', () => {
    typeText('hello world ')
    expect(editor.getText()).toBe('hello world ')
  })

  it('undo never leaves a half-applied correction', () => {
    typeText('waht ')
    editor.commands.undo()
    // PM history groups the typing burst + correction into one event:
    // one undo returns to a clean slate, never to a mangled middle state
    expect(editor.getText()).toBe('')
    editor.commands.redo()
    expect(editor.getText()).toBe('what ')
  })

  it('Backspace right after a correction reverts and ignores the word from then on', () => {
    typeText('waht ')
    expect(editor.getText()).toBe('what ')
    editor.view.dispatch(editor.state.tr) // no-op tr must not break the revert window
    const handled = editor.commands.keyboardShortcut('Backspace')
    expect(handled).toBe(true)
    expect(editor.getText()).toBe('waht ')
    typeText('waht ')
    expect(editor.getText()).toBe('waht waht ') // ignored now
  })

  it('does nothing when disabled', () => {
    enabled = false
    typeText('waht ')
    expect(editor.getText()).toBe('waht ')
  })

  it('skips code blocks', () => {
    editor.commands.setCodeBlock()
    typeText('waht ')
    expect(editor.getText().trimEnd()).toBe('waht') // TrailingNode adds an empty paragraph
  })
})
