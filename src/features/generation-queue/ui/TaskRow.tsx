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

interface TaskRowProps {
  task: GenerationTask
  onCancel?: () => void
  onRetry?: () => void
  onDownload?: () => void
  onDelete: () => void
  /** Пропсы drag-ручки (от SortableList) — показывает ручку внизу у queued-задач. */
  dragHandle?: DragHandleProps
  className?: string
}

/** Строка задачи — горизонтальная раскладка для desktop/tablet (тз.md:147). */
export function TaskRow({
  task,
  className,
  onCancel,
  onRetry,
  onDownload,
  onDelete,
  dragHandle,
}: TaskRowProps) {
  const position = useQueuePosition(task.id)

  return (
    <div className={cn('flex flex-col rounded-2xl border border-border bg-card', className)}>
      <div className="flex items-center gap-4 px-4 py-3.5">
        <TaskThumb type={task.type} className="size-14" />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="truncate text-[15px] font-medium text-foreground" title={task.prompt}>
            {task.prompt}
          </p>
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <ModelPill model={task.model} />
            <span aria-hidden="true" className="text-era-fg-low">
              ·
            </span>
            <span className="truncate text-muted-foreground">{taskMetaText(task, position)}</span>
          </div>
          {task.status === 'running' && (
            <ProgressBar
              value={task.progress}
              aria-label="Прогресс генерации"
              className="mt-0.5 h-[5px] bg-track"
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {task.status === 'running' && (
            <span className="text-[13px] font-medium tabular-nums text-accent-foreground">
              {Math.round(task.progress)}%
            </span>
          )}
          <StatusBadge status={task.status} />
          <TaskActions
            status={task.status}
            onCancel={onCancel}
            onRetry={onRetry}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        </div>
      </div>

      {dragHandle && <DragHandle handle={dragHandle} />}
    </div>
  )
}
