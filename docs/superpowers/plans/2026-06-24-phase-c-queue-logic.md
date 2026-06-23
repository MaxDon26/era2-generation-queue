# Phase C — Queue Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать «мозг» фичи очереди генераций — конечный автомат, движок, стор, селекторы, публичный хук — строго по TDD.

**Architecture:** Чистый `queueReducer` (конечный автомат, недетерминизм и время инъектируются в payload) поверх Zustand-стора с `persist`. Тонкий `queueEngine` (единственный setInterval) читает стор и диспатчит `TICK`. Селекторы и узкие хуки дают единый источник правды для списка и статус-бара.

**Tech Stack:** React 19, TypeScript strict, Zustand 5 (+persist), Vitest 4, Testing Library.

## Global Constraints

- FSD: код только в `src/features/generation-queue/model/`. Импорт сущности — через публичный `@/entities/generation-task`, без deep-import. Наружу фичи — только `src/features/generation-queue/index.ts`. Алиас `@/` = `src/`.
- TS strict, `verbatimModuleSyntax` (типы импортировать через `import type`).
- Reducer — чистая функция: НИКАКИХ `Date.now()`/`Math.random()` внутри. Время и рандом приходят в payload.
- `progress` всегда clamp в 0..100. DU-переходы конструируются явной целевой формой.
- Константы: `MAX_CONCURRENT=2`, `TICK_INTERVAL_MS=500`, `FAIL_RATE=0.15`, `INIT_DELAY_MS=600`, `INIT_FAIL_RATE=0.1`, `JITTER_RANGE=[0.8,1.2]`.
- Формулы: `step = 100 × dtMs / estimatedDurationMs`; `p_fail = FAIL_RATE × dtMs / estimatedDurationMs`.
- Тесты рядом с кодом (`*.test.ts`). Запуск одного файла: `pnpm test -- <path>`.

## Уточнения плана относительно спеки

- В payload добавлено время (инъекция, чтобы reducer оставался чистым): `TICK` получает `now`, `CANCEL` получает `now`.
- Добавлен экшен `INIT_START` (движок ставит `phase:'loading'` через reducer, а не `setState`).
- `restoreRunningToQueued` реализуется и подключается к persist уже в фазе C (с round-trip тестом), а не откладывается — это дешевле, чем «наполовину».

---

## Файловая структура

```
src/features/generation-queue/
├─ model/
│  ├─ constants.ts        # числовые константы + ERROR_MESSAGES, PERSIST_*
│  ├─ actions.ts          # QueueAction (union), TickRoll
│  ├─ queueReducer.ts     # QueueState, UndoSnapshot, initialState, queueReducer, base(), restoreRunningToQueued()
│  ├─ queueReducer.test.ts
│  ├─ queueStore.ts       # Zustand create(persist(...)), dispatch
│  ├─ queueStore.test.ts  # persist round-trip / restore
│  ├─ queueEngine.ts      # start/stop/init/retryInit, onTick, randomRoll
│  ├─ queueEngine.test.ts
│  ├─ selectors.ts        # selectCounts, selectVisibleTasks, selectQueuePosition, selectActiveAggregate, QueueFilters
│  ├─ selectors.test.ts
│  └─ useQueue.ts         # useQueue, useVisibleTasks, useActiveAggregate
└─ index.ts               # публичный API фичи
```

---

### Task 1: Каркас — константы, actions, reducer-скелет, INIT

**Files:**
- Create: `src/features/generation-queue/model/constants.ts`
- Create: `src/features/generation-queue/model/actions.ts`
- Create: `src/features/generation-queue/model/queueReducer.ts`
- Test: `src/features/generation-queue/model/queueReducer.test.ts`

**Interfaces:**
- Produces: `QueueState`, `UndoSnapshot`, `initialState`, `queueReducer(state, action)`, `base(task)`; `QueueAction`, `TickRoll`; все константы.

- [ ] **Step 1: Constants**

```ts
// constants.ts
export const MAX_CONCURRENT = 2
export const TICK_INTERVAL_MS = 500
export const FAIL_RATE = 0.15
export const INIT_DELAY_MS = 600
export const INIT_FAIL_RATE = 0.1
export const JITTER_RANGE: readonly [number, number] = [0.8, 1.2]
export const ERROR_MESSAGES = [
  'Недостаточно кредитов',
  'Превышено время ожидания',
  'Модель временно недоступна',
] as const
export const PERSIST_KEY = 'era2-queue'
export const PERSIST_VERSION = 1
```

