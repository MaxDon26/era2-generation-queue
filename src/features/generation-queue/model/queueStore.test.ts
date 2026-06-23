import { describe, expect, it } from 'vitest'
import { restoreRunningToQueued } from './queueReducer'
import type { GenerationTask } from '@/entities/generation-task'

const mk = (over: Partial<GenerationTask> & Pick<GenerationTask, 'id' | 'status'>): GenerationTask =>
  ({
    type: 'text', prompt: 'p', model: 'm', credits: 1, estimatedDurationMs: 1000,
    createdAt: 0, progress: 0, ...over,
  }) as GenerationTask

describe('restoreRunningToQueued', () => {
  it('running → queued (progress 0, без startedAt), в начало queueOrder по startedAt', () => {
    const tasks: Record<string, GenerationTask> = {
      r1: mk({ id: 'r1', status: 'running', progress: 70, startedAt: 200 }),
      r2: mk({ id: 'r2', status: 'running', progress: 30, startedAt: 100 }),
      q9: mk({ id: 'q9', status: 'queued' }),
    }
    const res = restoreRunningToQueued(tasks, ['q9'])
    expect(res.tasks.r1.status).toBe('queued')
    expect(res.tasks.r1.progress).toBe(0)
    if (res.tasks.r1.status === 'queued') expect('startedAt' in res.tasks.r1).toBe(false)
    // r2 стартовал раньше (startedAt 100) → раньше в очереди; затем r1; затем существующая q9
    expect(res.queueOrder).toEqual(['r2', 'r1', 'q9'])
  })

  it('без running — состояние не меняется по статусам', () => {
    const tasks: Record<string, GenerationTask> = {
      d1: mk({ id: 'd1', status: 'done', progress: 100, startedAt: 0, finishedAt: 1 }),
      q1: mk({ id: 'q1', status: 'queued' }),
    }
    const res = restoreRunningToQueued(tasks, ['q1'])
    expect(res.tasks.d1.status).toBe('done')
    expect(res.queueOrder).toEqual(['q1'])
  })
})
