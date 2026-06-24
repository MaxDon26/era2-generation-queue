import { ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { genTitle, type ActiveTask } from '@/entities/generation-task'
import { ProgressBar } from '../ProgressBar'
import { TaskThumb } from '../taskParts'

/** Развёрнутое состояние для одной активной задачи (макет StatusBar/single). */
export function StatusSingle({ task }: { task: ActiveTask }) {
  return (
    <div className="w-[332px] rounded-panel border border-primary bg-secondary">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Loader2
          aria-hidden="true"
          className="size-[18px] shrink-0 animate-spin text-primary motion-reduce:animate-none"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{genTitle(task.type)}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {task.model} · {Math.round(task.progress)}%
          </p>
        </div>
        <Link
          to="/queue"
          aria-label="Открыть очередь"
          className="shrink-0 rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="flex items-center gap-3 px-3.5 pb-3.5">
        <TaskThumb type={task.type} className="size-10 rounded-[10px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="truncate text-xs text-foreground-secondary">{task.prompt}</p>
          <div aria-hidden="true">
            <ProgressBar value={task.progress} className="h-1 bg-track" />
          </div>
        </div>
      </div>
    </div>
  )
}
