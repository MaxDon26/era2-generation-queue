import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/shared/lib/cn'
import { buttonVariants, type ButtonSize, type ButtonVariant } from './buttonVariants'

export type { ButtonVariant, ButtonSize }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ ref, variant, size, className, type, ...props }: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
