import type { GenerationTask, GenType, TaskStatus } from '@/entities/generation-task'
import type { QueueState } from './queueReducer'

export interface QueueFilters {
  status: TaskStatus | 'all'
  type?: GenType | 'all'
  search: string
  sort: 'queue' | 'newest' | 'oldest' | 'status' | 'progress'
}

/** 4 счётчика (тз.md:138) + total для различения «пусто вообще» / «пусто под фильтром». */
export function selectCounts(s: QueueState) {
  let queued = 0
  let running = 0
  let done = 0
  let failed = 0
  let total = 0
  for (const id in s.tasks) {
    total++
    switch (s.tasks[id].status) {
      case 'queued':
        queued++
        break
      case 'running':
        running++
        break
      case 'done':
        done++
        break
      case 'failed':
        failed++
        break
    }
  }
  return { queued, running, done, failed, total }
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  running: 0,
  queued: 1,
  failed: 2,
  canceled: 3,
  done: 4,
}

/** Видимый список: фильтр по статусу/типу + поиск по prompt + сортировка (тз.md:141-144). */
export function selectVisibleTasks(s: QueueState, f: QueueFilters): GenerationTask[] {
  let list = Object.values(s.tasks)
  if (f.status !== 'all') list = list.filter((t) => t.status === f.status)
  if (f.type && f.type !== 'all') list = list.filter((t) => t.type === f.type)
  const q = f.search.trim().toLowerCase()
  if (q) list = list.filter((t) => t.prompt.toLowerCase().includes(q))

  const sorted = [...list]
  switch (f.sort) {
    case 'queue': {
      // Порядок исполнения: running → queued(по queueOrder) → завершённые(новее выше).
      // Используется как режим по умолчанию и единственный, где доступен drag-reorder.
      const rank = (t: GenerationTask): [number, number] => {
        if (t.status === 'running') return [0, 0]
        if (t.status === 'queued') {
          const i = s.queueOrder.indexOf(t.id)
          return [1, i < 0 ? Number.MAX_SAFE_INTEGER : i]
        }
        return [2, -t.createdAt]
      }
      sorted.sort((a, b) => {
        const ra = rank(a)
        const rb = rank(b)
        return ra[0] - rb[0] || ra[1] - rb[1]
      })
      break
    }
    case 'newest':
      sorted.sort((a, b) => b.createdAt - a.createdAt)
      break
    case 'oldest':
      sorted.sort((a, b) => a.createdAt - b.createdAt)
      break
    case 'progress':
      sorted.sort((a, b) => b.progress - a.progress)
      break
    case 'status':
      sorted.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
      break
  }
  return sorted
}

/** Позиция queued-задачи в очереди исполнения (тз.md:150) или null. */
export function selectQueuePosition(s: QueueState, id: string): number | null {
  const i = s.queueOrder.indexOf(id)
  return i < 0 ? null : i + 1
}

/** Агрегат для глобального статус-бара (тз.md:179,182): activeCount и средний прогресс по running. */
export function selectActiveAggregate(s: QueueState) {
  const running = Object.values(s.tasks).filter((t) => t.status === 'running')
  const queued = Object.values(s.tasks).filter((t) => t.status === 'queued')
  const avgProgress = running.length
    ? Math.round(running.reduce((sum, t) => sum + t.progress, 0) / running.length)
    : 0
  return { activeCount: running.length + queued.length, avgProgress }
}
