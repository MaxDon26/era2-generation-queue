# ERA2 — Очередь генераций

Экран «Очередь генераций» для ERA2 с «живым» клиентским движком очереди (бэкенда нет —
асинхронность эмулируется на клиенте). Реализация тестового задания (`тз.md`).

## Стек

- React 19 + TypeScript (strict)
- Vite
- Tailwind CSS v4 (CSS-first, `@theme`)
- Zustand (+ `persist` → localStorage)
- lucide-react
- react-router-dom (роутинг до `/queue`)
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

## Решения (заполняется по ходу реализации)

- **Контейнер состояния:** Zustand + чистый `queueReducer` (тестируемый конечный автомат).
  Недетерминизм (рандом-шаг прогресса, ~15% сбой, время) инъектируется в payload экшена —
  reducer остаётся чистым.
- **Доменная модель:** `GenerationTask` — discriminated union по `status`, исключает
  нелегальные состояния (`queued` с `error` и т.п.) на уровне типов. Сущность чистая:
  не знает позицию в очереди, не хранит вычислимое (ETA, позиция, превью).
- **drag-reorder ↔ FIFO `createdAt`** — РЕШЕНО: порядок исполнения очереди хранится
  отдельным массивом `queueOrder: string[]` в слое feature (не в сущности). Движок берёт
  следующую `queued` = первая в `queueOrder`. `createdAt` — для сортировки «новые/старые».
- **Инвариант `progress` 0–100** — гарантируется reducer (clamp), не типом (фаза C).
- **Персистентность (localStorage, тз.md:4.7):**
  - при восстановлении `running → queued` reducer сбрасывает `progress: 0` и удаляет
    `startedAt` (приведение к форме `QueuedTask`); решение реализуется в фазе E.
  - persist-обёртка хранит версию схемы `{ version, tasks }`; при несовпадении версии —
    сброс на сид. Версия живёт в persist-слое feature, не в сущности (фаза C/E).
- **Роутинг** — react-router-dom, маршрут `/queue`.
- _виртуализация ↔ анимации списка_ — TBD (фаза D).
- _Шрифт Geist / фолбэк_ — TBD (фаза D).
