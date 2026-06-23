import { describe, expect, it } from 'vitest'
import type { GenerationTask } from '@/entities/generation-task'
import type { QueueState } from './queueReducer'
import {
  selectActiveAggregate,
  selectCounts,
  selectQueuePosition,
  selectVisibleTasks,
} from './selectors'

const mk = (over: Partial<GenerationTask> & Pick<GenerationTask, 'id' | 'status'>): GenerationTask =>
  ({
    type: 'text', prompt: 'p', model: 'm', credits: 1, estimatedDurationMs: 1000,
    createdAt: 0, progress: 0, ...over,
  }) as GenerationTask

const state = (tasks: GenerationTask[], queueOrder: string[] = []): QueueState => ({
  phase: 'ready',
  tasks: Object.fromEntries(tasks.map((t) => [t.id, t] as const)),
  queueOrder,
  undo: null,
})

describe('selectors', () => {
  it('selectCounts считает по статусам + total', () => {
    const s = state([
      mk({ id: 'a', status: 'queued' }),
      mk({ id: 'b', status: 'running', progress: 10, startedAt: 0 }),
      mk({ id: 'c', status: 'done', progress: 100, startedAt: 0, finishedAt: 1 }),
      mk({ id: 'd', status: 'failed', progress: 5, startedAt: 0, finishedAt: 1, error: 'e' }),
    ])
    expect(selectCounts(s)).toEqual({ queued: 1, running: 1, done: 1, failed: 1, total: 4 })
  })

  it('selectVisibleTasks: фильтр по статусу', () => {
    const s = state([
      mk({ id: 'a', status: 'queued' }),
      mk({ id: 'b', status: 'done', progress: 100, startedAt: 0, finishedAt: 1 }),
    ])
    expect(selectVisibleTasks(s, { status: 'queued', search: '', sort: 'newest' }).map((t) => t.id)).toEqual(['a'])
  })

  it('selectVisibleTasks: поиск по prompt и сортировка newest/oldest', () => {
    const s = state([
      mk({ id: 'a', status: 'queued', prompt: 'кот', createdAt: 1 }),
      mk({ id: 'b', status: 'queued', prompt: 'собака', createdAt: 2 }),
    ])
    expect(selectVisibleTasks(s, { status: 'all', search: 'кот', sort: 'newest' }).map((t) => t.id)).toEqual(['a'])
    expect(selectVisibleTasks(s, { status: 'all', search: '', sort: 'newest' }).map((t) => t.id)).toEqual(['b', 'a'])
    expect(selectVisibleTasks(s, { status: 'all', search: '', sort: 'oldest' }).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('selectVisibleTasks sort=queue: running → queued(по queueOrder) → завершённые(новее выше)', () => {
    const s = state(
      [
        mk({ id: 'q1', status: 'queued', createdAt: 1 }),
        mk({ id: 'q2', status: 'queued', createdAt: 2 }),
        mk({ id: 'r1', status: 'running', progress: 10, startedAt: 0, createdAt: 5 }),
        mk({ id: 'd1', status: 'done', progress: 100, startedAt: 0, finishedAt: 1, createdAt: 3 }),
        mk({ id: 'f1', status: 'failed', progress: 5, startedAt: 0, finishedAt: 1, error: 'e', createdAt: 4 }),
      ],
      ['q2', 'q1'],
    )
    const out = selectVisibleTasks(s, { status: 'all', search: '', sort: 'queue' }).map((t) => t.id)
    expect(out).toEqual(['r1', 'q2', 'q1', 'f1', 'd1'])
  })

  it('selectQueuePosition по queueOrder', () => {
    const s = state([mk({ id: 'a', status: 'queued' }), mk({ id: 'b', status: 'queued' })], ['a', 'b'])
    expect(selectQueuePosition(s, 'b')).toBe(2)
    expect(selectQueuePosition(s, 'x')).toBeNull()
  })

  it('selectActiveAggregate: activeCount=running+queued, avgProgress по running', () => {
    const s = state([
      mk({ id: 'r1', status: 'running', progress: 40, startedAt: 0 }),
      mk({ id: 'r2', status: 'running', progress: 60, startedAt: 0 }),
      mk({ id: 'q1', status: 'queued' }),
    ])
    expect(selectActiveAggregate(s)).toEqual({ activeCount: 3, avgProgress: 50 })
  })

  it('selectActiveAggregate: без running avgProgress=0', () => {
    const s = state([mk({ id: 'q1', status: 'queued' })])
    expect(selectActiveAggregate(s)).toEqual({ activeCount: 1, avgProgress: 0 })
  })
})
