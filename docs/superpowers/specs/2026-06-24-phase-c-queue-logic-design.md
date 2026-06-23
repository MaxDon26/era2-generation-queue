# Спека фазы C — Логика очереди (`features/generation-queue/model/`)

Статус: ревью пройдено (раунд 1), правки внесены. Дата: 2026-06-24.

## 1. Цель и охват

Спроектировать «мозг» фичи: конечный автомат, движок, стор, селекторы, публичный хук.
Реализация — строго по TDD (тест → код). Охват — только `features/generation-queue/model/`:
`queueReducer.ts`, `queueEngine.ts`, `queueStore.ts` (Zustand), `selectors.ts`, `useQueue.ts`,
`constants.ts`, `actions.ts` (типы экшенов). UI (фаза D) и сквозное (фаза E) — вне охвата.

Опора — согласованная карта требований (разделы 3, 4.4, 4.5, 4.8 ТЗ) и доменная модель Этапа 0
(`GenerationTask` — discriminated union по `status`).

## 2. Принятые решения (из brainstorm)

- **C-1. Единый tick-loop.** Один `setInterval` на весь движок. На тике — один `TICK`-экшен;
  весь пересчёт в чистом `queueReducer`. Один `clearInterval` при остановке (инвариант №5).
- **C-2. Нормированная вероятность сбоя на тик:** `p_fail = FAIL_RATE × dtMs / estimatedDurationMs`.
- **C-3. Шаг прогресса (закрывает §3.4):** `step = 100 × dtMs / estimatedDurationMs`. Задача проходит
  0→100 ровно за `estimatedDurationMs`; video/audio дольше через больший `estimatedDurationMs` в сиде.
  Согласован с C-2: ожидаемое число тиков = `estimatedDurationMs/dt`, суммарная вероятность сбоя ≈ `FAIL_RATE`
  независимо от типа. Применяется как `progress += step × jitter`, затем clamp 0..100.
  Недетерминизм (`failRoll`, `jitter`, `errorMsg`) — в payload, reducer детерминирован.

## 3. Структура состояния

```ts
interface QueueState {
  phase: 'loading' | 'ready' | 'error'   // загрузка фичи (тз.md:4.5), НЕ статус задачи
  tasks: Record<string, GenerationTask>  // нормализованное хранилище (точечный апдейт ссылок)
  queueOrder: string[]                   // id задач в статусе queued, порядок ИСПОЛНЕНИЯ
  undo: UndoSnapshot | null              // single-level snapshot для Undo (delete / clearDone)
}

interface UndoSnapshot {
  label: string                 // для тоста: «Задача удалена» / «Удалено готовых: N»
  removedTasks: GenerationTask[]
  prevQueueOrder: string[]      // восстановить порядок при undo
}
```

**`queueOrder`** содержит **только** id задач в статусе `queued`, в порядке исполнения.
`next = queueOrder[0]`; «позиция в очереди» (тз.md:150) = `indexOf(id)+1`. Источник истины для
порядка — сам `queueOrder`; сортировка по `createdAt` используется ТОЛЬКО для bootstrap из сида (M3).

**Undo — single-level (M2):** хранится один снапшот, перетирается следующим `DELETE`/`CLEAR_DONE`.
Критично: `TICK` и прочие НЕ-удаляющие экшены `undo` НЕ сбрасывают (иначе тост умрёт через тик).
TTL тоста (~5с) — забота UI (фаза D).

## 4. Конечный автомат (переходы + guard'ы)

Все мутирующие экшены применяются ТОЛЬКО если текущий `status` допускает переход, иначе **no-op**
(C2 — корректность при любом порядке `dispatch`, гонка cancel/tick разрешена).

