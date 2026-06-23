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

- Контейнер состояния: Zustand + чистый `queueReducer` (тестируемый конечный автомат).
- _Персистентность running-задач при восстановлении_ — TBD (фаза E).
- _drag-reorder ↔ FIFO `createdAt`_ — TBD (фаза B).
- _виртуализация ↔ анимации списка_ — TBD (фаза D).
- _Роутинг_ — react-router-dom, маршрут `/queue`.
- _Шрифт Geist / фолбэк_ — TBD (фаза D).
