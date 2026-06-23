import type { GenerationTask } from '@/entities/generation-task'

export interface TickRoll {
  jitter: number
  failRoll: number
  errorMsg: string
}

export type QueueAction =
  | { type: 'INIT_START' }
  | { type: 'INIT_SUCCESS'; tasks: GenerationTask[] }
  | { type: 'INIT_ERROR' }
  | { type: 'TICK'; dtMs: number; now: number; perTask: Record<string, TickRoll> }
  | { type: 'CANCEL'; id: string; now: number }
  | { type: 'RETRY'; id: string }
  | { type: 'DELETE'; id: string }
  | { type: 'CLEAR_DONE' }
  | { type: 'REORDER'; from: number; to: number }
  | { type: 'UNDO' }
