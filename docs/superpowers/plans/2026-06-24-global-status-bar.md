# Global Status Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Плавающий глобальный индикатор активных генераций («менеджер загрузок») поверх любого экрана, читающий тот же стор, что и `/queue`.

**Architecture:** Движок (`QueueProvider`) поднимается в `App` и работает на всех маршрутах. `<StatusBar/>` монтируется вне `Routes`, диспетчеризует состояния (mobile-compact / pill / single / multi) по `useActiveAggregate` + `useActiveTasks` + `useStatusBarCollapsed` + `useLocation`. Анимации — framer-motion (два уровня `AnimatePresence`). Демо-фон — `ChatPage` на `/chat`.

**Tech Stack:** React 19 (ref как проп, без forwardRef), TypeScript strict, Tailwind v4 (semantic-токены), zustand (+persist), react-router-dom v7, framer-motion, lucide-react. Тесты: Vitest + Testing Library.

## Global Constraints

- React 19: `ref` — обычный проп, без `forwardRef`. Варианты — `cn()` + мапы на уровне модуля.
- Только semantic-токены (`bg-card`, `text-foreground`, `border-border`, `text-primary`…), кроме фиксированных raw из дампа.
- Стиль бара: фон `bg-secondary` (#1a1614), border `border-primary` (#e85420), pill `rounded-full`, карточки `rounded-panel`(18), mobile `rounded-control`(14). Мета — `text-foreground-secondary` (НЕ `muted-foreground`).
- Спиннер `Loader2` — `animate-spin motion-reduce:animate-none`, `aria-hidden`.
- Прогресс-бары в баре — `aria-hidden`; проценты — видимый текст. `aria-live` только на announcer при смене состояния, НЕ на тиках.
- FSD: импорт между слайсами только через `index.ts`. Бар читает один `queueStore` (без дублирования состояния).
- Источник истины спеки: `docs/superpowers/specs/2026-06-24-global-status-bar-design.md`.

---

### Task 1: Тип `ActiveTask` + селектор `selectActiveTasks`

**Files:**
- Modify: `src/entities/generation-task/model/types.ts` (добавить `ActiveTask`)
- Modify: `src/entities/generation-task/index.ts` (экспорт `ActiveTask`)
- Modify: `src/features/generation-queue/model/selectors.ts` (добавить `selectActiveTasks`)
- Test: `src/features/generation-queue/model/selectors.test.ts` (дополнить)

**Interfaces:**
- Produces: `type ActiveTask = RunningTask | QueuedTask`; `selectActiveTasks(s: Pick<QueueState,'tasks'|'queueOrder'>, limit: number): ActiveTask[]` — running (desc `progress`, tiebreak asc `startedAt`) затем queued (по `queueOrder`), срез `limit`.

- [ ] **Step 1: Failing test** — добавить в `selectors.test.ts`:

```ts
import { selectActiveTasks } from './selectors'
import type { QueuedTask, RunningTask } from '@/entities/generation-task'

describe('selectActiveTasks', () => {
  const run = (id: string, progress: number, startedAt: number): RunningTask => ({
    id, type: 'image', status: 'running', prompt: id, model: 'm', credits: 1,
    estimatedDurationMs: 1000, createdAt: 0, progress, startedAt,
  })
  const queued = (id: string): QueuedTask => ({
    id, type: 'text', status: 'queued', prompt: id, model: 'm', credits: 1,
    estimatedDurationMs: 1000, createdAt: 0, progress: 0,
  })

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
})
```

- [ ] **Step 2: Run, verify fail** — `pnpm test -- selectors` → FAIL («selectActiveTasks is not a function»).

- [ ] **Step 3: Implement** — в `types.ts` после union `GenerationTask` добавить:

```ts
/** Активная задача (для статус-бара): только обрабатывается или ждёт. */
export type ActiveTask = RunningTask | QueuedTask
```

В `entities/generation-task/index.ts` добавить `ActiveTask` в `export type { ... }`.
В `selectors.ts` (импортировать `ActiveTask`, `RunningTask`, `QueuedTask` из `@/entities/generation-task`):

```ts
export function selectActiveTasks(
  s: Pick<QueueState, 'tasks' | 'queueOrder'>,
  limit: number,
): ActiveTask[] {
  const all = Object.values(s.tasks)
  const running = all
    .filter((t): t is RunningTask => t.status === 'running')
    .sort((a, b) => b.progress - a.progress || a.startedAt - b.startedAt)
  const queued = all
    .filter((t): t is QueuedTask => t.status === 'queued')
    .sort((a, b) => s.queueOrder.indexOf(a.id) - s.queueOrder.indexOf(b.id))
  return [...running, ...queued].slice(0, limit)
}
```

- [ ] **Step 4: Run, verify pass** — `pnpm test -- selectors` → PASS. Затем `pnpm typecheck` → чисто.

- [ ] **Step 5: Commit**

```bash
git add src/entities/generation-task src/features/generation-queue/model/selectors.ts src/features/generation-queue/model/selectors.test.ts
git commit -m "feat(queue): ActiveTask type + selectActiveTasks selector"
```

---

### Task 2: Хук `useActiveTasks`

**Files:**
- Modify: `src/features/generation-queue/model/useQueue.ts`
- Modify: `src/features/generation-queue/index.ts` (экспорт `useActiveTasks`)
- Test: `src/features/generation-queue/model/useQueue.test.tsx` (дополнить)

**Interfaces:**
- Consumes: `selectActiveTasks` (Task 1).
- Produces: `useActiveTasks(limit: number): ActiveTask[]`.

- [ ] **Step 1: Failing test** — добавить:

```ts
import { renderHook } from '@testing-library/react'
import { useActiveTasks } from './useQueue'
import { useQueueStore } from './queueStore'

it('useActiveTasks возвращает активные с лимитом', () => {
  useQueueStore.setState({
    tasks: {
      a: { id: 'a', type: 'image', status: 'running', prompt: 'a', model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 40, startedAt: 1 },
      b: { id: 'b', type: 'text', status: 'queued', prompt: 'b', model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 0 },
    },
    queueOrder: ['b'],
  })
  const { result } = renderHook(() => useActiveTasks(3))
  expect(result.current.map((t) => t.id)).toEqual(['a', 'b'])
})
```

- [ ] **Step 2: Run, verify fail** — `pnpm test -- useQueue` → FAIL.

- [ ] **Step 3: Implement** — в `useQueue.ts` (импортировать `selectActiveTasks`, `useMemo` уже есть):

```ts
/** Активные задачи для статус-бара (running→queued, срез limit). */
export function useActiveTasks(limit: number): ActiveTask[] {
  const tasks = useQueueStore((s) => s.tasks)
  const queueOrder = useQueueStore((s) => s.queueOrder)
  return useMemo(() => selectActiveTasks({ tasks, queueOrder }, limit), [tasks, queueOrder, limit])
}
```

Импортировать тип `ActiveTask` из `@/entities/generation-task`. Добавить `useActiveTasks` в реэкспорт в `index.ts` (строка `export { useQueue, ... }`).

- [ ] **Step 4: Run, verify pass** — `pnpm test -- useQueue` → PASS; `pnpm typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/features/generation-queue/model/useQueue.ts src/features/generation-queue/model/useQueue.test.tsx src/features/generation-queue/index.ts
git commit -m "feat(queue): useActiveTasks hook"
```

---

### Task 3: Стор `useStatusBarCollapsed`

**Files:**
- Create: `src/features/generation-queue/model/useStatusBarCollapsed.ts`
- Create: `src/features/generation-queue/model/useStatusBarCollapsed.test.tsx`
- Modify: `src/features/generation-queue/index.ts`

**Interfaces:**
- Produces: `useStatusBarCollapsed` — `{ collapsed: boolean; setCollapsed: (c: boolean) => void; toggle: () => void }`.

- [ ] **Step 1: Failing test**

```ts
import { act, renderHook } from '@testing-library/react'
import { useStatusBarCollapsed } from './useStatusBarCollapsed'

it('toggle переключает collapsed', () => {
  const { result } = renderHook(() => useStatusBarCollapsed())
  expect(result.current.collapsed).toBe(false)
  act(() => result.current.toggle())
  expect(useStatusBarCollapsed.getState().collapsed).toBe(true)
  act(() => result.current.setCollapsed(false))
  expect(useStatusBarCollapsed.getState().collapsed).toBe(false)
})
```

- [ ] **Step 2: Run, verify fail** — FAIL (module not found).

- [ ] **Step 3: Implement** (по образцу `src/shared/lib/theme.ts`):

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StatusBarCollapsedState {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggle: () => void
}

/** Свёрнутость статус-бара (пилюля). Сохраняется в localStorage. */
export const useStatusBarCollapsed = create<StatusBarCollapsedState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: 'era2-statusbar', version: 1 },
  ),
)
```

Экспортировать из `index.ts`: `export { useStatusBarCollapsed } from './model/useStatusBarCollapsed'`.

- [ ] **Step 4: Run, verify pass** — PASS; `pnpm typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/features/generation-queue/model/useStatusBarCollapsed.ts src/features/generation-queue/model/useStatusBarCollapsed.test.tsx src/features/generation-queue/index.ts
git commit -m "feat(queue): useStatusBarCollapsed persisted store"
```

---

### Task 4: Хелперы — метки типов и склонение

**Files:**
- Create: `src/entities/generation-task/model/labels.ts`
- Modify: `src/entities/generation-task/index.ts`
- Create: `src/shared/lib/declineGenerations.ts`
- Create: `src/shared/lib/declineGenerations.test.ts`

**Interfaces:**
- Produces: `GEN_TYPE_LABEL: Record<GenType, string>`; `genTitle(type: GenType): string` («Генерация {…}»); `declineGenerations(count: number): string`.

- [ ] **Step 1: Failing test** (`declineGenerations.test.ts`):

```ts
import { declineGenerations } from './declineGenerations'