- [ ] **Step 2: Actions**

```ts
// actions.ts
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
```

- [ ] **Step 3: Write failing test (INIT)**

```ts
// queueReducer.test.ts
import { describe, expect, it } from 'vitest'
import { createSeed } from '@/entities/generation-task'
import { initialState, queueReducer } from './queueReducer'

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
    const s = queueReducer(initialState, { type: 'INIT_ERROR' })
    expect(s.phase).toBe('error')
  })
})
```

- [ ] **Step 4: Run — expect FAIL**

Run: `pnpm test -- src/features/generation-queue/model/queueReducer.test.ts`
Expected: FAIL (`queueReducer` не определён).

- [ ] **Step 5: Reducer skeleton + INIT cases**

```ts
// queueReducer.ts
import type { GenerationTask } from '@/entities/generation-task'
import type { QueueAction } from './actions'

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
    default:
      return state
  }
}
```

- [ ] **Step 6: Run — expect PASS**

Run: `pnpm test -- src/features/generation-queue/model/queueReducer.test.ts`
Expected: PASS (3 теста).

- [ ] **Step 7: Commit**

```bash
git add src/features/generation-queue/model/{constants,actions,queueReducer}.ts src/features/generation-queue/model/queueReducer.test.ts
git commit -m "feat(queue): reducer skeleton + INIT actions"
```

---

### Task 2: TICK — прогресс, сбой, завершение

**Files:**
- Modify: `src/features/generation-queue/model/queueReducer.ts` (case `TICK`)
- Test: `src/features/generation-queue/model/queueReducer.test.ts`

**Interfaces:**
- Consumes: `queueReducer`, `base`, `FAIL_RATE`.
- Produces: поведение `TICK` для running-задач (без продвижения очереди — это Task 3).

- [ ] **Step 1: Failing tests**

```ts
// добавить в queueReducer.test.ts
import { FAIL_RATE } from './constants'
import type { GenerationTask, RunningTask } from '@/entities/generation-task'

const runningTask = (over: Partial<RunningTask> = {}): RunningTask => ({
  id: 'r1', type: 'image', status: 'running', prompt: 'p', model: 'm',
  credits: 5, estimatedDurationMs: 10_000, createdAt: 0, progress: 50, startedAt: 0, ...over,
})

const ready = (tasks: GenerationTask[], queueOrder: string[] = []): import('./queueReducer').QueueState => ({
  phase: 'ready', tasks: Object.fromEntries(tasks.map((t) => [t.id, t])), queueOrder, undo: null,
})

const noFail = { jitter: 1, failRoll: 0.999, errorMsg: 'x' }

describe('queueReducer · TICK прогресс', () => {
  it('progress растёт на step×jitter (step=100×dt/estDur) с clamp', () => {
    const s = ready([runningTask({ estimatedDurationMs: 10_000, progress: 0 })])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: { r1: noFail } })
    // step = 100*500/10000 = 5
    expect(out.tasks.r1.progress).toBe(5)
  })

  it('progress ≥ 100 → done (100, finishedAt)', () => {
    const s = ready([runningTask({ progress: 99, estimatedDurationMs: 1_000 })])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 42, perTask: { r1: noFail } })
    const t = out.tasks.r1
    expect(t.status).toBe('done')
    expect(t.progress).toBe(100)
    if (t.status === 'done') expect(t.finishedAt).toBe(42)
  })

  it('failRoll < p_fail → failed с error и finishedAt; прогресс фиксируется', () => {
    const s = ready([runningTask({ progress: 30, estimatedDurationMs: 10_000 })])
    // p_fail = 0.15*500/10000 = 0.0075
    const out = queueReducer(s, {
      type: 'TICK', dtMs: 500, now: 7,
      perTask: { r1: { jitter: 1, failRoll: 0.001, errorMsg: 'Превышено время ожидания' } },
    })
    const t = out.tasks.r1
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- src/features/generation-queue/model/queueReducer.test.ts`
Expected: FAIL (TICK падает в default, не меняет задачу).

- [ ] **Step 3: Implement TICK (прогресс/сбой/финиш)**

