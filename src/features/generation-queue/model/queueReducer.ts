import type { GenerationTask } from '@/entities/generation-task'
import type { QueueAction } from './actions'
import { FAIL_RATE, MAX_CONCURRENT } from './constants'

export interface UndoSnapshot {
  label: string
  removedTasks: GenerationTask[]
  prevQueueOrder: string[]
}

export interface QueueState {
  phase: 'loading' | 'ready' | 'error'
  tasks: Record<string, GenerationTask>
  queueOrder: string[]
  undo: UndoSnapshot | null
}

export const initialState: QueueState = {
  phase: 'loading',
  tasks: {},
  queueOrder: [],
  undo: null,
}

/** Извлечь общие (TaskBase) поля — для конструирования DU-форм при переходах. */
export function base(t: GenerationTask) {
  return {
    id: t.id,
    type: t.type,
    prompt: t.prompt,
    model: t.model,
    credits: t.credits,
    estimatedDurationMs: t.estimatedDurationMs,
    createdAt: t.createdAt,
  }
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'INIT_START':
      return { ...state, phase: 'loading' }

    case 'INIT_SUCCESS': {
      const tasks: Record<string, GenerationTask> = {}
      for (const t of action.tasks) tasks[t.id] = t
      const queueOrder = action.tasks
        .filter((t) => t.status === 'queued')
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((t) => t.id)
      return { phase: 'ready', tasks, queueOrder, undo: null }
    }

    case 'INIT_ERROR':
      return { ...state, phase: 'error' }

    case 'TICK': {
      if (state.phase !== 'ready') return state
      const { dtMs, now, perTask } = action
      const tasks = { ...state.tasks }

      // (1) прогресс / сбой / завершение для running
      for (const id of Object.keys(tasks)) {
        const t = tasks[id]
        if (t.status !== 'running') continue
        const roll = perTask[id]
        if (!roll) continue

        const pFail = (FAIL_RATE * dtMs) / t.estimatedDurationMs
        if (roll.failRoll < pFail) {
          tasks[id] = {
            ...base(t), status: 'failed', progress: t.progress,
            startedAt: t.startedAt, finishedAt: now, error: roll.errorMsg,
          }
          continue
        }

        const step = (100 * dtMs) / t.estimatedDurationMs
        const next = clamp(t.progress + step * roll.jitter)
        tasks[id] =
          next >= 100
            ? { ...base(t), status: 'done', progress: 100, startedAt: t.startedAt, finishedAt: now }
            : { ...base(t), status: 'running', progress: next, startedAt: t.startedAt }
      }

      // (2) продвижение очереди ПОСЛЕ прогресса (новая задача тикнёт на следующем TICK)
      let running = Object.values(tasks).filter((t) => t.status === 'running').length
      let queueOrder = state.queueOrder
      while (running < MAX_CONCURRENT && queueOrder.length > 0) {
        const nextId = queueOrder[0]
        const t = tasks[nextId]
        queueOrder = queueOrder.slice(1)
        if (t && t.status === 'queued') {
          tasks[nextId] = { ...base(t), status: 'running', progress: 0, startedAt: now }
          running++
        }
      }

      return { ...state, tasks, queueOrder }
    }

    case 'CANCEL': {
      const t = state.tasks[action.id]
      if (!t || (t.status !== 'running' && t.status !== 'queued')) return state
      const tasks = { ...state.tasks }
      tasks[action.id] =
        t.status === 'running'
          ? { ...base(t), status: 'canceled', progress: t.progress, startedAt: t.startedAt, finishedAt: action.now }
          : { ...base(t), status: 'canceled', progress: 0, finishedAt: action.now }
      return { ...state, tasks, queueOrder: state.queueOrder.filter((id) => id !== action.id) }
    }

    case 'RETRY': {
      const t = state.tasks[action.id]
      if (!t || (t.status !== 'failed' && t.status !== 'canceled')) return state
      const tasks = { ...state.tasks }
      tasks[action.id] = { ...base(t), status: 'queued', progress: 0 }
      return {
        ...state, tasks,
        queueOrder: [...state.queueOrder.filter((id) => id !== action.id), action.id],
      }
    }

    case 'DELETE': {
      const t = state.tasks[action.id]
      if (!t) return state
      const tasks = { ...state.tasks }
      delete tasks[action.id]
      return {
        ...state, tasks,
        queueOrder: state.queueOrder.filter((id) => id !== action.id),
        undo: { label: 'Задача удалена', removedTasks: [t], prevQueueOrder: state.queueOrder },
      }
    }

    case 'CLEAR_DONE': {
      const removed = Object.values(state.tasks).filter((t) => t.status === 'done')
      if (removed.length === 0) return state
      const tasks = { ...state.tasks }
      for (const t of removed) delete tasks[t.id]
      return {
        ...state, tasks,
        undo: { label: `Удалено готовых: ${removed.length}`, removedTasks: removed, prevQueueOrder: state.queueOrder },
      }
    }

    case 'UNDO': {
      if (!state.undo) return state
      const tasks = { ...state.tasks }
      for (const t of state.undo.removedTasks) tasks[t.id] = t
      return { ...state, tasks, queueOrder: state.undo.prevQueueOrder, undo: null }
    }

    case 'REORDER': {
      const { from, to } = action
      const n = state.queueOrder.length
      if (from < 0 || to < 0 || from >= n || to >= n) return state
      const queueOrder = [...state.queueOrder]
      const [moved] = queueOrder.splice(from, 1)
      queueOrder.splice(to, 0, moved)
      return { ...state, queueOrder }
    }

    default:
      action satisfies never
      return state
  }
}
