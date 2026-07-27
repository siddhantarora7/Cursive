import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/*
 * Tracks whether any pinned section currently owns the viewport.
 *
 * The sticky nav subscribes to this: while a pin is engaged it shrinks and
 * dims so it stops competing with a section that is deliberately holding the
 * screen. Without this the pill sits on top of the pinned content for three
 * full viewports at a time.
 */

type PinCtx = {
  engaged: boolean
  report: (id: string, engaged: boolean) => void
}

const Ctx = createContext<PinCtx>({ engaged: false, report: () => {} })

export function PinProvider({ children }: { children: ReactNode }) {
  const active = useRef<Set<string>>(new Set())
  const [engaged, setEngaged] = useState(false)

  const report = useCallback((id: string, on: boolean) => {
    const set = active.current
    const had = set.has(id)
    if (on === had) return
    if (on) set.add(id)
    else set.delete(id)
    setEngaged(set.size > 0)
  }, [])

  const value = useMemo(() => ({ engaged, report }), [engaged, report])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const usePinEngaged = () => useContext(Ctx).engaged
export const usePinReport = () => useContext(Ctx).report
