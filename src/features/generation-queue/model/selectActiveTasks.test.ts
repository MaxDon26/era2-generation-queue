import { describe, expect, it } from 'vitest'
import type { QueuedTask, RunningTask } from '@/entities/generation-task'
import { selectActiveTasks } from './selectors'

const run = (id: string, progress: number, startedAt: number): RunningTask => ({
  id,
  type: 'image',
  status: 'running',
  prompt: id,
  model: 'm',
  credits: 1,
  estimatedDurationMs: 1000,
  createdAt: 0,
  progress,
  startedAt,
})

const queued = (id: string): QueuedTask => ({
  id,
  type: 'text',
  status: 'queued',
  prompt: id,
  model: 'm',
  credits: 1,
  estimatedDurationMs: 1000,
  createdAt: 0,
  progress: 0,
})

describe('selectActiveTasks', () => {
  it('running по убыванию прогресса, затем queued по queueOrder, срез limit', () => {
    const tasks = { a: run('a', 30, 100), b: run('b', 70, 50), c: queued('c'), d: queued('d') }
    const r = selectActiveTasks({ tasks, queueOrder: ['d', 'c'] }, 3)
    expect(r.map((t) => t.id)).toEqual(['b', 'a', 'd'])
  })

  it('тайтбрейкер по startedAt при равном прогрессе', () => {
    const tasks = { a: run('a', 50, 200), b: run('b', 50, 100) }
    const r = selectActiveTasks({ tasks, queueOrder: [] }, 5)
    expect(r.map((t) => t.id)).toEqual(['b', 'a'])
  })

  it('исключает завершённые/отменённые', () => {
    const tasks = {
      a: run('a', 10, 1),
      d: { ...queued('d'), status: 'done', progress: 100, startedAt: 1, finishedAt: 2 } as never,
    }
    const r = selectActiveTasks({ tasks, queueOrder: [] }, 5)
    expect(r.map((t) => t.id)).toEqual(['a'])
  })
})
