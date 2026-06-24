import type { GenerationTask } from '@/entities/generation-task'
import { cn } from '@/shared/lib/cn'
import type { DragHandleProps } from '@/shared/ui'
import { useQueuePosition } from '../model/useQueue'
import { DragHandle } from './DragHandle'
import { ProgressBar } from './ProgressBar'
import { StatusBadge } from './StatusBadge'
import { TaskActions } from './TaskActions'
import { taskMetaText } from './taskMeta'
import { ModelPill, TaskThumb } from './taskParts'

interface TaskCardProps {
  task: GenerationTask
  onCancel?: () => void
  onRetry?: () => void
  onDownload?: () => void
  onDelete: () => void
  /** Пропсы drag-ручки (от SortableList) — показывает ручку внизу у queued-задач. */
  dragHandle?: DragHandleProps
  className?: string
}

/** Карточка задачи — вертикальная раскладка для mobile (тз.md:147, 167). */
export function TaskCard({
  task,
  className,
  onCancel,
  onRetry,
  onDownload,
  onDelete,
  dragHandle,
}: TaskCardProps) {
  const position = useQueuePosition(task.id)

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5', className)}
    >
      <div className="flex items-start gap-3">
        <TaskThumb type={task.type} className="size-12" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="line-clamp-2 text-[15px] font-medium text-foreground">{task.prompt}</p>
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <ModelPill model={task.model} />
            <span className="truncate text-muted-foreground">{taskMetaText(task, position)}</span>
          </div>
        </div>
      </div>

      {task.status === 'running' && (
        <ProgressBar
          value={task.progress}
          aria-label="Прогресс генерации"
          className="h-[5px] bg-track"
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          {task.status === 'running' && (
            <span className="text-[13px] font-medium tabular-nums text-accent-foreground">
              {Math.round(task.progress)}%
            </span>
          )}
        </div>
        <TaskActions
          status={task.status}
          onCancel={onCancel}
          onRetry={onRetry}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </div>

      {dragHandle && <DragHandle handle={dragHandle} />}
    </div>
  )
}
