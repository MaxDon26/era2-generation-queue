import { Download, MoreHorizontal, RotateCcw, X } from 'lucide-react'
import type { TaskStatus } from '@/entities/generation-task'
import { IconButton } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface TaskActionsProps {
  status: TaskStatus
  onCancel?: () => void
  onRetry?: () => void
  onDownload?: () => void
  onDelete: () => void
  className?: string
}

/** Действия по статусу (тз.md:154-158): основное действие + «…».
 *  Кнопки 32px rounded-sm secondary; cancel/«…» — приглушённые, retry/download — акцентные.
 *  «…» пока триггерит удаление (полноценное меню — позже). */
export function TaskActions({
  status,
  onCancel,
  onRetry,
  onDownload,
  onDelete,
  className,
}: TaskActionsProps) {
  const canCancel = status === 'queued' || status === 'running'
  const canRetry = status === 'failed' || status === 'canceled'
  const canDownload = status === 'done'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {canCancel && (
        <IconButton
          aria-label="Отменить"
          variant="secondary"
          size="sm"
          className="rounded-sm text-muted-foreground"
          onClick={onCancel}
        >
          <X className="size-3.5" aria-hidden="true" />
        </IconButton>
      )}
      {canRetry && (
        <IconButton
          aria-label="Повторить"
          variant="secondary"
          size="sm"
          className="rounded-sm text-accent-foreground"
          onClick={onRetry}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
        </IconButton>
      )}
      {canDownload && (
        <IconButton
          aria-label="Скачать"
          variant="secondary"
          size="sm"
          className="rounded-sm text-accent-foreground"
          onClick={onDownload}
        >
          <Download className="size-3.5" aria-hidden="true" />
        </IconButton>
      )}
      <IconButton
        aria-label="Удалить"
        variant="secondary"
        size="sm"
        className="rounded-sm text-muted-foreground"
        onClick={onDelete}
      >
        <MoreHorizontal className="size-3.5" aria-hidden="true" />
      </IconButton>
    </div>
  )
}
