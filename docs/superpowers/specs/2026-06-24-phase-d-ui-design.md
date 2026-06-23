# Спека фазы D — UI / Вёрстка (`features/ui`, `widgets`, `pages`, `shared/ui`)

Статус: черновик на ревью. Дата: 2026-06-24.
Примечание: вёрстку реализует пользователь. Документ — координация: контракты данных,
структура, ключевые решения, чтобы UI состыковался с логикой фазы C.

## 1. Цель и охват

Свёрстать экран «Очередь генераций» по макету Figma + глобальный статус-бар, подключив
к готовой логике (`@/features/generation-queue`). Охват: `shared/ui` (примитивы),
`features/generation-queue/ui/*`, `widgets/generation-queue`, `pages/QueuePage`, монтаж в `app`.

Готово к потреблению (фаза C): `QueueProvider`, `useQueue`, `useVisibleTasks`, `useActiveAggregate`,
`queueEngine`, `formatEta/formatDuration/formatCredits`, `QueueFilters`. Токены и шрифты — готовы (`index.css`).

## 2. Контракт данных (хуки → компоненты) — ГЛАВНОЕ для стыковки

```ts
// widget GenerationQueue:
const { phase, counts, actions } = useQueue()
//   phase: 'loading'|'ready'|'error'
//   counts: { queued, running, done, failed, total }
//   actions: { cancel(id), retry(id), remove(id), clearDone(), reorder(from,to), undo(), retryInit() }
const [filters, setFilters] = useState<QueueFilters>({ status:'all', type:'all', search:'', sort:'queue' })
const tasks = useVisibleTasks(filters)   // GenerationTask[]

// глобальный StatusBar (монтируется в app, НЕ внутри widget):
const { activeCount, avgProgress } = useActiveAggregate()
```

Поток: **data down, callbacks up.** Компоненты `ui/*` — «тупые»: получают `task`/`counts`/колбэки,
не лезут в стор сами (кроме self-contained `StatusBar`, который читает `useActiveAggregate`).

## 3. UI-дерево

```
app
├─ <QueueProvider>            // запуск движка
│   └─ Router   /queue → <QueuePage/> → <GenerationQueue/>
│        └─ GenerationQueue (widget)
│             ├─ QueueHeader      (заголовок + «Очистить готовые» → actions.clearDone)
│             ├─ QueueStats       (counts: 4 карточки; mobile 2×2)
│             ├─ QueueToolbar     (чипы статуса · сортировка · поиск · фильтр типа)
│             ├─ <состояние>:
│             │   loading → LoadingState (скелетоны)
│             │   error   → ErrorState (onRetry=actions.retryInit)
│             │   ready & tasks.length===0 → EmptyState (вид зависит от counts.total)
│             │   ready & tasks.length>0   → TaskList
│             │        └─ TaskRow (desktop) / TaskCard (mobile)
│             │             ├─ StatusBadge · ProgressBar · TaskActions
│             └─ UndoToast      (следит за store.undo; кнопка → actions.undo)
└─ <StatusBar/>               // глобально, поверх контента; useActiveAggregate + navigate('/queue')
```

## 4. Компоненты и props-контракты

**shared/ui (примитивы — реализует пользователь):** `Button`, `Chip`, `IconButton` (+ при нужде `Card`, `Skeleton`). Используют ТОЛЬКО semantic-токены (`bg-card`, `text-foreground`…), не raw `era-*`.

**features/generation-queue/ui:**
```ts
TaskRow / TaskCard:  { task: GenerationTask; position: number|null;
                       onCancel(id); onRetry(id); onRemove(id); onDownload(id) }
StatusBadge:         { status: TaskStatus }            // цвет по статусу (тз.md:201)
ProgressBar:         { value: number }                 // 0..100, CSS-transition на width
TaskActions:         { task: GenerationTask; onCancel; onRetry; onRemove; onDownload }
                     // кнопки ПО СТАТУСУ: running/queued→Отмена; failed/canceled→Повторить;
                     // done→Скачать; всегда меню «…»→Удалить (тз.md:154-158)
QueueStats:          { counts }                        // 4 карточки, реактивны
QueueToolbar:        { filters: QueueFilters; onChange(f): void; counts? }
                     // поиск с debounce (внутри toolbar, 300мс) перед onChange
states/EmptyState:   { variant: 'no-tasks'|'no-results' }   // различие по counts.total
states/LoadingState: {}                                // скелетоны
states/ErrorState:   { onRetry(): void }
StatusBar:           {}                                // self-contained: useActiveAggregate + navigate
```

`position` для TaskRow берётся в widget через `selectQueuePosition` (нужно экспонировать
хук `useQueuePosition(id)` или прокинуть map позиций) — см. §11 (уточнение к фазе C).

## 5. Состояния экрана (тз.md:4.5)

- `phase==='loading'` → `LoadingState` (скелетоны строк; эмуляция ~600мс уже в движке).
- `phase==='error'` → `ErrorState` с кнопкой «Повторить» (`actions.retryInit`).
- `phase==='ready'` и `tasks.length===0`:
  - `counts.total===0` → `EmptyState variant='no-tasks'` («Очередь пуста»).
  - иначе → `EmptyState variant='no-results'` («Ничего не найдено под фильтром»).

## 6. Глобальный статус-бар (тз.md:4.8)

Self-contained, монтируется в `app` поверх контента. Источник — `useActiveAggregate()`
(тот же стор, что и страница → счётчики/прогресс всегда совпадают, дублирования нет).

