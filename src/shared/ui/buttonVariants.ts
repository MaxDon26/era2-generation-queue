import { cn } from '@/shared/lib/cn'

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'quiet'
  | 'destructive'
  | 'link'
export type ButtonSize = 'sm' | 'default' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none'

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border text-foreground hover:bg-secondary',
  ghost: 'border border-border bg-card text-foreground hover:bg-secondary',
  quiet: 'text-muted-foreground hover:text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  link: 'text-primary underline-offset-4 hover:underline',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-[13px]',
  default: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
}

/** Классы кнопки — переиспользуются в Button и ButtonLink (тот же визуал на `<a>`/`<Link>`). */
export function buttonVariants(opts?: { variant?: ButtonVariant; size?: ButtonSize }): string {
  const { variant = 'default', size = 'default' } = opts ?? {}
  return cn(base, variantClasses[variant], sizeClasses[size])
}
