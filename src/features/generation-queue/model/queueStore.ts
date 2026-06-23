import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QueueAction } from './actions'
import { initialState, queueReducer, restoreRunningToQueued, type QueueState } from './queueReducer'
import { PERSIST_KEY, PERSIST_VERSION } from './constants'

interface QueueStore extends QueueState {
  dispatch: (action: QueueAction) => void
}

export const useQueueStore = create<QueueStore>()(
  persist(
    (set) => ({
      ...initialState,
      dispatch: (action) => set((s) => queueReducer(s, action)),
    }),
    {
      name: PERSIST_KEY,
      version: PERSIST_VERSION,
      // Персистим только данные (M2): phase всегда loading при старте, undo не сохраняем.
      partialize: (s) => ({ tasks: s.tasks, queueOrder: s.queueOrder }),
      // При гидрации приводим running → queued (H3 / тз.md:4.7) и форсим phase: loading.
      merge: (persisted, current) => {
        const p = persisted as Partial<QueueState> | undefined
        if (!p?.tasks) return current
        const { tasks, queueOrder } = restoreRunningToQueued(p.tasks, p.queueOrder ?? [])
        return { ...current, tasks, queueOrder, phase: 'loading' }
      },
    },
  ),
)