Добавить `import { FAIL_RATE } from './constants'` и `case 'TICK'` ДО `default`:

```ts
case 'TICK': {
  if (state.phase !== 'ready') return state
  const { dtMs, now, perTask } = action
  const tasks = { ...state.tasks }

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
    const next = Math.min(100, Math.max(0, t.progress + step * roll.jitter))
    if (next >= 100) {
      tasks[id] = { ...base(t), status: 'done', progress: 100, startedAt: t.startedAt, finishedAt: now }
    } else {
      tasks[id] = { ...base(t), status: 'running', progress: next, startedAt: t.startedAt }
    }
  }

  return { ...state, tasks }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `pnpm test -- src/features/generation-queue/model/queueReducer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/generation-queue/model/queueReducer.ts src/features/generation-queue/model/queueReducer.test.ts
git commit -m "feat(queue): TICK progress/fail/done transitions"
```

---

### Task 3: TICK — продвижение очереди, лимит слотов

**Files:**
- Modify: `src/features/generation-queue/model/queueReducer.ts` (TICK: продвижение после прогресса)
- Test: `src/features/generation-queue/model/queueReducer.test.ts`

**Interfaces:**
- Consumes: `MAX_CONCURRENT`.
- Produces: после прогресса в TICK — старт `queued→running` пока есть слоты; новая задача стартует с `progress:0`, `startedAt:now`.

- [ ] **Step 1: Failing tests**

```ts
import { MAX_CONCURRENT } from './constants'
import type { QueuedTask } from '@/entities/generation-task'

const queuedTask = (id: string, over: Partial<QueuedTask> = {}): QueuedTask => ({
  id, type: 'text', status: 'queued', prompt: 'p', model: 'm',
  credits: 1, estimatedDurationMs: 8_000, createdAt: 0, progress: 0, ...over,
})

