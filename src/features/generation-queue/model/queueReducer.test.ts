import { describe, expect, it } from 'vitest'
import { createSeed } from '@/entities/generation-task'
import type { GenerationTask, QueuedTask, RunningTask } from '@/entities/generation-task'
import { MAX_CONCURRENT } from './constants'
import { initialState, queueReducer, type QueueState } from './queueReducer'

const runningTask = (over: Partial<RunningTask> = {}): RunningTask => ({
  id: 'r1', type: 'image', status: 'running', prompt: 'p', model: 'm',
  credits: 5, estimatedDurationMs: 10_000, createdAt: 0, progress: 50, startedAt: 0, ...over,
})
const queuedTask = (id: string, over: Partial<QueuedTask> = {}): QueuedTask => ({
  id, type: 'text', status: 'queued', prompt: 'p', model: 'm',
  credits: 1, estimatedDurationMs: 8_000, createdAt: 0, progress: 0, ...over,
})
const ready = (tasks: GenerationTask[], queueOrder: string[] = []): QueueState => ({
  phase: 'ready',
  tasks: Object.fromEntries(tasks.map((t) => [t.id, t] as const)),
  queueOrder,
  undo: null,
})
const noFail = { jitter: 1, failRoll: 0.999, errorMsg: 'x' }

describe('queueReducer · INIT', () => {
  it('INIT_START → phase loading', () => {
    const s = queueReducer({ ...initialState, phase: 'error' }, { type: 'INIT_START' })
    expect(s.phase).toBe('loading')
  })

  it('INIT_SUCCESS наполняет tasks и строит queueOrder из queued по createdAt', () => {
    const tasks = createSeed(1_700_000_000_000)
    const s = queueReducer(initialState, { type: 'INIT_SUCCESS', tasks })
    expect(s.phase).toBe('ready')
    expect(Object.keys(s.tasks).length).toBe(tasks.length)
    const queuedSorted = tasks
      .filter((t) => t.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((t) => t.id)
    expect(s.queueOrder).toEqual(queuedSorted)
  })

  it('INIT_ERROR → phase error', () => {
    expect(queueReducer(initialState, { type: 'INIT_ERROR' }).phase).toBe('error')
  })
})

describe('queueReducer · TICK прогресс', () => {
  it('progress растёт на step×jitter (step=100×dt/estDur) с clamp', () => {
    const s = ready([runningTask({ estimatedDurationMs: 10_000, progress: 0 })])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: { r1: noFail } })
    expect(out.tasks.r1.progress).toBe(5)
  })

  it('progress ≥ 100 → done (100, finishedAt)', () => {
    const s = ready([runningTask({ progress: 99, estimatedDurationMs: 1_000 })])
    const t = queueReducer(s, { type: 'TICK', dtMs: 500, now: 42, perTask: { r1: noFail } }).tasks.r1
    expect(t.status).toBe('done')
    expect(t.progress).toBe(100)
    if (t.status === 'done') expect(t.finishedAt).toBe(42)
  })

  it('failRoll < p_fail → failed с error и finishedAt; прогресс фиксируется', () => {
    const s = ready([runningTask({ progress: 30, estimatedDurationMs: 10_000 })])
    const t = queueReducer(s, {
      type: 'TICK', dtMs: 500, now: 7,
      perTask: { r1: { jitter: 1, failRoll: 0.001, errorMsg: 'Превышено время ожидания' } },
    }).tasks.r1
    expect(t.status).toBe('failed')
    if (t.status === 'failed') {
      expect(t.error).toBe('Превышено время ожидания')
      expect(t.finishedAt).toBe(7)
      expect(t.progress).toBe(30)
    }
  })

  it('failRoll ≥ p_fail → не падает', () => {
    const s = ready([runningTask({ progress: 30, estimatedDurationMs: 10_000 })])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: { r1: { jitter: 1, failRoll: 0.5, errorMsg: 'x' } } })
    expect(out.tasks.r1.status).toBe('running')
  })

  it('TICK не трогает state при phase!=ready', () => {
    const s = { ...ready([runningTask()]), phase: 'loading' as const }
    expect(queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: { r1: noFail } })).toBe(s)
  })
})

describe('queueReducer · TICK продвижение очереди', () => {
  it('при running==MAX_CONCURRENT queued не стартует', () => {
    const s = ready([runningTask({ id: 'r1' }), runningTask({ id: 'r2' }), queuedTask('q1')], ['q1'])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: { r1: noFail, r2: noFail } })
    expect(out.tasks.q1.status).toBe('queued')
    expect(out.queueOrder).toEqual(['q1'])
  })

  it('освободился слот → стартует первая из queueOrder (progress 0, startedAt now)', () => {
    const s = ready([queuedTask('q1'), queuedTask('q2')], ['q1', 'q2'])
    const t1 = queueReducer(s, { type: 'TICK', dtMs: 500, now: 99, perTask: {} }).tasks.q1
    expect(t1.status).toBe('running')
    if (t1.status === 'running') {
      expect(t1.progress).toBe(0)
      expect(t1.startedAt).toBe(99)
    }
  })

  it('заполняет до MAX_CONCURRENT слотов за один TICK', () => {
    const s = ready([queuedTask('q1'), queuedTask('q2'), queuedTask('q3')], ['q1', 'q2', 'q3'])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: {} })
    expect(Object.values(out.tasks).filter((t) => t.status === 'running').length).toBe(MAX_CONCURRENT)
    expect(out.queueOrder).toEqual(['q3'])
  })

  it('пустой queueOrder и свободные слоты → no-op по очереди', () => {
    const out = queueReducer(ready([], []), { type: 'TICK', dtMs: 500, now: 1, perTask: {} })
    expect(out.queueOrder).toEqual([])
  })
})

