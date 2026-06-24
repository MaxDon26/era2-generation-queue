import { cn } from '@/shared/lib/cn'

interface ProgressBarProps {
  /** Прогресс 0–100 (компонент делает clamp). */
  value: number
  className?: string
  'aria-label'?: string
}

export function ProgressBar({ value, className, 'aria-label': ariaLabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
