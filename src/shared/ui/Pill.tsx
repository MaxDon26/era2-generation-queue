import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>
  /** CSS-цвет точки (hex / `var(--token)`). По умолчанию — primary. */
  dotColor?: string
  /** Узел вместо точки (напр. лого модели). */
  leading?: ReactNode
}

export function Pill({ ref, dotColor, leading, className, children, ...props }: PillProps) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 font-mono text-xs text-foreground',
        className,
      )}
      {...props}
    >
      {leading ?? (
        <span
          aria-hidden="true"
          className="size-3.5 rounded-full"
          style={{ background: dotColor ?? 'var(--primary)' }}
        />
      )}
      {children}
    </span>
  )
}
