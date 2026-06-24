import type { HTMLAttributes, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-border text-foreground',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>
  variant?: BadgeVariant
}

export function Badge({ ref, variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex h-[22px] items-center whitespace-nowrap rounded-control px-2.5 py-[3px] text-xs font-semibold',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
