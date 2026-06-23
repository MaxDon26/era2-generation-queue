import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { queueEngine } from './queueEngine'
import { useQueueStore } from './queueStore'
import {
  selectActiveAggregate,
  selectCounts,
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
  return useMemo(
    () => selectVisibleTasks({ phase: 'ready', tasks, queueOrder: [], undo: null }, filters),
    [tasks, filters],
  )
}

/** Узкий хук для глобального статус-бара (единый источник правды со списком). */
export function useActiveAggregate() {
  return useQueueStore(useShallow(selectActiveAggregate))
}
