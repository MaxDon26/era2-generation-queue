# Глобальный статус-бар генераций — дизайн (v2, после ревью)

**Дата:** 2026-06-24 · **Источник:** тз.md §4.8 + доска `Status bar · состояния` (Figma).
**Ревью v1 → v2:** react / a11y / typescript / design-агенты. Изменения помечены ⟲.

## Цель
Плавающий индикатор «менеджер загрузок»: виден поверх любого экрана, пока есть активные
генерации (`running` + `queued`). Читает тот же стор, что и `/queue` — единый источник правды (тз.md:187).
Чат не верстаем — нужна простая страница-фон.

## A. Размещение и жизненный цикл
- `QueueProvider` (запуск/остановка движка) **поднимается из виджета в `App`**, оборачивает `Routes`.
  ⟲ Проверено: `queueEngine.start()` идемпотентен (guard `intervalId !== null`), `stop()` чистит —
  StrictMode-двойной useEffect безопасен.
- ⟲ **Два уровня анимации:**
  1. В `App`: `<AnimatePresence>{shouldShow && <StatusBar key="statusbar"/>}</AnimatePresence>` —
     появление/исчезновение бара (где `shouldShow = activeCount > 0 && pathname !== '/queue'`).
  2. Внутри `StatusBar`: `<AnimatePresence mode="wait"><motion.div key={mode}>…` — смена режима
     (`pill|single|multi`) без перезапуска внешней анимации.
- ⟲ `<MotionConfig reducedMotion="user">` оборачивает бар — framer сам гасит анимации при
  `prefers-reduced-motion` (без prop-drilling флага).
- **Скрыт**, когда `activeCount === 0` **или** `pathname === '/queue'`.
- Позиционирование (`fixed`):
  - desktop/tablet (`sm+`): `bottom-right`, отступ 24px, ширина ~332px (multi) / 300px (single — растягивается в контейнере до 332);
  - ⟲ mobile (`<sm`): **отдельный компактный вид** — полоса на всю ширину снизу, `rounded-control`(14),
    высота ~55px (макет `StatusBar/mobile`), отступы 12px + `env(safe-area-inset-bottom)`. Состав:
    спиннер + «{N} генераци* · {avgProgress}%» + `→` (на `/queue`). Без отдельных single/multi на mobile.
  - ⟲ `<main>` страниц — `scroll-padding-bottom`/нижний отступ под высоту мобильной панели, чтобы бар
    не перекрывал последний элемент.
- Новый маршрут **`/chat`** — `ChatPage`: тёмный фон + `<Header/>` (как `QueuePage`) + подпись-заглушка.
  Навигация: мелкая ссылка в `Header` `/queue` ↔ `/chat` с ⟲ `aria-current="page"` на активной.

## B. Данные (слой model)
- `useActiveAggregate()` → `{ activeCount, avgProgress }` — **уже есть**.
- ⟲ **Новый тип** `ActiveTask = RunningTask | QueuedTask` (в `entities/generation-task/model/types.ts`,
  экспорт из `index.ts`). Сохраняет дискриминацию union на границе feature → UI.
- **Новый** `selectActiveTasks(s, limit): ActiveTask[]` — сначала `running` (по убыванию `progress`,
  ⟲ тайтбрейкер по `startedAt`), затем `queued` (по `queueOrder`); срез до `limit` (инвариант `limit > 0`).
- **Новый** хук `useActiveTasks(limit): ActiveTask[]`:
  ```ts
  export function useActiveTasks(limit: number): ActiveTask[] {
    const tasks = useQueueStore((s) => s.tasks)
    const queueOrder = useQueueStore((s) => s.queueOrder)
    return useMemo(() => selectActiveTasks({ ...state, tasks, queueOrder }, limit),
      [tasks, queueOrder, limit])   // ⟲ limit обязателен в deps
  }
  ```
  ⟲ Подписки узкие (`tasks`, `queueOrder`); результат стабилизирован `useMemo` — без ре-рендера на тик
  с неизменным составом.