describe('queueReducer · CANCEL', () => {
  it('running → canceled (фикс progress, finishedAt, startedAt)', () => {
    const s = ready([runningTask({ id: 'r1', progress: 40, startedAt: 5 })])
    const t = queueReducer(s, { type: 'CANCEL', id: 'r1', now: 50 }).tasks.r1
    expect(t.status).toBe('canceled')
    if (t.status === 'canceled') {
      expect(t.progress).toBe(40)
      expect(t.finishedAt).toBe(50)
      expect(t.startedAt).toBe(5)
    }
  })

  it('queued → canceled (progress 0, без startedAt, убрана из queueOrder)', () => {
    const s = ready([queuedTask('q1')], ['q1'])
    const out = queueReducer(s, { type: 'CANCEL', id: 'q1', now: 9 })
    const t = out.tasks.q1
    expect(t.status).toBe('canceled')
    if (t.status === 'canceled') expect(t.startedAt).toBeUndefined()
    expect(out.queueOrder).toEqual([])
  })

  it('CANCEL по done = no-op (guard, гонка cancel/tick)', () => {
    const done = { ...runningTask({ id: 'r1' }), status: 'done' as const, progress: 100 as const, finishedAt: 1 }
    const s = ready([done])
    expect(queueReducer(s, { type: 'CANCEL', id: 'r1', now: 2 })).toBe(s)
  })

  it('после CANCEL следующий TICK не меняет задачу (без дотиков)', () => {
    const s = ready([runningTask({ id: 'r1', progress: 40 })])
    const canceled = queueReducer(s, { type: 'CANCEL', id: 'r1', now: 50 })
    const ticked = queueReducer(canceled, { type: 'TICK', dtMs: 500, now: 60, perTask: { r1: noFail } })
    expect(ticked.tasks.r1).toEqual(canceled.tasks.r1)
  })
})

describe('queueReducer · RETRY', () => {
  const failed = () => ({
    ...runningTask({ id: 'f1', progress: 60 }), status: 'failed' as const, finishedAt: 1, error: 'e',
  })
  it('failed → queued, в конце queueOrder, progress 0', () => {
    const s = ready([failed(), queuedTask('q1')], ['q1'])
    const out = queueReducer(s, { type: 'RETRY', id: 'f1' })
    expect(out.tasks.f1.status).toBe('queued')
    expect(out.tasks.f1.progress).toBe(0)
    expect(out.queueOrder).toEqual(['q1', 'f1'])
  })
  it('RETRY по queued = no-op (guard)', () => {
    const s = ready([queuedTask('q1')], ['q1'])
    expect(queueReducer(s, { type: 'RETRY', id: 'q1' })).toBe(s)
  })
})

describe('queueReducer · DELETE/CLEAR_DONE/UNDO', () => {
  const done = (id: string) => ({ ...runningTask({ id }), status: 'done' as const, progress: 100 as const, finishedAt: 1 })

  it('DELETE убирает из tasks/queueOrder и пишет undo; UNDO восстанавливает', () => {
    const s = ready([queuedTask('q1'), queuedTask('q2')], ['q1', 'q2'])
    const del = queueReducer(s, { type: 'DELETE', id: 'q1' })
    expect(del.tasks.q1).toBeUndefined()
    expect(del.queueOrder).toEqual(['q2'])
    expect(del.undo?.removedTasks.map((t) => t.id)).toEqual(['q1'])
    const undone = queueReducer(del, { type: 'UNDO' })
    expect(undone.tasks.q1).toBeDefined()
    expect(undone.queueOrder).toEqual(['q1', 'q2'])
    expect(undone.undo).toBeNull()
  })

  it('DELETE running освобождает слот на следующем TICK', () => {
    const s = ready([runningTask({ id: 'r1' }), runningTask({ id: 'r2' }), queuedTask('q1')], ['q1'])
    const del = queueReducer(s, { type: 'DELETE', id: 'r1' })
    const out = queueReducer(del, { type: 'TICK', dtMs: 500, now: 1, perTask: { r2: noFail } })
    expect(out.tasks.q1.status).toBe('running')
  })

  it('CLEAR_DONE удаляет все done и пишет undo', () => {
    const s = ready([done('d1'), done('d2'), queuedTask('q1')], ['q1'])
    const out = queueReducer(s, { type: 'CLEAR_DONE' })
    expect(Object.values(out.tasks).some((t) => t.status === 'done')).toBe(false)
    expect(out.undo?.removedTasks.length).toBe(2)
  })

  it('TICK НЕ сбрасывает undo', () => {
    const s = ready([runningTask({ id: 'r1' }), queuedTask('q1')], ['q1'])
    const del = queueReducer(s, { type: 'DELETE', id: 'q1' })
    const out = queueReducer(del, { type: 'TICK', dtMs: 500, now: 1, perTask: { r1: noFail } })
    expect(out.undo).not.toBeNull()
  })
})

describe('queueReducer · REORDER', () => {
  it('перемещает id внутри queueOrder', () => {
    const s = ready([queuedTask('q1'), queuedTask('q2'), queuedTask('q3')], ['q1', 'q2', 'q3'])
    const out = queueReducer(s, { type: 'REORDER', from: 0, to: 2 })
    expect(out.queueOrder).toEqual(['q2', 'q3', 'q1'])
  })
  it('невалидные индексы → no-op', () => {
    const s = ready([queuedTask('q1')], ['q1'])
    expect(queueReducer(s, { type: 'REORDER', from: 0, to: 5 })).toBe(s)
  })
})
