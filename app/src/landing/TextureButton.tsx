import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Adaptation of the "texture button" pattern (gradient shell + inner surface
 * + inner highlight) for Cursive's landing, without cva/shadcn machinery.
 */

type Variant = 'primary' | 'accent' | 'secondary' | 'minimal'
type Size = 'sm' | 'md' | 'lg'

const SHELL: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-white/20 to-white/5 border border-black/60',
  accent:
    'bg-gradient-to-b from-[oklch(0.85_0.1_188)]/60 to-[oklch(0.5_0.1_188)]/40 border border-[oklch(0.35_0.08_188)]',
  secondary:
    'bg-gradient-to-b from-white/60 to-white/20 border border-black/20',
  minimal: 'border border-transparent',
}

const INNER: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-neutral-800 to-neutral-950 text-neutral-50 shadow-[inset_0_1px_0_oklch(1_0_0/0.18)] hover:from-neutral-700 hover:to-neutral-900',
  accent:
    'bg-gradient-to-b from-[oklch(0.68_0.11_188)] to-[oklch(0.5_0.1_188)] text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.35)] hover:from-[oklch(0.72_0.11_188)] hover:to-[oklch(0.54_0.1_188)]',
  secondary:
    'bg-gradient-to-b from-white to-neutral-200/80 text-neutral-800 shadow-[inset_0_1px_0_white] hover:to-neutral-100',
  minimal:
    'bg-transparent text-neutral-300 hover:bg-white/10 hover:text-white',
}

const SIZES: Record<Size, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-[0.95rem]',
  lg: 'px-8 py-3.5 text-lg',
}

export function TextureButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`group cursor-pointer rounded-[0.8rem] p-[2px] transition-transform duration-150 active:scale-[0.97] ${SHELL[variant]} ${className}`}
      {...rest}
    >
      <span
        className={`flex w-full items-center justify-center gap-2 rounded-[0.68rem] font-medium tracking-tight transition-colors duration-150 ${INNER[variant]} ${SIZES[size]}`}
      >
        {children}
      </span>
    </button>
  )
}
