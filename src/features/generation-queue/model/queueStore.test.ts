import { describe, expect, it } from 'vitest'
import { resumeRunning } from './queueReducer'
import type { GenerationTask } from '@/entities/generation-task'

const mk = (over: Partial<GenerationTask> & Pick<GenerationTask, 'id' | 'status'>): GenerationTask =>
  ({
    type: 'text', prompt: 'p', model: 'm', credits: 1, estimatedDurationMs: 1000,
    createdAt: 0, progress: 0, ...over,
  }) as GenerationTask

describe('resumeRunning (продолжение прогресса при перезагрузке, тз.md:4.7)', () => {
  it('running сохраняет progress и статус, startedAt пересчитан под now', () => {
    const now = 1_000_000
    const tasks: Record<string, GenerationTask> = {
      r1: mk({ id: 'r1', status: 'running', progress: 70, estimatedDurationMs: 10_000, startedAt: 5 }),
    }
    const res = resumeRunning(tasks, now)
    expect(res.r1.status).toBe('running')
    expect(res.r1.progress).toBe(70)
    // прошло 70% от 10000мс = 7000мс → startedAt = now - 7000 (длительность/ETA консистентны)
    if (res.r1.status === 'running') expect(res.r1.startedAt).toBe(now - 7000)
  })

  it('не-running задачи не трогает', () => {
    const tasks: Record<string, GenerationTask> = {
      d1: mk({ id: 'd1', status: 'done', progress: 100, startedAt: 0, finishedAt: 1 }),
      q1: mk({ id: 'q1', status: 'queued' }),
    }
    const res = resumeRunning(tasks, 999)
    expect(res.d1.status).toBe('done')
    expect(res.q1.status).toBe('queued')
  })
})
