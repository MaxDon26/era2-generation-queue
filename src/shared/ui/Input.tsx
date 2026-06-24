import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>
  /** Радиус: 'control' (14px) обычный · 'full' (pill) для поиска. */
  rounded?: 'control' | 'full'
  /** Иконка слева (напр. лупа). При наличии — задайте `aria-label`, т.к. нет видимого label. */
  startIcon?: ReactNode
}

export function Input({ ref, rounded = 'control', startIcon, className, ...props }: InputProps) {
  const field = (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full border border-border bg-transparent px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50',
        rounded === 'full' ? 'rounded-full' : 'rounded-control',
        startIcon && 'pl-9',
        className,
      )}
      {...props}
    />
  )

  if (!startIcon) return field

  return (
    <div className="relative inline-flex w-full items-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 flex items-center text-muted-foreground"
      >
        {startIcon}
      </span>
      {field}
    </div>
  )
}