| Переход | Action | Guard | Эффект |
|---|---|---|---|
| `queued → running` | `TICK` | слот свободен & queueOrder≠∅ | `queueOrder[0]`: `running`, `startedAt`, убрать из `queueOrder` |
| `running → running` | `TICK` | — | `progress += step×jitter`, clamp 0..100 |
| `running → done` | `TICK` | progress ≥ 100 | `progress:100`, `finishedAt` |
| `running → failed` | `TICK` | `failRoll < p_fail` | `error=errorMsg`, `finishedAt`, фикс `progress` |
| `running/queued → canceled` | `CANCEL` | status∈{running,queued} | `finishedAt`; running фикс progress, queued убрать из `queueOrder` |
| `failed/canceled → queued` | `RETRY` | status∈{failed,canceled} | `QueuedTask`(progress:0, без startedAt/finishedAt/error); **push в конец** `queueOrder` |
| `* → удалена` | `DELETE` | существует | убрать из `tasks`+`queueOrder`; записать `undo` |
| `done×N → удалены` | `CLEAR_DONE` | — | удалить все `done`; записать `undo` |
| (restore) | `UNDO` | undo≠null | вернуть `removedTasks`+`prevQueueOrder`; очистить undo |
| reorder | `REORDER` | индексы валидны | `arrayMove(queueOrder, from, to)` |
| init | `INIT_SUCCESS`/`INIT_ERROR` | — | `ready`+данные / `error` |

`DOWNLOAD` (done) — UI-заглушка, не action. Создание новых задач — НЕ реализуем (YAGNI).
`RETRY` повторно по уже `queued`/`running` — no-op (guard). `CANCEL` по `done` — no-op (guard, C2).

## 5. Actions и форма `TICK`

```ts
type QueueAction =
  | { type: 'INIT_SUCCESS'; tasks: GenerationTask[] }
  | { type: 'INIT_ERROR' }
  | { type: 'TICK'; dtMs: number; perTask: Record<string, TickRoll> }
  | { type: 'CANCEL'; id: string }
  | { type: 'RETRY'; id: string }
  | { type: 'DELETE'; id: string }
  | { type: 'CLEAR_DONE' }
  | { type: 'REORDER'; from: number; to: number }   // индексы внутри queueOrder (M1)
  | { type: 'UNDO' }
```
```ts
interface TickRoll { jitter: number; failRoll: number; errorMsg: string }
```
`perTask` генерится движком **для каждой текущей running** (из `getState`). `INIT_SUCCESS.tasks`
приходит из движка после задержки; `queueOrder` строит reducer из `queued`-задач, сорт. по `createdAt`.
`retryInit` — НЕ reducer-action, а повторный вызов `engine.init()` (см. §7), валиден из `phase:'error'`.

## 6. `queueReducer` — поведение и инварианты

Чистая функция `(state, action) => state`.
- **clamp `progress`** `min(100,max(0,n))` при каждом изменении (H1 первого ревью домена).
- **DU-переходы:** конструировать целевую форму (RETRY собирает `QueuedTask` и т.д.) — иначе не компилируется.
- **Порядок внутри `TICK` (H4):** (1) для каждой running — прогресс/сбой/финиш; (2) **затем** продвижение
  очереди: пока `running < MAX_CONCURRENT && queueOrder≠∅` — стартовать `queueOrder[0]`. Только что
  стартовавшая задача получает первый прогресс на СЛЕДУЮЩЕМ тике (для неё нет записи в `perTask` — это
  корректно и осознанно).
- **Guard'ы перехода по статусу** для CANCEL/RETRY/DELETE (C2) — см. §4.
- `switch(action.type)` с `default: never` — полнота проверяется компилятором.

## 7. `queueEngine` — жизненный цикл

Тонкая оболочка над стором (стор — глобальный синглтон; единый источник правды).
**Корректность без гонок (H4):** в `onTick` между `getState()` и `dispatch()` нет `await` →
JS однопоточен → snapshot консистентен, TOCTOU отсутствует.

