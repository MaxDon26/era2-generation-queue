import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export type IconButtonVariant = 'secondary' | 'ghost' | 'outline'
export type IconButtonSize = 'sm' | 'default' | 'lg'

const base =
  'inline-flex items-center justify-center rounded-full transition-colors motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none'

const variantClasses: Record<IconButtonVariant, string> = {
  secondary: 'border border-border bg-secondary text-foreground hover:bg-secondary/80',
  ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  outline: 'border border-border text-foreground hover:bg-secondary',
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'size-8',
  default: 'size-9',
  lg: 'size-10',
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  ref?: Ref<HTMLButtonElement>
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** Обязателен — у кнопки нет видимого текста (доступное имя). */
  'aria-label': string
}

export function IconButton({
  ref,
  variant = 'ghost',
  size = 'default',
  className,
  type,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(base, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
}
