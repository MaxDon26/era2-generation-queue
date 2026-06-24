import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>
  /** Выбран ли чип (single-select фильтр). Отражается в `aria-checked`. */
  active?: boolean
  /** Опциональный счётчик справа. */
  count?: number
}

/** Чип-фильтр. Используется в группе `role="radiogroup"` (QueueToolbar) — single-select. */
export function Chip({ ref, active = false, count, className, children, type, ...props }: ChipProps) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      role="radio"
      aria-checked={active}
      className={cn(
        'inline-flex h-[34px] items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors outline-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-border bg-secondary text-foreground hover:bg-secondary/80',
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className={cn('text-xs', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
          {count}
        </span>
      )}
    </button>
  )
}