```
start():     если запущен — no-op; id = setInterval(onTick, TICK_INTERVAL_MS)
onTick():    s = getState(); если s.phase!=='ready' → return
             perTask = для каждой running: { jitter, failRoll, errorMsg } (рандом ЗДЕСЬ)
             dispatch(TICK({ dtMs: TICK_INTERVAL_MS, perTask }))
stop():      clearInterval(id); id = null              // идемпотентно
init():      dispatch(phase:'loading'); setTimeout(INIT_DELAY_MS) →
             rand < INIT_FAIL_RATE ? INIT_ERROR : INIT_SUCCESS(createSeed(Date.now()))
retryInit(): валиден из phase:'error' → повторный init()
```
Рандом и `Date.now()` живут ТОЛЬКО здесь. Запуск/остановка — в `QueueProvider` (useEffect cleanup,
фаза D): хотя стор глобален, Provider остаётся точкой жизненного цикла движка (start на mount, stop на unmount).

## 8. Стор Zustand + persist

- `queueStore = create(persist(...))`. `dispatch(action) = set(s => queueReducer(s, action))`.
- **Persist (M2 домена):** ключ `era2-queue`, `partialize → { version:1, tasks, queueOrder }`.
  `migrate`: при несовпадении версии — сброс (re-init). НЕ персистим `phase`, `undo`.
- **Restore running (H3, §4.7):** при гидрации `running → queued` (тип `QueuedTask` форсирует
  `progress:0` и отсутствие `startedAt` — частичный прогресс теряется BY DESIGN, это осознанное
  следствие модели, не баг). Восстановленные вставляются в **начало** `queueOrder`, отсортированные
  по `startedAt` (предсказуемость: продолжатся первыми). Реализация — фаза E, но persist round-trip
  тестируется уже в фазе C (иначе «форма заложена» = непроверенное утверждение).

## 9. Селекторы (`selectors.ts`)

Чистые, **мемоизированные** (reselect-подобно, M4). `TICK` обновляет ссылки только изменившихся
задач (нормализованный Record + точечный апдейт) — список не инвалидируется целиком (важно для
virtualization 1000 задач и optimistic UI).
- `selectCounts` → `{ queued, running, done, failed }` (тз.md:138). Плюс `total` — UI отличает
  «пусто вообще» от «пусто под фильтром» (H2, §4.5).
- `selectVisibleTasks(filters)` → плоский массив (пригоден для windowing): фильтр по статусу +
  тип (бонус) + поиск по `prompt` (debounce на UI) + сортировка (новые/старые; статус/прогресс — бонус).
- `selectQueuePosition(id)` → `indexOf+1` в `queueOrder`.
- `selectActiveAggregate` → `{ activeCount: running+queued, avgProgress }`. **База `avgProgress` —
  среднее ТОЛЬКО по `running`** (H1; иначе queued с progress 0 занижают и дёргают). Селектор отдаёт
  ТОЧНОЕ значение; сглаживание/«не дёргаться» — CSS-transition на UI (фаза D), не логика.

**Drag ↔ сортировка (M1):** `REORDER {from,to}` — индексы внутри `queueOrder`. Drag-to-reorder
доступен ТОЛЬКО в режиме сортировки «порядок очереди» (default); при других сортировках визуальный
порядок queued ≠ queueOrder, поэтому drag отключается (иначе маппинг индексов ломается).

## 10. `useQueue` — публичный API фичи

```ts
useQueue(): {
  phase
  counts                       // selectCounts
  actions: { cancel, retry, remove, clearDone, reorder, undo, retryInit }
}
useVisibleTasks(filters)       // узкий хук под список (мемо-селектор)
useActiveAggregate()           // узкий хук под статус-бар (не ре-рендерится на чужие поля)
```
Экшены — стабильные ссылки. Статус-бар и список подписаны узкими селекторами (единый источник
правды §4.8 — оба читают один стор, дублирования нет).

## 11. Константы (`constants.ts`)

```ts
MAX_CONCURRENT = 2
TICK_INTERVAL_MS = 500           // в диапазоне 400–700 (тз.md:119)
FAIL_RATE = 0.15                 // тз.md:120
INIT_DELAY_MS = 600              // тз.md:162
INIT_FAIL_RATE = 0.1             // эмуляция сбоя инициализации (тз.md:163); демо-значение
JITTER_RANGE = [0.8, 1.2]
ERROR_MESSAGES = ['Недостаточно кредитов','Превышено время ожидания','Модель временно недоступна']
```

