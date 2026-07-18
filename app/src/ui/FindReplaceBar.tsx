import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { findKey } from '../editor/extensions/find'
import { Icon } from './icons'
import { useEditorTick } from './useEditorTick'

export function FindReplaceBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEditorTick(editor)

  useEffect(() => {
    inputRef.current?.focus()
    return () => {
      editor.commands.clearFind()
    }
  }, [editor])

  useEffect(() => {
    editor.commands.setFindQuery(query)
  }, [editor, query])

  const state = findKey.getState(editor.state)
  const count = state?.matches.length ?? 0
  const active = state && state.active >= 0 ? state.active + 1 : 0

  return (
    <div className="find-bar" role="search">
      <input
        ref={inputRef}
        placeholder="Find"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') editor.commands.findStep(e.shiftKey ? -1 : 1)
          if (e.key === 'Escape') onClose()
        }}
      />
      <span className="find-count">{count ? `${active}/${count}` : query ? '0' : ''}</span>
      <button type="button" className="tb-btn" title="Previous (⇧Enter)" disabled={!count}
        onClick={() => editor.commands.findStep(-1)}>↑</button>
      <button type="button" className="tb-btn" title="Next (Enter)" disabled={!count}
        onClick={() => editor.commands.findStep(1)}>↓</button>
      <input
        placeholder="Replace with"
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      />
      <button type="button" className="btn-small" disabled={!count}
        onClick={() => editor.chain().focus().replaceActive(replacement).run()}>
        Replace
      </button>
      <button type="button" className="btn-small" disabled={!count}
        onClick={() => editor.chain().focus().replaceAll(replacement).run()}>
        All
      </button>
      <button type="button" className="tb-btn" title="Close (Esc)" onClick={onClose}>
        <Icon name="close" size={13} />
      </button>
    </div>
  )
}
