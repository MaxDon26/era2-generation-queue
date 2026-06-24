import type { GenerationTask } from '@/entities/generation-task'
import { formatCredits, formatDuration, formatEta } from '../lib/formatEta'

/** Мета под промптом — формат зависит от статуса (макет). */
export function taskMetaText(task: GenerationTask, position: number | null): string {
  const cr = `${formatCredits(task.credits)} cr`
  switch (task.status) {
    case 'running':
      return `${formatEta(task.estimatedDurationMs, task.progress)} · ${cr}`
    case 'queued':
      return position ? `позиция ${position} в очереди · ${cr}` : `в очереди · ${cr}`
    case 'done':
      return `готово за ${formatDuration(task.finishedAt - task.startedAt)} · ${cr}`
    case 'failed':
      return task.error
    case 'canceled':
      return 'отменено пользователем'
  }
}