it('склоняет «генерация»', () => {
  expect(declineGenerations(0)).toBe('генераций')
  expect(declineGenerations(1)).toBe('генерация')
  expect(declineGenerations(2)).toBe('генерации')
  expect(declineGenerations(5)).toBe('генераций')
  expect(declineGenerations(11)).toBe('генераций')
  expect(declineGenerations(21)).toBe('генерация')
})
```

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement**

`src/shared/lib/declineGenerations.ts`:

```ts
/** Русское склонение слова «генерация» по числу. */
export function declineGenerations(count: number): string {
  const n = Math.abs(count) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return 'генераций'
  if (n1 === 1) return 'генерация'
  if (n1 >= 2 && n1 <= 4) return 'генерации'
  return 'генераций'
}
```

`src/entities/generation-task/model/labels.ts`:

```ts
import type { GenType } from './types'

export const GEN_TYPE_LABEL: Record<GenType, string> = {
  text: 'текста',
  image: 'изображения',
  video: 'видео',
  audio: 'аудио',
}

/** Заголовок для статус-бара: «Генерация изображения» и т.п. */
export function genTitle(type: GenType): string {
  return `Генерация ${GEN_TYPE_LABEL[type]}`
}
```

В `entities/generation-task/index.ts` добавить: `export { GEN_TYPE_LABEL, genTitle } from './model/labels'`.

- [ ] **Step 4: Run, verify pass** — PASS; `pnpm typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/entities/generation-task src/shared/lib/declineGenerations.ts src/shared/lib/declineGenerations.test.ts
git commit -m "feat(queue): gen type labels + declineGenerations helper"
```

---

### Task 5: Поднять движок в App, маршрут `/chat`, каркас StatusBar

**Files:**
- Create: `src/pages/ChatPage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/widgets/generation-queue/ui/GenerationQueue.tsx` (убрать локальный `QueueProvider`)
- Create: `src/features/generation-queue/ui/StatusBar/StatusBar.tsx` (временная заглушка → `null`)
- Modify: `src/features/generation-queue/index.ts`
- Test: `src/app/App.smoke.test.tsx` (дополнить маршрут /chat)

**Interfaces:**
- Consumes: `QueueProvider` (есть).
- Produces: `<StatusBar/>` (пока возвращает `null`); маршрут `/chat`.

- [ ] **Step 1: Failing test** — в `App.smoke.test.tsx` добавить:

```ts
it('рендерит страницу чата на /chat', () => {
  window.history.pushState({}, '', '/chat')
  render(<App />)
  expect(screen.getByText('Чат')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run, verify fail** — `pnpm test -- App.smoke` → FAIL.

- [ ] **Step 3: Implement**

`src/features/generation-queue/ui/StatusBar/StatusBar.tsx` (заглушка, наполнится в Task 9):

```tsx
/** Глобальный статус-бар (диспетчер). Реализуется в Task 9. */
export function StatusBar() {
  return null
}
```

Экспорт в `index.ts`: `export { StatusBar } from './ui/StatusBar/StatusBar'`.

`src/pages/ChatPage.tsx`:

```tsx
import { Header } from '@/widgets/header'

/** Страница-заглушка: фон для демонстрации глобального статус-бара (тз.md:177). */
export function ChatPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto grid min-h-[60vh] w-full max-w-[1120px] place-items-center px-4">
        <p className="text-sm text-muted-foreground">Чат — здесь живёт глобальный статус-бар генераций.</p>
      </main>
    </div>
  )
}
```

`src/app/App.tsx` (поднять провайдер, добавить /chat, смонтировать бар вне Routes):

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueueProvider, StatusBar } from '@/features/generation-queue'
import { ChatPage } from '@/pages/ChatPage'
import { QueuePage } from '@/pages/QueuePage'

export function App() {
  return (
    <BrowserRouter>
      <QueueProvider>
        <Routes>
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/queue" replace />} />
        </Routes>
        <StatusBar />
      </QueueProvider>
    </BrowserRouter>
  )
}
```

В `GenerationQueue.tsx` убрать обёртку `<QueueProvider>` (теперь в App): функция `GenerationQueue` возвращает `<QueueScreen />` напрямую; удалить импорт `QueueProvider` из деструктуризации.

- [ ] **Step 4: Run, verify pass** — `pnpm test` (все), `pnpm typecheck`, `pnpm lint` → чисто. Движок теперь стартует в App; `/queue` работает как раньше.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx src/pages/ChatPage.tsx src/widgets/generation-queue/ui/GenerationQueue.tsx src/features/generation-queue/ui/StatusBar/StatusBar.tsx src/features/generation-queue/index.ts src/app/App.smoke.test.tsx
git commit -m "feat(app): hoist QueueProvider to App, add /chat + StatusBar mount"
```

---

### Task 6: `StatusPill` (свёрнутое состояние)

**Files:**
- Create: `src/features/generation-queue/ui/StatusBar/StatusPill.tsx`
- Create: `src/features/generation-queue/ui/StatusBar/StatusPill.test.tsx`

**Interfaces:**
- Consumes: `declineGenerations` (Task 4).
- Produces: `StatusPill({ activeCount, avgProgress, onExpand })`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it('кнопка с доступным именем и процентом, клик разворачивает', async () => {
    const onExpand = vi.fn()
    render(<StatusPill activeCount={3} avgProgress={47} onExpand={onExpand} />)
    const btn = screen.getByRole('button', { name: /3 генерации.*47%/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(btn)
    expect(onExpand).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement**

```tsx
import { Loader2 } from 'lucide-react'
import { declineGenerations } from '@/shared/lib/declineGenerations'

interface StatusPillProps {
  activeCount: number
  avgProgress: number
  onExpand: () => void
}

export function StatusPill({ activeCount, avgProgress, onExpand }: StatusPillProps) {
  const label = `${activeCount} ${declineGenerations(activeCount)}`
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-expanded={false}
      aria-label={`Развернуть статус: ${label}, ${avgProgress}%`}
      className="inline-flex items-center gap-2 rounded-full border border-primary bg-secondary py-2.5 pl-3.5 pr-4 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary motion-reduce:animate-none" />
      <span className="sr-only">Идёт генерация. </span>
      <span>{label}</span>
      <span className="font-mono font-semibold text-primary">{avgProgress}%</span>
    </button>
  )
}
```

- [ ] **Step 4: Run, verify pass** — PASS; `pnpm typecheck`, `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/features/generation-queue/ui/StatusBar/StatusPill.tsx src/features/generation-queue/ui/StatusBar/StatusPill.test.tsx
git commit -m "feat(statusbar): StatusPill collapsed view"
```

---

### Task 7: `StatusSingle` (одна активная задача)

**Files:**
- Create: `src/features/generation-queue/ui/StatusBar/StatusSingle.tsx`
- Create: `src/features/generation-queue/ui/StatusBar/StatusSingle.test.tsx`

**Interfaces:**
- Consumes: `genTitle` (Task 4), `ProgressBar` (есть), `ActiveTask` (Task 1), `Link` (react-router).
- Produces: `StatusSingle({ task })`.

> [VERIFY перед версткой] Догрузить из `figma/deep_nodes.json` детей `StatusBar/single` (frame `2:1000`-дерево) для пиксельной сверки; при отсутствии — следовать спеке §C/§F.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { RunningTask } from '@/entities/generation-task'
import { StatusSingle } from './StatusSingle'

const task: RunningTask = {
  id: '1', type: 'image', status: 'running', prompt: 'Неоновый город', model: 'Midjourney v6',
  credits: 8, estimatedDurationMs: 15000, createdAt: 0, progress: 64, startedAt: 0,
}

describe('StatusSingle', () => {
  it('показывает заголовок типа, модель, процент, промпт и ссылку на очередь', () => {
    render(<StatusSingle task={task} />, { wrapper: MemoryRouter })
    expect(screen.getByText('Генерация изображения')).toBeInTheDocument()
    expect(screen.getByText(/Midjourney v6/)).toBeInTheDocument()
    expect(screen.getByText(/64%/)).toBeInTheDocument()
    expect(screen.getByText('Неоновый город')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /очередь/i })).toHaveAttribute('href', '/queue')
  })
})
```

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement**

```tsx
import { ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ActiveTask } from '@/entities/generation-task'
import { genTitle } from '@/entities/generation-task'
import { ProgressBar } from '../ProgressBar'

export function StatusSingle({ task }: { task: ActiveTask }) {
  return (
    <div className="w-[332px] rounded-panel border border-primary bg-secondary p-4">
      <div className="flex items-center gap-2.5">
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{genTitle(task.type)}</p>
          <p className="truncate text-xs text-foreground-secondary">
            {task.model} · {task.progress}%
          </p>
        </div>
        <Link
          to="/queue"
          aria-label="Открыть очередь"
          className="shrink-0 rounded-full p-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <p className="mt-3 line-clamp-2 rounded-lg bg-card/60 px-3 py-2 text-xs text-foreground-secondary">
        {task.prompt}
      </p>
      <ProgressBar value={task.progress} aria-hidden="true" className="mt-2 h-[5px] bg-era-bg-3" />
    </div>
  )
}
```

> Примечание: `ProgressBar` принимает `aria-label?`; здесь передаём `aria-hidden` через проп-проброс. Если `ProgressBar` не пробрасывает `aria-hidden`, обернуть в `<div aria-hidden>`.

- [ ] **Step 4: Run, verify pass** — PASS; `pnpm typecheck`, `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/features/generation-queue/ui/StatusBar/StatusSingle.tsx src/features/generation-queue/ui/StatusBar/StatusSingle.test.tsx
git commit -m "feat(statusbar): StatusSingle view"
```

---

### Task 8: `StatusMulti` (несколько активных)

**Files:**
- Create: `src/features/generation-queue/ui/StatusBar/StatusMulti.tsx`
- Create: `src/features/generation-queue/ui/StatusBar/StatusMulti.test.tsx`

**Interfaces:**
- Consumes: `ActiveTask` (Task 1), `Link`, lucide (`ChevronDown`, `Loader2`, `ArrowRight`), `TaskThumb` (есть в `ui/taskParts`).
- Produces: `StatusMulti({ tasks, activeCount, avgProgress, onCollapse })`.

> [VERIFY перед версткой] Догрузить детей `wlist` из `deep_nodes` для пиксельной сверки мини-строки.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveTask } from '@/entities/generation-task'
import { StatusMulti } from './StatusMulti'

const tasks: ActiveTask[] = [
  { id: '1', type: 'image', status: 'running', prompt: 'Город', model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 64, startedAt: 0 },
  { id: '2', type: 'text', status: 'queued', prompt: 'Логотип', model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 0 },
]

describe('StatusMulti', () => {
  it('заголовок, список, сворачивание и переход', async () => {
    const onCollapse = vi.fn()
    render(<StatusMulti tasks={tasks} activeCount={3} avgProgress={47} onCollapse={onCollapse} />, { wrapper: MemoryRouter })
    expect(screen.getByText(/3 активны.*47%/)).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText(/64%/)).toBeInTheDocument()
    expect(screen.getByText('в очереди')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Открыть очередь/i })).toHaveAttribute('href', '/queue')
    await userEvent.click(screen.getByRole('button', { name: /Свернуть/i }))
    expect(onCollapse).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement**

```tsx
import { ArrowRight, ChevronDown, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ActiveTask } from '@/entities/generation-task'
import { TaskThumb } from '../taskParts'

interface StatusMultiProps {
  tasks: ActiveTask[]
  activeCount: number
  avgProgress: number
  onCollapse: () => void
}

export function StatusMulti({ tasks, activeCount, avgProgress, onCollapse }: StatusMultiProps) {
  return (
    <div className="w-[332px] rounded-panel border border-primary bg-secondary">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Генерации идут</p>
          <p className="text-xs text-foreground-secondary">
            {activeCount} активны · {avgProgress}%
          </p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Свернуть статус-бар"
          className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      </div>

      <ul role="list" className="flex flex-col gap-2 px-4 py-2">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2.5">
            <TaskThumb type={task.type} className="size-7 rounded-lg" />
            <span className="min-w-0 flex-1 truncate text-xs text-foreground">{task.prompt}</span>
            {task.status === 'running' ? (
              <span className="shrink-0 font-mono text-xs text-primary">{task.progress}%</span>
            ) : (
              <span className="shrink-0 text-xs text-muted-foreground">в очереди</span>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-4 py-2.5 text-center">
        <Link
          to="/queue"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Открыть очередь
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run, verify pass** — PASS; `pnpm typecheck`, `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/features/generation-queue/ui/StatusBar/StatusMulti.tsx src/features/generation-queue/ui/StatusBar/StatusMulti.test.tsx
git commit -m "feat(statusbar): StatusMulti view"
```

---

### Task 9: Диспетчер `StatusBar` + announcer + mobile + анимация

**Files:**
- Modify: `src/features/generation-queue/ui/StatusBar/StatusBar.tsx` (заменить заглушку)
- Create: `src/features/generation-queue/ui/StatusBar/StatusBar.test.tsx`

**Interfaces:**
- Consumes: `useActiveAggregate`, `useActiveTasks` (Task 2), `useStatusBarCollapsed` (Task 3), `useLocation`, `StatusPill`/`StatusSingle`/`StatusMulti` (Tasks 6-8), `declineGenerations`, framer-motion (`AnimatePresence`, `motion`, `MotionConfig`).
- Produces: `<StatusBar/>`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { StatusBar } from './StatusBar'
import { useQueueStore } from '../../model/queueStore'
import { useStatusBarCollapsed } from '../../model/useStatusBarCollapsed'

function seedActive(n: number) {
  const tasks: Record<string, unknown> = {}
  for (let i = 0; i < n; i++)
    tasks[`r${i}`] = { id: `r${i}`, type: 'image', status: 'running', prompt: `p${i}`, model: 'm', credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 50, startedAt: i }
  useQueueStore.setState({ tasks: tasks as never, queueOrder: [] })
}

afterEach(() => useStatusBarCollapsed.setState({ collapsed: false }))

describe('StatusBar dispatcher', () => {
  it('скрыт на /queue', () => {
    seedActive(2)
    render(<MemoryRouter initialEntries={['/queue']}><StatusBar /></MemoryRouter>)
    expect(screen.queryByText('Генерации идут')).not.toBeInTheDocument()
  })
  it('скрыт при 0 активных', () => {
    useQueueStore.setState({ tasks: {}, queueOrder: [] })
    render(<MemoryRouter initialEntries={['/chat']}><StatusBar /></MemoryRouter>)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
  it('multi при >1 активной вне /queue', () => {
    seedActive(2)
    render(<MemoryRouter initialEntries={['/chat']}><StatusBar /></MemoryRouter>)
    expect(screen.getByText('Генерации идут')).toBeInTheDocument()
  })
  it('pill когда свёрнут', () => {
    seedActive(2)
    useStatusBarCollapsed.setState({ collapsed: true })
    render(<MemoryRouter initialEntries={['/chat']}><StatusBar /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /Развернуть статус/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement**

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { declineGenerations } from '@/shared/lib/declineGenerations'
import { useActiveAggregate, useActiveTasks } from '../../model/useQueue'
import { useStatusBarCollapsed } from '../../model/useStatusBarCollapsed'
import { StatusMulti } from './StatusMulti'
import { StatusPill } from './StatusPill'
import { StatusSingle } from './StatusSingle'

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
}

export function StatusBar() {
  const { activeCount, avgProgress } = useActiveAggregate()
  const tasks = useActiveTasks(3)
  const { collapsed, setCollapsed } = useStatusBarCollapsed()
  const { pathname } = useLocation()

  const visible = activeCount > 0 && pathname !== '/queue'
  const mode = collapsed ? 'pill' : activeCount === 1 ? 'single' : 'multi'

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          key="statusbar"
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.18 }}
          role="complementary"
          aria-label="Статус генераций"
          className="fixed inset-x-3 bottom-3 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end sm:pb-0"
        >
          {/* mobile: компактная полоса; sm+: pill/single/multi */}
          <Link
            to="/queue"
            className="flex w-full items-center gap-2.5 rounded-control border border-primary bg-secondary px-4 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
          >
            <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary motion-reduce:animate-none" />
            <span className="flex-1 text-sm text-foreground">
              {activeCount} {declineGenerations(activeCount)} · {avgProgress}%
            </span>
            <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
          </Link>

          <div className="hidden sm:block">
            {mode === 'pill' && (
              <StatusPill activeCount={activeCount} avgProgress={avgProgress} onExpand={() => setCollapsed(false)} />
            )}
            {mode === 'single' && tasks[0] && <StatusSingle task={tasks[0]} />}
            {mode === 'multi' && (
              <StatusMulti tasks={tasks} activeCount={activeCount} avgProgress={avgProgress} onCollapse={() => setCollapsed(true)} />
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
```

> Анонсер (`aria-live`) добавить как `<div aria-live="polite" className="sr-only">` с эффектом, реагирующим на смену `mode`/`activeCount` (не на `avgProgress`). Реализовать через `useRef` предыдущего состояния + `useEffect([mode, activeCount])`, пишущий строку «Идёт N генераций» / «Генерации завершены». Прогресс в зависимостях НЕ указывать.
> Обернуть приложение в `<MotionConfig reducedMotion="user">` в `App` (импорт из framer-motion) — добавить в Task 5-файл при интеграции либо здесь вокруг `AnimatePresence`.

- [ ] **Step 4: Run, verify pass** — `pnpm test -- StatusBar` PASS; `pnpm typecheck`, `pnpm lint`.

- [ ] **Step 5: Commit**

```bash
git add src/features/generation-queue/ui/StatusBar/StatusBar.tsx src/features/generation-queue/ui/StatusBar/StatusBar.test.tsx
git commit -m "feat(statusbar): dispatcher + mobile + animation + announcer"
```

---

### Task 10: Навигация в Header (`/queue` ↔ `/chat`)

**Files:**
- Modify: `src/widgets/header/ui/Header.tsx`
- Test: `src/widgets/header/ui/Header.test.tsx` (создать, если нет)

**Interfaces:**
- Consumes: `NavLink` (react-router).
- Produces: ссылки «Очередь»/«Чат» с `aria-current`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Header } from './Header'

describe('Header nav', () => {
  it('ссылка активной страницы помечена aria-current', () => {
    render(<MemoryRouter initialEntries={['/queue']}><Header /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Очередь' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Чат' })).not.toHaveAttribute('aria-current')
  })
})
```

- [ ] **Step 2: Run, verify fail** — FAIL.

- [ ] **Step 3: Implement** — добавить в `Header` (между logo и utils) блок навигации на `NavLink`:

```tsx
import { NavLink } from 'react-router-dom'

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'text-sm font-medium text-foreground' : 'text-sm text-muted-foreground hover:text-foreground'

// в JSX, после logo:
<nav className="hidden items-center gap-4 sm:flex">
  <NavLink to="/queue" className={navClass}>Очередь</NavLink>
  <NavLink to="/chat" className={navClass}>Чат</NavLink>
</nav>
```

`NavLink` сам ставит `aria-current="page"` для активного маршрута. Убедиться, что `Header` рендерится внутри роутера (он уже так используется через страницы).

- [ ] **Step 4: Run, verify pass** — PASS; `pnpm typecheck`, `pnpm lint`, весь `pnpm test`.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/header/ui/Header.tsx src/widgets/header/ui/Header.test.tsx
git commit -m "feat(header): nav links /queue <-> /chat with aria-current"
```

---

## Финальная верификация (после Task 10)
- [ ] `pnpm build` · `pnpm typecheck` · `pnpm lint` · `pnpm test` — всё зелёное.
- [ ] Визуально (dev `pnpm dev`, playwright): открыть `/chat` → бар появляется снизу-справа (desktop) с running-задачами; свернуть → пилюля; 1 активная → single; mobile (390) → компактная полоса снизу; на `/queue` бар скрыт.
- [ ] Проверить «не дёргается»: прогресс растёт плавно, бар не мигает на тиках.

## Self-Review (выполнено автором плана)
- **Spec coverage:** §A→Task5,9; §B→Task1,2,3,4; §C→Task6,7,8,9; §D→Task9; §E→Task9; §F→Task6-9; §G→тесты в каждой; §H→все; §I (YAGNI)→соблюдён. ✓
- **Placeholders:** код приведён в каждом шаге; два `[VERIFY]` (догрузка дерева для пиксельной сверки single/wlist) — это намеренная сверка с макетом при вёрстке, не заглушка логики. ✓
- **Type consistency:** `ActiveTask` един во всех задачах; `selectActiveTasks`/`useActiveTasks` сигнатуры совпадают; пропсы Pill/Single/Multi совпадают с вызовами в Task 9. ✓
