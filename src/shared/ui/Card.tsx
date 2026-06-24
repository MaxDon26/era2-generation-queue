import type { HTMLAttributes, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>
}

export function Card({ ref, className, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1.5 rounded-card border border-border bg-card p-6 text-card-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ ref, className, ...props }: CardProps) {
  return <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props} />
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  ref?: Ref<HTMLHeadingElement>
  as?: 'h2' | 'h3' | 'h4'
}

export function CardTitle({ ref, as: Tag = 'h3', className, ...props }: CardTitleProps) {
  return (
    <Tag
      ref={ref}
      className={cn(
        'text-[18px] font-semibold leading-[23px] tracking-[-0.01em] text-card-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function CardContent({ ref, className, ...props }: CardProps) {
  return <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardFooter({ ref, className, ...props }: CardProps) {
  return <div ref={ref} className={cn('flex items-center', className)} {...props} />
}