- **Новый** стор `useStatusBarCollapsed` (zustand + `persist`, `name: 'era2-statusbar'`, ⟲ `version: 1`):
  ```ts
  interface StatusBarCollapsedState {
    collapsed: boolean                          // дефолт false
    setCollapsed: (collapsed: boolean) => void  // ⟲ явная сигнатура
    toggle: () => void
  }
  ```
- ⟲ `GEN_TYPE_LABEL: Record<GenType, string>` и `declineGenerations(count): string` живут в
  `entities/generation-task` / `shared/lib` (не в UI-компоненте). `declineGenerations(0) → «генераций»`.

## C. Компоненты (`features/generation-queue/ui/StatusBar/`)
Все презентационные — «тупые», получают готовые данные. ⟲ StatusBar **не** вызывает `useQueue().actions`
(тянет `phase`/`counts` → лишние ре-рендеры); навигация — через `<Link>`/`useNavigate`.

- **`StatusBar.tsx`** — диспетчер. Читает `useActiveAggregate`, `useActiveTasks(3)`,
  `useStatusBarCollapsed`, `useLocation`. ⟲ Корневой контейнер: `role="complementary"`
  `aria-label="Статус генераций"`, **не перехватывает фокус** при появлении.
  ⟲ Содержит **announcer** (см. §D-a11y).
- **`StatusPill.tsx`** — collapsed. ⟲ Корень — `<button type="button" aria-expanded={false}`
  `aria-label="Развернуть статус: {N} генераци*, {avgProgress}%">`. Спиннер + «{N} генераци*» + «{X}%».
  `rounded-full`, border `primary`. `onExpand: () => void`.
- **`StatusSingle.tsx`** — `task: ActiveTask` (1 активная). Спиннер + «Генерация {типа}» +
  «{модель} · {progress}%» + ⟲ `<Link to="/queue">` со стрелкой `→` (`aria-label="Открыть очередь"`);
  ниже промпт (обрезка) + `ProgressBar`. ⟲ `ProgressBar` здесь `aria-hidden` (текст `%` — альтернатива).
  Пропсы: `{ task: ActiveTask }`.
- **`StatusMulti.tsx`** — `{ tasks: ActiveTask[]; activeCount; avgProgress; onCollapse }`.
  Заголовок «Генерации идут» + «{N} активны · {X}%» + ⟲ шеврон `<button aria-label="Свернуть статус-бар">`
  (иконка `aria-hidden`, ⟲ min target 24×24); ⟲ мини-список `<ul role="list">`, строки `key={task.id}`
  (мини-иконка + название(обрезка) + `{progress}%` для running / «в очереди» для queued + тонкий
  прогресс у running, `aria-hidden`); ⟲ footer с `border-t border-border` (макет `wf stroke #2d2420`)
  + `<Link to="/queue">` «Открыть очередь →».

### Маппинг (single)
`text → «Генерация текста»`, `image → «Генерация изображения»`, `video → «Генерация видео»`,
`audio → «Генерация аудио»`.

## D. Поведение (диспетчер)
1. `pathname === '/queue'` → не показывать (внешний `AnimatePresence` убирает с анимацией).
2. `activeCount === 0` → не показывать.
3. mobile (`<sm`) → компактная полоса (§A).
4. `collapsed === true` → `<StatusPill>`.
5. `activeCount === 1` → `<StatusSingle>`.
6. иначе → `<StatusMulti>`.

Колбэки: `⌄` → `setCollapsed(true)`; клик Pill → `setCollapsed(false)`; `→`/«Открыть очередь» —
`<Link to="/queue">`.

### ⟲ A11y: стратегия анонса (критично — иначе SR-спам на тиках)
- **Прогресс-бары — `aria-hidden`**, проценты — видимый текст (= текстовая альтернатива, SC 1.1.1).
  Промежуточные `47→49→52%` **не анонсируются вообще** (намеренно).