describe('queueReducer · TICK продвижение очереди', () => {
  it('при running==MAX_CONCURRENT queued не стартует', () => {
    const s = ready(
      [runningTask({ id: 'r1' }), runningTask({ id: 'r2' }), queuedTask('q1')],
      ['q1'],
    )
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: { r1: noFail, r2: noFail } })
    expect(out.tasks.q1.status).toBe('queued')
    expect(out.queueOrder).toEqual(['q1'])
  })

  it('освободился слот → стартует первая из queueOrder (progress 0, startedAt now)', () => {
    const s = ready([queuedTask('q1'), queuedTask('q2')], ['q1', 'q2'])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 99, perTask: {} })
    const t1 = out.tasks.q1
    expect(t1.status).toBe('running')
    if (t1.status === 'running') {
      expect(t1.progress).toBe(0)
      expect(t1.startedAt).toBe(99)
    }
    expect(out.queueOrder).toEqual(['q2'])
  })

  it('заполняет до MAX_CONCURRENT слотов за один TICK', () => {
    const s = ready([queuedTask('q1'), queuedTask('q2'), queuedTask('q3')], ['q1', 'q2', 'q3'])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: {} })
    expect(Object.values(out.tasks).filter((t) => t.status === 'running').length).toBe(MAX_CONCURRENT)
    expect(out.queueOrder).toEqual(['q3'])
  })

  it('пустой queueOrder и свободные слоты → no-op по задачам', () => {
    const s = ready([], [])
    const out = queueReducer(s, { type: 'TICK', dtMs: 500, now: 1, perTask: {} })
    expect(out.queueOrder).toEqual([])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement — продвижение в конце TICK**

Заменить `return { ...state, tasks }` в `case 'TICK'` на блок продвижения:

```ts
  // продвижение очереди ПОСЛЕ обработки прогресса (новая задача тикнёт на следующем TICK)
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
```

Добавить `import { FAIL_RATE, MAX_CONCURRENT } from './constants'`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(queue): TICK slot promotion (MAX_CONCURRENT, FIFO)"
```

---

### Task 4: CANCEL (+guard, без дотиков)

**Files:**
- Modify: `queueReducer.ts` (case `CANCEL`)
- Test: `queueReducer.test.ts`

**Interfaces:**
- Produces: `CANCEL` переводит running/queued → canceled (guard по статусу); queued убирается из queueOrder.

- [ ] **Step 1: Failing tests**

```ts
describe('queueReducer · CANCEL', () => {
  it('running → canceled (фикс progress, finishedAt, startedAt)', () => {
    const s = ready([runningTask({ id: 'r1', progress: 40, startedAt: 5 })])
    const out = queueReducer(s, { type: 'CANCEL', id: 'r1', now: 50 })
    const t = out.tasks.r1
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
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement CANCEL**

```ts
case 'CANCEL': {
  const t = state.tasks[action.id]
  if (!t || (t.status !== 'running' && t.status !== 'queued')) return state
  const tasks = { ...state.tasks }
  tasks[action.id] =
    t.status === 'running'
      ? { ...base(t), status: 'canceled', progress: t.progress, startedAt: t.startedAt, finishedAt: action.now }
      : { ...base(t), status: 'canceled', progress: 0, finishedAt: action.now }
  const queueOrder = state.queueOrder.filter((id) => id !== action.id)
  return { ...state, tasks, queueOrder }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** `git commit -am "feat(queue): CANCEL with status guard, no post-cancel ticks"`

---

### Task 5: RETRY (+guard)

**Files:** Modify `queueReducer.ts`; Test `queueReducer.test.ts`

**Interfaces:** `RETRY` failed/canceled → queued (progress 0, без startedAt/finishedAt/error), push в конец queueOrder.

- [ ] **Step 1: Failing tests**

```ts
describe('queueReducer · RETRY', () => {
  const failed = () => ({
    ...runningTask({ id: 'f1', progress: 60 }), status: 'failed' as const, finishedAt: 1, error: 'e',
  })
  it('failed → queued, в конце queueOrder, progress 0', () => {
    const s = ready([failed(), queuedTask('q1')], ['q1'])
    const out = queueReducer(s, { type: 'RETRY', id: 'f1' })
    const t = out.tasks.f1
    expect(t.status).toBe('queued')
    expect(t.progress).toBe(0)
    expect(out.queueOrder).toEqual(['q1', 'f1'])
  })
  it('RETRY по queued = no-op (guard)', () => {
    const s = ready([queuedTask('q1')], ['q1'])
    expect(queueReducer(s, { type: 'RETRY', id: 'q1' })).toBe(s)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement RETRY**

```ts
case 'RETRY': {
  const t = state.tasks[action.id]
  if (!t || (t.status !== 'failed' && t.status !== 'canceled')) return state
  const tasks = { ...state.tasks }
  tasks[action.id] = { ...base(t), status: 'queued', progress: 0 }
  const queueOrder = [...state.queueOrder.filter((id) => id !== action.id), action.id]
  return { ...state, tasks, queueOrder }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** `git commit -am "feat(queue): RETRY to end of queue with guard"`

---

### Task 6: DELETE / CLEAR_DONE / UNDO (single-level)

**Files:** Modify `queueReducer.ts`; Test `queueReducer.test.ts`

**Interfaces:** `DELETE`/`CLEAR_DONE` пишут `undo`; `UNDO` восстанавливает. НЕ-удаляющие экшены (TICK и др.) `undo` не сбрасывают.

- [ ] **Step 1: Failing tests**

```ts
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
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement DELETE/CLEAR_DONE/UNDO**

```ts
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
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** `git commit -am "feat(queue): DELETE/CLEAR_DONE/UNDO (single-level)"`

---

### Task 7: REORDER + exhaustive default

**Files:** Modify `queueReducer.ts`; Test `queueReducer.test.ts`

**Interfaces:** `REORDER {from,to}` — arrayMove внутри queueOrder; `default` — проверка полноты union через `never`.

- [ ] **Step 1: Failing tests**

```ts
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
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement REORDER + exhaustive default**

```ts
case 'REORDER': {
  const { from, to } = action
  const n = state.queueOrder.length
  if (from < 0 || to < 0 || from >= n || to >= n) return state
  const queueOrder = [...state.queueOrder]
  const [moved] = queueOrder.splice(from, 1)
  queueOrder.splice(to, 0, moved)
  return { ...state, queueOrder }
}
default: {
  const _exhaustive: never = action
  return state
}
```

Удалить прежний простой `default: return state`.

- [ ] **Step 4: Run — expect PASS** (и `pnpm typecheck` — проверка exhaustive)

- [ ] **Step 5: Commit** `git commit -am "feat(queue): REORDER + exhaustive reducer"`

---

### Task 8: Стор Zustand + persist + restore running

**Files:**
- Create: `src/features/generation-queue/model/queueStore.ts`
- Modify: `queueReducer.ts` (добавить `restoreRunningToQueued`)
- Test: `src/features/generation-queue/model/queueStore.test.ts`

**Interfaces:**
- Produces: `useQueueStore` (Zustand hook со полями QueueState + `dispatch`); `restoreRunningToQueued(tasks, queueOrder)`.

- [ ] **Step 1: Failing test (restore round-trip)**

```ts
// queueStore.test.ts
import { describe, expect, it } from 'vitest'
import { restoreRunningToQueued } from './queueReducer'
import type { GenerationTask } from '@/entities/generation-task'

describe('restoreRunningToQueued', () => {
  it('running → queued (progress 0, без startedAt), в начало queueOrder по startedAt', () => {
    const tasks: Record<string, GenerationTask> = {
      r1: { id: 'r1', type: 'video', status: 'running', prompt: 'p', model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 70, startedAt: 200 },
      r2: { id: 'r2', type: 'text', status: 'running', prompt: 'p', model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 30, startedAt: 100 },
      q9: { id: 'q9', type: 'text', status: 'queued', prompt: 'p', model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 0 },
    }
    const res = restoreRunningToQueued(tasks, ['q9'])
    expect(res.tasks.r1.status).toBe('queued')
    expect(res.tasks.r1.progress).toBe(0)
    if (res.tasks.r1.status === 'queued') expect('startedAt' in res.tasks.r1).toBe(false)
    // r2 стартовал раньше (startedAt 100) → раньше в очереди; затем r1; затем существующая q9
    expect(res.queueOrder).toEqual(['r2', 'r1', 'q9'])
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement restoreRunningToQueued (в queueReducer.ts)**

```ts
export function restoreRunningToQueued(
  tasks: Record<string, GenerationTask>,
  queueOrder: string[],
): { tasks: Record<string, GenerationTask>; queueOrder: string[] } {
  const result = { ...tasks }
  const restored: { id: string; startedAt: number }[] = []
  for (const id of Object.keys(result)) {
    const t = result[id]
    if (t.status === 'running') {
      restored.push({ id, startedAt: t.startedAt })
      result[id] = { ...base(t), status: 'queued', progress: 0 }
    }
  }
  restored.sort((a, b) => a.startedAt - b.startedAt)
  return { tasks: result, queueOrder: [...restored.map((r) => r.id), ...queueOrder] }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Implement store**

```ts
// queueStore.ts
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
      partialize: (s) => ({ tasks: s.tasks, queueOrder: s.queueOrder }),
      merge: (persisted, current) => {
        const p = persisted as Partial<QueueState> | undefined
        if (!p?.tasks) return current
        const { tasks, queueOrder } = restoreRunningToQueued(p.tasks, p.queueOrder ?? [])
        return { ...current, tasks, queueOrder, phase: 'loading' }
      },
    },
  ),
)
```

- [ ] **Step 6: Verify** `pnpm test -- src/features/generation-queue/model/queueStore.test.ts` и `pnpm typecheck` — PASS.

- [ ] **Step 7: Commit** `git commit -am "feat(queue): Zustand store + persist + restore running→queued"`

---

### Task 9: Движок (tick-loop, init, retryInit)

**Files:**
- Create: `src/features/generation-queue/model/queueEngine.ts`
- Test: `src/features/generation-queue/model/queueEngine.test.ts`

**Interfaces:**
- Consumes: `useQueueStore`, `createSeed`, константы.
- Produces: `queueEngine.{ start, stop, init, retryInit }`.

- [ ] **Step 1: Failing tests (fake timers)**

```ts
// queueEngine.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueueStore } from './queueStore'
import { queueEngine } from './queueEngine'
import { initialState } from './queueReducer'
import { createSeed } from '@/entities/generation-task'

beforeEach(() => {
  vi.useFakeTimers()
  useQueueStore.setState({ ...initialState, dispatch: useQueueStore.getState().dispatch })
})
afterEach(() => {
  queueEngine.stop()
  vi.useRealTimers()
})

describe('queueEngine', () => {
  it('init: loading → ready с сидом после INIT_DELAY_MS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // не сбой инициализации
    queueEngine.init()
    expect(useQueueStore.getState().phase).toBe('loading')
    vi.advanceTimersByTime(600)
    expect(useQueueStore.getState().phase).toBe('ready')
    expect(Object.keys(useQueueStore.getState().tasks).length).toBeGreaterThan(0)
  })

  it('start крутит тики только при phase ready; stop чистит интервал', () => {
    useQueueStore.setState({ phase: 'ready', tasks: Object.fromEntries(createSeed(0).map((t) => [t.id, t])) })
    queueEngine.start()
    vi.advanceTimersByTime(1500)
    queueEngine.stop()
    const snapshot = JSON.stringify(useQueueStore.getState().tasks)
    vi.advanceTimersByTime(3000)
    expect(JSON.stringify(useQueueStore.getState().tasks)).toBe(snapshot) // после stop тиков нет
  })

  it('start идемпотентен (повторный вызов не создаёт второй интервал)', () => {
    const spy = vi.spyOn(global, 'setInterval')
    queueEngine.start()
    queueEngine.start()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('retryInit из error повторяет init', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    useQueueStore.setState({ phase: 'error' })
    queueEngine.retryInit()
    vi.advanceTimersByTime(600)
    expect(useQueueStore.getState().phase).toBe('ready')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement engine**

```ts
// queueEngine.ts
import { createSeed } from '@/entities/generation-task'
import type { TickRoll } from './actions'
import { useQueueStore } from './queueStore'
import {
  ERROR_MESSAGES, FAIL_RATE, INIT_DELAY_MS, INIT_FAIL_RATE, JITTER_RANGE, TICK_INTERVAL_MS,
} from './constants'

let intervalId: ReturnType<typeof setInterval> | null = null
let initTimer: ReturnType<typeof setTimeout> | null = null

function randomRoll(): TickRoll {
  const [lo, hi] = JITTER_RANGE
  return {
    jitter: lo + Math.random() * (hi - lo),
    failRoll: Math.random(),
    errorMsg: ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)],
  }
}

function onTick() {
  const s = useQueueStore.getState()
  if (s.phase !== 'ready') return
  const perTask: Record<string, TickRoll> = {}
  for (const id of Object.keys(s.tasks)) {
    if (s.tasks[id].status === 'running') perTask[id] = randomRoll()
  }
  s.dispatch({ type: 'TICK', dtMs: TICK_INTERVAL_MS, now: Date.now(), perTask })
}

export const queueEngine = {
  start() {
    if (intervalId !== null) return
    intervalId = setInterval(onTick, TICK_INTERVAL_MS)
  },
  stop() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  },
  init() {
    const { dispatch } = useQueueStore.getState()
    dispatch({ type: 'INIT_START' })
    if (initTimer) clearTimeout(initTimer)
    initTimer = setTimeout(() => {
      if (Math.random() < INIT_FAIL_RATE) dispatch({ type: 'INIT_ERROR' })
      else dispatch({ type: 'INIT_SUCCESS', tasks: createSeed(Date.now()) })
    }, INIT_DELAY_MS)
  },
  retryInit() {
    if (useQueueStore.getState().phase === 'error') this.init()
  },
}

// FAIL_RATE импортирован для согласованности констант движка с reducer (используется в reducer).
void FAIL_RATE
```

> Примечание: `FAIL_RATE` не используется в движке (он в reducer) — убрать импорт и строку `void FAIL_RATE`, если линтер ругается. Оставлено только чтобы подчеркнуть единый источник констант; в реализации удалить неиспользуемый импорт.

- [ ] **Step 4: Run — expect PASS** (`pnpm test -- .../queueEngine.test.ts`)

- [ ] **Step 5: Commit** `git commit -am "feat(queue): engine tick-loop, init, retryInit"`

---

### Task 10: Селекторы

**Files:**
- Create: `src/features/generation-queue/model/selectors.ts`
- Test: `src/features/generation-queue/model/selectors.test.ts`

**Interfaces:**
- Produces: `QueueFilters`, `selectCounts`, `selectVisibleTasks`, `selectQueuePosition`, `selectActiveAggregate`.

- [ ] **Step 1: Failing tests**

```ts
// selectors.test.ts
import { describe, expect, it } from 'vitest'
import type { GenerationTask } from '@/entities/generation-task'
import type { QueueState } from './queueReducer'
import { selectActiveAggregate, selectCounts, selectQueuePosition, selectVisibleTasks } from './selectors'

const mk = (over: Partial<GenerationTask> & Pick<GenerationTask, 'id' | 'status'>): GenerationTask =>
  ({ type: 'text', prompt: 'p', model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 0, ...over } as GenerationTask)

const state = (tasks: GenerationTask[], queueOrder: string[] = []): QueueState =>
  ({ phase: 'ready', tasks: Object.fromEntries(tasks.map((t) => [t.id, t])), queueOrder, undo: null })

describe('selectors', () => {
  it('selectCounts считает по статусам + total', () => {
    const s = state([
      mk({ id: 'a', status: 'queued' }), mk({ id: 'b', status: 'running', progress: 10, startedAt: 0 }),
      mk({ id: 'c', status: 'done', progress: 100, startedAt: 0, finishedAt: 1 }),
      mk({ id: 'd', status: 'failed', progress: 5, startedAt: 0, finishedAt: 1, error: 'e' }),
    ])
    expect(selectCounts(s)).toEqual({ queued: 1, running: 1, done: 1, failed: 1, total: 4 })
  })

  it('selectVisibleTasks: фильтр по статусу', () => {
    const s = state([mk({ id: 'a', status: 'queued' }), mk({ id: 'b', status: 'done', progress: 100, startedAt: 0, finishedAt: 1 })])
    const out = selectVisibleTasks(s, { status: 'queued', search: '', sort: 'newest' })
    expect(out.map((t) => t.id)).toEqual(['a'])
  })

  it('selectVisibleTasks: поиск по prompt и сортировка newest', () => {
    const s = state([
      mk({ id: 'a', status: 'queued', prompt: 'кот', createdAt: 1 }),
      mk({ id: 'b', status: 'queued', prompt: 'собака', createdAt: 2 }),
    ])
    expect(selectVisibleTasks(s, { status: 'all', search: 'кот', sort: 'newest' }).map((t) => t.id)).toEqual(['a'])
    expect(selectVisibleTasks(s, { status: 'all', search: '', sort: 'newest' }).map((t) => t.id)).toEqual(['b', 'a'])
    expect(selectVisibleTasks(s, { status: 'all', search: '', sort: 'oldest' }).map((t) => t.id)).toEqual(['a', 'b'])
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
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement selectors**

```ts
// selectors.ts
import type { GenerationTask, GenType, TaskStatus } from '@/entities/generation-task'
import type { QueueState } from './queueReducer'

export interface QueueFilters {
  status: TaskStatus | 'all'
  type?: GenType | 'all'
  search: string
  sort: 'newest' | 'oldest' | 'status' | 'progress'
}

export function selectCounts(s: QueueState) {
  let queued = 0, running = 0, done = 0, failed = 0, total = 0
  for (const id in s.tasks) {
    total++
    switch (s.tasks[id].status) {
      case 'queued': queued++; break
      case 'running': running++; break
      case 'done': done++; break
      case 'failed': failed++; break
    }
  }
  return { queued, running, done, failed, total }
}

const STATUS_ORDER: Record<TaskStatus, number> = { running: 0, queued: 1, failed: 2, canceled: 3, done: 4 }

export function selectVisibleTasks(s: QueueState, f: QueueFilters): GenerationTask[] {
  let list = Object.values(s.tasks)
  if (f.status !== 'all') list = list.filter((t) => t.status === f.status)
  if (f.type && f.type !== 'all') list = list.filter((t) => t.type === f.type)
  const q = f.search.trim().toLowerCase()
  if (q) list = list.filter((t) => t.prompt.toLowerCase().includes(q))
  const sorted = [...list]
  switch (f.sort) {
    case 'newest': sorted.sort((a, b) => b.createdAt - a.createdAt); break
    case 'oldest': sorted.sort((a, b) => a.createdAt - b.createdAt); break
    case 'progress': sorted.sort((a, b) => b.progress - a.progress); break
    case 'status': sorted.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]); break
  }
  return sorted
}

export function selectQueuePosition(s: QueueState, id: string): number | null {
  const i = s.queueOrder.indexOf(id)
  return i < 0 ? null : i + 1
}

export function selectActiveAggregate(s: QueueState) {
  const running = Object.values(s.tasks).filter((t) => t.status === 'running')
  const queued = Object.values(s.tasks).filter((t) => t.status === 'queued')
  const avgProgress = running.length
    ? Math.round(running.reduce((sum, t) => sum + t.progress, 0) / running.length)
    : 0
  return { activeCount: running.length + queued.length, avgProgress }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** `git commit -am "feat(queue): selectors (counts, visible, position, aggregate)"`

---

### Task 11: Публичные хуки + index.ts

**Files:**
- Create: `src/features/generation-queue/model/useQueue.ts`
- Modify: `src/features/generation-queue/index.ts`
- Test: `src/features/generation-queue/model/useQueue.test.tsx`

**Interfaces:**
- Consumes: `useQueueStore`, селекторы, `queueEngine`.
- Produces (публичный API фичи): `useQueue`, `useVisibleTasks`, `useActiveAggregate`, `queueEngine`, тип `QueueFilters`.

- [ ] **Step 1: Failing test (renderHook)**

```ts
// useQueue.test.tsx
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createSeed } from '@/entities/generation-task'
import { useQueueStore } from './queueStore'
import { initialState } from './queueReducer'
import { useActiveAggregate, useQueue } from './useQueue'

describe('useQueue', () => {
  it('counts реактивны; cancel меняет статус', () => {
    const tasks = createSeed(0)
    useQueueStore.setState({ ...initialState, phase: 'ready', tasks: Object.fromEntries(tasks.map((t) => [t.id, t])) })
    const { result } = renderHook(() => useQueue())
    const before = result.current.counts.running
    const runningId = tasks.find((t) => t.status === 'running')!.id
    act(() => result.current.actions.cancel(runningId))
    expect(result.current.counts.running).toBe(before - 1)
  })

  it('useActiveAggregate отдаёт activeCount', () => {
    const { result } = renderHook(() => useActiveAggregate())
    expect(typeof result.current.activeCount).toBe('number')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement hooks**

```ts
// useQueue.ts
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useQueueStore } from './queueStore'
import { queueEngine } from './queueEngine'
import {
  selectActiveAggregate, selectCounts, selectVisibleTasks, type QueueFilters,
} from './selectors'

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

export function useVisibleTasks(filters: QueueFilters) {
  const tasks = useQueueStore((s) => s.tasks)
  return useMemo(
    () => selectVisibleTasks({ phase: 'ready', tasks, queueOrder: [], undo: null }, filters),
    [tasks, filters],
  )
}

export function useActiveAggregate() {
  return useQueueStore(useShallow(selectActiveAggregate))
}
```

- [ ] **Step 4: Public API**

```ts
// src/features/generation-queue/index.ts
export { queueEngine } from './model/queueEngine'
export { useQueue, useVisibleTasks, useActiveAggregate } from './model/useQueue'
export type { QueueFilters } from './model/selectors'
```

- [ ] **Step 5: Run — expect PASS** (`pnpm test`, `pnpm typecheck`, `pnpm lint`)

- [ ] **Step 6: Commit** `git commit -am "feat(queue): public hooks + feature public API"`

---

## Финальная верификация фазы C

- [ ] `pnpm test` — все тесты зелёные.
- [ ] `pnpm typecheck` — без ошибок (exhaustive reducer, DU-переходы).
- [ ] `pnpm lint` — чисто (убрать неиспользуемый импорт `FAIL_RATE` из движка, если был).
- [ ] `pnpm build` — собирается.

---

## Self-Review (по спеке)

- **Покрытие спеки:** автомат §4 → Tasks 1–7; движок §7 → Task 9; стор+persist+restore §8 → Task 8; селекторы §9 → Task 10; useQueue §10 → Task 11; план тестов §12 → распределён по задачам (гонка cancel/tick — Task 4; пустой queueOrder — Task 3; restore round-trip — Task 8; undo не сбрасывается TICK — Task 6; delete running освобождает слот — Task 6).
- **Плейсхолдеры:** нет — весь код приведён.
- **Согласованность типов:** `QueueAction`/`TickRoll` (Task 1) используются единообразно; `now` в TICK/CANCEL, `INIT_START` — заведены в Task 1 и используются в Tasks 2,4,9; `base()` — Task 1, используется в 2–8; `QueueState` — Task 1, потребляется селекторами/стором.
- **Отложено в фазу E:** UI тостов Undo, переключение режимов статус-бара, CSS-сглаживание, debounce поиска (UI). Логика под них готова.
