import type { TaskStatus } from '@/entities/generation-task'
import { cn } from '@/shared/lib/cn'

/** Статус → подпись и цвета (макет: мягкий фон + цветной текст, без иконки, r=8).
 *  Цвет НЕ единственный носитель — подпись-текст несёт статус (WCAG 1.4.1). */
const STATUS_CONFIG: Record<TaskStatus, { label: string; classes: string }> = {
  queued: { label: 'В очереди', classes: 'bg-secondary text-muted-foreground' },
  running: { label: 'Идёт', classes: 'bg-accent text-accent-foreground' },
  done: { label: 'Готово', classes: 'bg-success/15 text-success' },
  failed: { label: 'Ошибка', classes: 'bg-destructive/15 text-destructive' },
  canceled: { label: 'Отменено', classes: 'bg-secondary text-muted-foreground' },
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const { label, classes } = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2.5 py-[5px] text-xs font-medium',
        classes,
        className,
      )}
    >
      {label}
    </span>
  )
}
