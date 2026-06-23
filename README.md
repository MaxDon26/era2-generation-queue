# ERA2 — Очередь генераций

Экран «Очередь генераций» для ERA2 с «живым» клиентским движком очереди (бэкенда нет —
асинхронность эмулируется на клиенте). Реализация тестового задания (`тз.md`).

## Стек

- React 19 + TypeScript (strict)
- Vite
- Tailwind CSS v4 (CSS-first, `@theme`)
- Zustand (+ `persist` → localStorage)
- lucide-react
- react-router-dom (`/queue` + `/chat`-заглушка для статус-бара)
- Бонусы: `@tanstack/react-virtual` (виртуализация), `@dnd-kit/*` (drag-reorder),
  `framer-motion` (анимации)
- Тесты: Vitest + Testing Library (логика — по TDD)

## Архитектура — Feature-Sliced Design

```
app → pages → widgets → features → entities → shared
```

Импорты между слайсами — только через публичный `index.ts`, без deep-import. Алиас `@/` = `src/`.

## Команды

```sh
pnpm install     # установка зависимостей
pnpm dev         # дев-сервер
pnpm build       # типчек + продакшен-сборка
pnpm test        # юнит-тесты (vitest)
pnpm test:cov    # тесты + покрытие
pnpm lint        # eslint
pnpm typecheck   # tsc -b
```

## Ключевые решения

- **Контейнер состояния:** Zustand + чистый `queueReducer` (тестируемый конечный автомат).
  Недетерминизм (рандом-шаг прогресса, ~15% сбой, время) инъектируется в payload экшена —
  reducer остаётся чистым и детерминированным для юнит-тестов.
- **Доменная модель:** `GenerationTask` — discriminated union по `status`, исключает
  нелегальные состояния (`queued` с `error` и т.п.) на уровне типов. Сущность чистая:
  не знает позицию в очереди, не хранит вычислимое (ETA, позиция, превью).
- **Движок:** единый `setInterval`-тик → один `TICK`-экшен; reducer пересчитывает прогресс,
  сбои (нормированная вероятность `0.15 · dt/estDur` ≈ 15% на задачу) и продвижение очереди
  по слотам (`MAX_CONCURRENT = 2`). Cancel — без «дотиков» by design (единый источник тика).
- **drag-reorder ↔ FIFO:** порядок исполнения — отдельный массив `queueOrder` в слое feature
  (не в сущности). Движок берёт следующую `queued` = первая в `queueOrder`. Drag доступен
  только в режиме сортировки «Очередь» — иначе индексы reorder не маппятся на `queueOrder`.
- **Инвариант `progress` 0–100** — гарантируется reducer (clamp), не типом.
- **Персистентность (localStorage):** running-задачи при восстановлении **продолжают** с
  сохранённым `progress` (вариант «продолжить» из тз.md:4.7); `startedAt` пересчитывается под
  `now`, чтобы длительность/ETA были консистентны (`resumeRunning`). `phase`/`undo` не
  персистятся; версия схемы — сброс на сид при несовпадении.
- **Статус-бар:** единый источник правды со страницей — оба читают один стор
  (`useActiveAggregate` / `useActiveTasks`), дублирования состояния нет.
- **Виртуализация ↔ анимации:** порог `60` — ниже идёт обычный рендер с framer-motion
  (появление/удаление), выше — `@tanstack/react-virtual` без exit-анимаций (несовместимы
  с windowing). Все анимации гасятся при `prefers-reduced-motion`.
- **Undo:** single-level snapshot на `delete` / «очистить готовые»; `TICK` его не сбрасывает.
- **Тема:** тёмная (warm coal) — основная, светлая — бонус; переключатель через класс `dark`
  на `<html>` + `persist` + анти-вспышка inline-скриптом в `index.html`.
- **Шрифт:** Geist / Geist Mono (`@fontsource-variable/*`); фолбэк — Inter, далее `system-ui`.
- **Роутинг:** `react-router-dom`; `/queue` — экран очереди, `/chat` — заглушка-фон для
  демонстрации глобального статус-бара (сам чат не верстается, тз.md:177).
