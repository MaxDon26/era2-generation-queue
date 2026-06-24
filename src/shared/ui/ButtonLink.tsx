import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { buttonVariants, type ButtonSize, type ButtonVariant } from './buttonVariants'

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant
  size?: ButtonSize
}

/** Навигационная кнопка-ссылка (react-router `<Link>`) с визуалом Button.
 *  Типобезопасная замена `asChild` для единственного кейса — «Открыть очередь →». */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
