import type { ReactNode } from 'react'

/*
 * A physical keycap.
 *
 * The reference art for this sits on cool blue-grey, where symmetrical cool
 * shadows read as soft plastic. Pasted onto cream those same values read as
 * grime, so `.l-keycap` in landing.css re-lights the object: a warm shadow
 * ramp, a cream top highlight instead of a white one, and a warm inner edge.
 * Same object, correct light for the surface it is actually sitting on.
 *
 * `pressed` is driven by whatever owns the moment (a scroll position, a demo
 * timer), so the key depresses at the instant the suggestion is accepted
 * rather than on an unrelated loop.
 */

type Props = {
  children: ReactNode
  pressed?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'min-w-[2.25rem] px-2 py-1.5 text-[0.6875rem] rounded-[7px]',
  md: 'min-w-[3rem] px-3 py-2 text-sm rounded-[9px]',
  lg: 'min-w-[5.5rem] px-5 py-4 text-xl rounded-[14px]',
}

export function Keycap({ children, pressed = false, size = 'md', className = '' }: Props) {
  return (
    <span
      data-pressed={pressed}
      className={`l-keycap inline-flex select-none items-center justify-center border border-[#e6e2d0] font-mono font-medium text-ink ${SIZE[size]} ${className}`}
    >
      {children}
    </span>
  )
}
