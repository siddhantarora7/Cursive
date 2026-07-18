import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/core'

/**
 * Re-render chrome when the editor changes — throttled to animation frames so
 * fast typing coalesces into at most one React render per frame, and React
 * never sits on the keystroke path itself.
 */
export function useEditorTick(editor: Editor | null): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!editor) return
    let raf = 0
    const bump = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setTick((t) => t + 1)
      })
    }
    editor.on('transaction', bump)
    editor.on('focus', bump)
    editor.on('blur', bump)
    return () => {
      cancelAnimationFrame(raf)
      editor.off('transaction', bump)
      editor.off('focus', bump)
      editor.off('blur', bump)
    }
  }, [editor])
  return tick
}
