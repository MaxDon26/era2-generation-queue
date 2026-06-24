import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ActiveTask } from '@/entities/generation-task'
import { queueEngine } from './queueEngine'
import { useQueueStore } from './queueStore'
import {
  selectActiveAggregate,
  selectActiveTasks,
  selectCounts,
  selectQueuePosition,
  selectVisibleTasks,
  type QueueFilters,
} from './selectors'

/** Основной хук фичи: фаза, счётчики, действия. Узкие подписки — без лишних ре-рендеров. */
export function useQueue() {
  const phase = useQueueStore((s) => s.phase)
  const counts = useQueueStore(useShallow(selectCounts))
  const dispatch = useQueueStore((s) => s.dispatch)

  const actions = useMemo(
    () => ({
      cancel: (id: string) => dispatch({ type: 'CANCEL', id, now: Date.now() }),
      retry: (id: string) => dispatch({ type: 'RETRY', id }),
      remove: (id: string) => dispatch({ type: 'DELETE', id }),
      clearDone: () => dispatch({ type: 'CLEAR_DONE' }),
      reorder: (from: number, to: number) => dispatch({ type: 'REORDER', from, to }),
      undo: () => dispatch({ type: 'UNDO' }),
      retryInit: () => queueEngine.retryInit(),
    }),
    [dispatch],
  )

  return { phase, counts, actions }
}

/** Видимый список под фильтры (фаза D передаёт стабильный filters). */
export function useVisibleTasks(filters: QueueFilters) {
  const tasks = useQueueStore((s) => s.tasks)
  const queueOrder = useQueueStore((s) => s.queueOrder)
  return useMemo(
    () => selectVisibleTasks({ phase: 'ready', tasks, queueOrder, undo: null }, filters),
    [tasks, queueOrder, filters],
  )
}

/** Позиция задачи в очереди исполнения (для меты TaskRow) или null. */
export function useQueuePosition(id: string): number | null {
  return useQueueStore((s) => selectQueuePosition(s, id))
}

/** Узкий хук для глобального статус-бара (единый источник правды со списком). */
export function useActiveAggregate() {
  return useQueueStore(useShallow(selectActiveAggregate))
}

/** Активные задачи для мини-списка статус-бара (running→queued, срез limit). */
export function useActiveTasks(limit: number): ActiveTask[] {
  const tasks = useQueueStore((s) => s.tasks)
  const queueOrder = useQueueStore((s) => s.queueOrder)
  return useMemo(() => selectActiveTasks({ tasks, queueOrder }, limit), [tasks, queueOrder, limit])
}