- **Один скрытый announcer** `<div aria-live="polite" aria-atomic="true" class="sr-only">`, пишется
  **только при смене состояния**: появление («Начата генерация…»), завершение/ошибка задачи,
  single↔multi, collapse/expand. НЕ на тиках прогресса.
- Спиннер `Loader2` — `aria-hidden` + рядом `<span class="sr-only">Идёт генерация</span>`.

## E. Анимация (framer-motion)
- Бар: `AnimatePresence` — по умолчанию fade + slide (`y: 8 → 0`, ~180мс); ⟲ при reduced-motion
  (через `MotionConfig`) — только `opacity` без slide.
- Смена режима: cross-fade по `key={mode}`, `mode="wait"`.
- ⟲ «Не дёргается на тиках»: стабильный `key` режима → entry/exit не перезапускается на TICK;
  `%` и `ProgressBar` — плавный CSS `width`/`transition`.

## F. Стиль (из дампа Figma, подтверждено деревом)
Фон `#1a1614` (era-bg-2), border `#e85420` (primary). Радиусы: pill `rounded-full` (r999),
карточки `rounded-panel` (r18), ⟲ mobile `rounded-control` (r14). Спиннер/прогресс — `primary`.
Заголовки — `foreground`; ⟲ мета — `foreground-secondary` (#c8beb6, контраст ~7:1) вместо
`muted-foreground` (#8a7f78 ≈ 4.2:1 — ниже AA на этом фоне). Ширина: multi ~332, single 300→332.
> ⟲ [VERIFY при реализации] Догрузить из `deep_nodes` детей `StatusBar/single` и `wlist` (в дереве
> не раскрыты) — сверить пиксельно состав single и мини-строки.

## G. Тестирование (Vitest + Testing Library)
- `selectActiveTasks`: running-first по прогрессу (+тайтбрейкер `startedAt`), queued по `queueOrder`,
  `limit`, тип `ActiveTask[]`.
- `declineGenerations` (0,1,2,5,11,21,…).
- `StatusBar`-диспетчер: 0→null, 1→single, >1→multi, collapsed→pill, `/queue`→null, mobile→компакт
  (рендер с `MemoryRouter` + сид).
- Pill/Single/Multi: рендер по пропсам, клики→колбэки, `aria` (button/expanded/label, list, link).
- ⟲ Announcer: пишется при смене состояния, НЕ на тике прогресса.

## H. Файлы
> Сверено: `Header` в `src/widgets/header/`; страницы рендерят `<Header/>` сами; `QueueProvider`
> переносится из `GenerationQueue` в `App`.

**Новые:** `pages/ChatPage.tsx` · `model/useStatusBarCollapsed.ts`(+тест) ·
`ui/StatusBar/{StatusBar,StatusPill,StatusSingle,StatusMulti}.tsx`(+тесты) ·
⟲ `entities/.../model/labels.ts` (GEN_TYPE_LABEL) или `shared/lib` · хелпер `declineGenerations`.
**Изменяемые:** `model/types.ts`(+`ActiveTask`) · `model/selectors.ts`(+`selectActiveTasks`) ·
`model/useQueue.ts`(+`useActiveTasks`) · `generation-queue/index.ts`(экспорты) ·
`app/App.tsx`(QueueProvider+`/chat`+`<StatusBar/>`+`MotionConfig`+`AnimatePresence`) ·
`widgets/generation-queue/ui/GenerationQueue.tsx`(убрать `QueueProvider`) ·
`widgets/header/ui/Header.tsx`(nav `/queue`↔`/chat` + `aria-current`).

## I. Вне scope (YAGNI)
- Вёрстка реального чата (только фон). · Действия по задачам из бара (только индикатор + переход). ·
  Перетаскивание бара. · Светлая тема бара — наследует токены (контраст light — known trade-off, как UI002).