## 12. План тестов (TDD)

**`queueReducer` (фокус):**
1. `TICK`: `progress += step×jitter`, clamp 0..100; `step = 100×dt/estimatedDurationMs` (C1).
2. `TICK`: progress ≥ 100 → `done` (100, finishedAt).
3. `TICK`: `failRoll < p_fail` → `failed`(error); `≥ p_fail` → не падает.
4. **Лимит слотов:** running==2 → queued не стартует; running<2 → берётся `queueOrder[0]`.
5. **Порядок:** стартует первая в `queueOrder`; после `REORDER` — новая первая.
6. **Гонка cancel/tick (C2):** оба порядка — `CANCEL` затем `TICK` и `TICK(→done)` затем `CANCEL`;
   во втором случае CANCEL = no-op (done не «оживает»). Аналогично RETRY vs TICK(→failed).
7. `CANCEL` без дотиков: после cancel следующий `TICK` не меняет задачу.
8. `RETRY` failed/canceled → queued, конец `queueOrder`, progress 0; retry по queued = no-op.
9. `DELETE` → нет в tasks/queueOrder; undo заполнен; `UNDO` восстанавливает. **DELETE running →
   слот освобождается** на следующем TICK (L5).
10. `CLEAR_DONE` → удалены все done; `UNDO` возвращает; **`TICK` между delete и undo НЕ сбрасывает undo** (M2).
11. `REORDER` → arrayMove в queueOrder.
12. **Пустой queueOrder + свободные слоты → `TICK` no-op** (H2).
13. **Продвижение очереди (H4):** новая queued→running стартует с progress 0, прогресс — на след. тике.
14. `INIT_SUCCESS` строит queueOrder из queued по createdAt; `INIT_ERROR` → phase error.

**`queueEngine`:** fake timers — `start` создаёт интервал, `stop` чистит (нет тиков после),
идемпотентность `start/stop`, `onTick` no-op при `phase!=='ready'`, `retryInit` из error.

**`persist`:** round-trip сериализация → migrate/rehydrate → running стал queued (progress 0, в начале queueOrder) (H3).

**`selectors`:** counts(+total), фильтр/поиск/сортировка, позиция, `avgProgress` по running, мемоизация (ссылка стабильна без изменений).

## 13. Границы (NON-goals фазы C)

- UI-компоненты, вёрстка, тосты Undo, переключение режимов статус-бара, CSS-сглаживание — фаза D.
- Полная реализация restore-гидрации — фаза E (форма + round-trip тест заложены здесь).
- Реальные сети, создание задач, авторизация — не делаем (раздел 7 ТЗ).
- `prefers-reduced-motion` — UI; model НЕ меняет частоту тиков ради этого (L4).

## 14. Риски

- **Сортировка ↔ queueOrder (M1):** drag только в режиме «порядок очереди» — иначе индексы REORDER не маппятся.
- **avgProgress** считается по running; при 0 running виджет скрыт (activeCount учитывает queued отдельно).
- **Persist** + смена формы → строгая версия схемы + migrate (заложено); round-trip покрыт тестом.
- **Доля сбоев** статистическая (0–3 из 10 за сессию) — соответствует «~15%».
- **INIT_FAIL_RATE** — демо; при частом error-экране можно снизить/отключить.

## 15. Учтено по ревью спеки (раунд 1)

C1 (формула step §3.4), C2 (guard'ы статуса + гонка cancel/tick), H1 (avgProgress по running, CSS-сглаживание),
H2 (retryInit + тест пустого queueOrder + total для пустых видов), H3 (restore: вставка в начало + round-trip тест),
H4 (однопоточность + порядок прогресс→продвижение), M1 (REORDER в queueOrder, drag только в default-сорте),
M2 (single-level undo, TICK не сбрасывает), M3 (источник истины порядка — queueOrder), M4 (мемоизация селекторов,
точечный апдейт ссылок). L1/L4/L5 — отражены в константах/границах/тестах.
```
