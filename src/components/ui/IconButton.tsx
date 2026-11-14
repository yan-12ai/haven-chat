import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons have no visible text, so screen readers need a label. */
  label: string
  children: ReactNode
  variant?: 'ghost' | 'solid'
  size?: 'sm' | 'md'
}

export function IconButton({
  label,
  children,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'size-7' : 'size-9',
        variant === 'ghost' && 'text-muted hover:bg-subtle hover:text-ink',
        variant === 'solid' && 'bg-accent text-white hover:bg-accent-hover disabled:hover:bg-accent',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
