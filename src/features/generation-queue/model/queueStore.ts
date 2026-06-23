import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QueueAction } from './actions'
import { initialState, queueReducer, resumeRunning, type QueueState } from './queueReducer'
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
      // При гидрации ПРОДОЛЖАЕМ running с сохранённым progress (тз.md:4.7) и форсим phase: loading.
      merge: (persisted, current) => {
        const p = persisted as Partial<QueueState> | undefined
        if (!p?.tasks) return current
        return {
          ...current,
          tasks: resumeRunning(p.tasks, Date.now()),
          queueOrder: p.queueOrder ?? [],
          phase: 'loading',
        }
      },
    },
  ),
)
