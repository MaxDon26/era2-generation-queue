import { ArrowRight, ChevronDown, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ActiveTask } from '@/entities/generation-task'
import { ProgressBar } from '../ProgressBar'
import { TaskThumb } from '../taskParts'

interface StatusMultiProps {
  tasks: ActiveTask[]
  activeCount: number
  avgProgress: number
  onCollapse: () => void
}

/** Развёрнутое состояние для нескольких активных задач (макет StatusBar/multi). */
export function StatusMulti({ tasks, activeCount, avgProgress, onCollapse }: StatusMultiProps) {
  return (
    <div className="w-[332px] rounded-panel border border-primary bg-secondary">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Loader2
          aria-hidden="true"
          className="size-[18px] shrink-0 animate-spin text-primary motion-reduce:animate-none"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">Генерации идут</p>
          <p className="text-[11px] text-muted-foreground">
            {activeCount} активны · {avgProgress}%
          </p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Свернуть статус-бар"
          className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      </div>

      <ul role="list" className="flex flex-col gap-2.5 px-3.5 pb-2.5">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2.5">
            <TaskThumb type={task.type} className="size-7 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-xs text-foreground-secondary">{task.prompt}</span>
              {task.status === 'running' && (
                <div aria-hidden="true">
                  <ProgressBar value={task.progress} className="h-1 bg-track" />
                </div>
              )}
            </div>
            {task.status === 'running' ? (
              <span className="shrink-0 font-mono text-[11px] font-medium text-accent-foreground">
                {Math.round(task.progress)}%
              </span>
            ) : (
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">в очереди</span>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-4 py-2.5 text-center">
        <Link
          to="/queue"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Открыть очередь
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  )
}
