import type { ReactNode } from 'react'

/*
 * Texture buttons. The look comes from three stacked layers rather than a flat
 * fill: a 1px gradient rim, an inner gradient face, and an inset top highlight.
 * That is what reads as a physical, lit object instead of a coloured rectangle.
 *
 * Renders an <a> when `href` is given and a <button> otherwise, so the hero CTA
 * is a real link (middle-clickable, right-clickable, crawlable) rather than a
 * div with a click handler.
 */

type Variant = 'primary' | 'secondary' | 'minimal'
type Size = 'sm' | 'md' | 'lg'

const RIM: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-[#4a5a87] to-[#1b2647]',
  secondary: 'bg-gradient-to-b from-[#efebd8] to-[#d9d5c2]',
  minimal: 'bg-transparent',
}

const FACE: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-[#3c4d7d] to-[#2b3a67] text-cream ' +
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.18),inset_0_-1px_0_rgb(0_0_0/0.15)] ' +
    'group-hover:from-[#455688] group-hover:to-[#31416f]',
  secondary:
    'bg-gradient-to-b from-[#fffef9] to-[#f4f1e2] text-ink ' +
    'shadow-[inset_0_1px_0_rgb(255_255_255/0.9),inset_0_-1px_0_rgb(120_104_60/0.08)] ' +
    'group-hover:from-white group-hover:to-[#f8f5e8]',
  minimal:
    'bg-transparent text-ink shadow-none group-hover:bg-[rgb(80_68_30/0.05)]',
}

const OUTER: Record<Variant, string> = {
  primary:
    'shadow-[0_1px_2px_rgb(28_38_71/0.2),0_6px_14px_-4px_rgb(28_38_71/0.32)] ' +
    'hover:shadow-[0_2px_4px_rgb(28_38_71/0.22),0_10px_22px_-6px_rgb(28_38_71/0.4)]',
  secondary:
    'shadow-[0_1px_2px_rgb(80_68_30/0.06),0_5px_12px_-4px_rgb(80_68_30/0.14)] ' +
    'hover:shadow-[0_2px_4px_rgb(80_68_30/0.08),0_9px_20px_-6px_rgb(80_68_30/0.2)]',
  minimal: 'shadow-none',
}

const PAD: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-[0.8125rem]',
  md: 'px-5 py-2.5 text-[0.9375rem]',
  lg: 'px-7 py-3.5 text-base',
}

type Props = {
  children: ReactNode
  variant?: Variant
  size?: Size
  href?: string
  onClick?: () => void
  className?: string
  'aria-label'?: string
}

export function TextureButton({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  className = '',
  ...rest
}: Props) {
  const shell =
    `group relative inline-flex rounded-[11px] p-px no-underline l-press ` +
    `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ` +
    `${RIM[variant]} ${OUTER[variant]} ${className}`

  const face =
    `inline-flex w-full items-center justify-center gap-2 rounded-[10px] ` +
    `font-body font-medium leading-none transition-colors duration-150 ` +
    `${FACE[variant]} ${PAD[size]}`

  const inner = <span className={face}>{children}</span>

  if (href) {
    return (
      <a href={href} className={shell} {...rest}>
        {inner}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={shell} {...rest}>
      {inner}
    </button>
  )
}