Режимы по `activeCount`:
- `0` → не отрисовывается (`return null`).
- `1` → компактная карточка: спиннер, тип/модель, мини ProgressBar + `avgProgress%`.
- `>1` → раскрытый виджет: «Генерации идут · N активны · X%», мини-список 2–3 задач, кнопка «Открыть очередь →».
- collapsed (бонус) → пилюля «N · X%», разворот по клику (локальный `useState`).

Поведение: клик/«Открыть очередь» → `navigate('/queue')`. «Не дёргается» — CSS `transition`
на появление/высоту/`ProgressBar width`; селектор отдаёт точные значения (логика сглаживания НЕ нужна).
Размещение: desktop/tablet — fixed bottom-right (отступ ~24px); mobile — полноширинная панель снизу,
`padding-bottom: env(safe-area-inset-bottom)`.

## 7. Адаптив (тз.md:4.6)

- Desktop ≥1024: `TaskRow` (строки), статы в ряд.
- Mobile ≤480: `TaskCard` (стек), `QueueStats` 2×2, чипы тулбара — горизонтальный скролл.
- Tablet между — не ломается (промежуточная сетка). Брейкпоинты — Tailwind (`lg:`, `sm:`),
  выбор `TaskRow` vs `TaskCard` — через CSS (`hidden lg:block` / `lg:hidden`) либо один адаптивный компонент.

## 8. Разрешение конфликта №2: виртуализация ↔ framer-motion

`VIRTUALIZE_THRESHOLD = 60`:
- `tasks.length ≤ 60` → обычный рендер в `AnimatePresence` (анимации появления/удаления + layout).
- `tasks.length > 60` → `@tanstack/react-virtual` (windowing) БЕЗ exit-анимаций (enter — лёгкий CSS).

Обоснование: типовой кейс (8–12 задач) получает анимации; «1000 задач» (бонус) — виртуализацию.
На одном списке они несовместимы (виртуализатор размонтирует вне окна → AnimatePresence не отыграет exit).
`prefers-reduced-motion` → анимации отключаются (`useReducedMotion` из framer-motion).

## 9. Бонусы в UI

- **drag-reorder** (`@dnd-kit`): только среди `queued`, только при `filters.sort==='queue'` (визуальный
  порядок = `queueOrder`); `onDragEnd` → `actions.reorder(from, to)` (индексы в `queueOrder`). При других
  сортировках drag отключён (см. §11).
- **виртуализация** — §8.
- **анимации** (framer-motion) — §8 + hover/progress.
- **a11y**: семантика (`<button>`, `role`), `aria-live="polite"` на статус-баре и прогрессе,
  фокус-кольца (`ring`), управление с клавиатуры, `prefers-reduced-motion`.
- **светлая тема**: токены готовы (`:root` light / `.dark`); переключатель — `data`/класс на `<html>`.
- **undo**: `UndoToast` следит за `store.undo` (через узкий селектор), кнопка → `actions.undo`,
  авто-скрытие ~5с (локальный таймер). TTL не трогает стор (undo живёт до следующего delete).

## 10. Композиция и роутинг

- `app`: `<QueueProvider>` оборачивает роутер; `<StatusBar/>` монтируется рядом (поверх).
- Роутинг: `react-router-dom`, `/queue` → `QueuePage` → `GenerationQueue`. (Уже в `App.tsx` из фазы A — расширить.)
- `pages/QueuePage` — тонкая: рендерит `<GenerationQueue/>`.

## 11. Уточнения к фазе C (нужны для UI)

1. **Сорт `'queue'`** — для drag нужен режим, где queued идут в порядке `queueOrder`. Предложение:
   добавить в `QueueFilters.sort` вариант `'queue'` (default) и в `selectVisibleTasks` ветку:
   running → queued(по queueOrder) → done/failed/canceled(по createdAt desc). Drag активен только при нём.
   ⚠ Это правка фазы C (`selectors.ts` + тест) — согласовать перед реализацией.
2. **`useQueuePosition(id)`** — экспонировать узкий хук поверх `selectQueuePosition` (для меты TaskRow).

## 12. План (порядок снизу вверх) + чеклист требований

Порядок: `shared/ui` примитивы → `features/ui` атомы (StatusBadge, ProgressBar) → TaskActions →
TaskRow/TaskCard → QueueStats/QueueToolbar → states → TaskList (+virtual/dnd/animate) →
StatusBar → widget GenerationQueue → page/app/routing → UndoToast.

Чеклист раздела 4 ТЗ:
- [ ] 4.1 заголовок + «Очистить готовые» (+undo)
- [ ] 4.2 4 счётчика реактивны
- [ ] 4.3 чипы статуса · сортировка · поиск(debounce) · фильтр типа(бонус)
- [ ] 4.4 строка/карточка: иконка по типу, промпт(обрезка), пилюля+мета(ETA/длит/кредиты/позиция), бейдж, прогресс, ошибка, действия по статусу
- [ ] 4.5 empty/loading/error
- [ ] 4.6 адаптив desktop/mobile
- [ ] 4.7 персист (логика готова; проверить в UI)
- [ ] 4.8 глобальный статус-бар + состояния
- [ ] бонусы: undo, virtualization, drag, a11y, framer-motion, светлая тема

## 13. Риски

- Конфликт сорт↔drag (§11.1) — без сорта `'queue'` drag не маппится на `queueOrder`.
- Виртуализация ↔ анимации (§8) — порог; не пытаться совместить на одном списке.
- Статус-бар «дёрганье» — только CSS-transition, не перерасчёт логики.
- StrictMode double-mount QueueProvider — init идемпотентен по таймеру, start/stop идемпотентны (проверено).
