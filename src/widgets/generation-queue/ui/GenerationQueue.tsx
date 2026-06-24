import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GenerationTask } from '@/entities/generation-task'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  QueueStats,
  QueueToolbar,
  TaskCard,
  TaskRow,
  useQueue,
  useUndo,
  useVisibleTasks,
  type QueueFilters,
} from '@/features/generation-queue'
import { usePrefersReducedMotion } from '@/shared/lib/usePrefersReducedMotion'
import { Button, SortableList, VirtualList, type DragHandleProps } from '@/shared/ui'

/** Дефолтные фильтры (стабильная ссылка для memo в useVisibleTasks). */
const DEFAULT_FILTERS: QueueFilters = { status: 'all', search: '', sort: 'queue' }

type QueueActions = ReturnType<typeof useQueue>['actions']

/** Строка + карточка одной задачи (адаптив через CSS). dragHandle — ручка для reorder у queued. */
function renderTask(task: GenerationTask, actions: QueueActions, handle?: DragHandleProps) {
  const handlers = {
    onCancel: () => actions.cancel(task.id),
    onRetry: () => actions.retry(task.id),
    onDownload: () => {},
    onDelete: () => actions.remove(task.id),
  }
  return (
    <>
      <TaskRow task={task} {...handlers} dragHandle={handle} className="hidden sm:flex" />
      <TaskCard task={task} {...handlers} dragHandle={handle} className="flex sm:hidden" />
    </>
  )
}

/** Анимированная обёртка строки (появление/удаление). При reduced-motion — без анимаций. */
function AnimatedRow({
  task,
  actions,
  animate,
}: {
  task: GenerationTask
  actions: QueueActions
  animate: boolean
}) {
  return (
    <motion.div
      layout={animate}
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={animate ? { opacity: 0, height: 0 } : undefined}
      transition={{ duration: 0.18 }}
    >
      {renderTask(task, actions)}
    </motion.div>
  )
}

/**
 * Список задач. В режиме «очередь» queued-секция — SortableList (drag-reorder, dnd сам анимирует),
 * running/завершённые — анимированные строки (framer-motion). В остальных сортировках — VirtualList
 * (виртуализация; анимации появления/удаления несовместимы с windowing — отключены, спека D §8).
 */
function TaskList({
  tasks,
  filters,
  actions,
}: {
  tasks: GenerationTask[]
  filters: QueueFilters
  actions: QueueActions
}) {
  const reduced = usePrefersReducedMotion()
  const animate = !reduced

  if (filters.sort !== 'queue') {
    return (
      <VirtualList<GenerationTask>
        items={tasks}
        getKey={(t) => t.id}
        estimateSize={96}
        threshold={60}
        className="flex flex-col gap-2.5"
        renderItem={(task) => renderTask(task, actions)}
      />
    )
  }

  const running = tasks.filter((t) => t.status === 'running')
  const queued = tasks.filter((t) => t.status === 'queued')
  const rest = tasks.filter((t) => t.status !== 'running' && t.status !== 'queued')

  return (
    <div className="flex flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {running.map((task) => (
          <AnimatedRow key={task.id} task={task} actions={actions} animate={animate} />
        ))}
      </AnimatePresence>

      <SortableList<GenerationTask>
        items={queued}
        getId={(t) => t.id}
        onReorder={actions.reorder}
        className="flex flex-col gap-2.5"
        renderItem={(task, handle) => renderTask(task, actions, handle)}
      />

      <AnimatePresence initial={false}>
        {rest.map((task) => (
          <AnimatedRow key={task.id} task={task} actions={actions} animate={animate} />
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Плавающий undo-тост (бонус: undo на удаление / «очистить готовые») с анимацией появления. */
function UndoToast() {
  const { label, undo } = useUndo()
  const reduced = usePrefersReducedMotion()
  return (
    <AnimatePresence>
      {label && (
        <motion.div
          key="undo"
          style={{ x: '-50%' }}
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-lg"
        >
          <span className="text-sm text-foreground">{label}</span>
          <button
            type="button"
            onClick={undo}
            className="text-sm font-medium text-accent-foreground hover:underline"
          >
            Отменить
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function QueueScreen() {
  const { phase, counts, actions } = useQueue()
  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_FILTERS)
  const tasks = useVisibleTasks(filters)

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-h3 text-foreground">Очередь генераций</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Задачи генерации обновляются в реальном времени
            </p>
          </div>
          <Button variant="outline" onClick={actions.clearDone} disabled={counts.done === 0}>
            Очистить готовые
          </Button>
        </div>

        <QueueStats counts={counts} />
        <QueueToolbar filters={filters} counts={counts} onChange={setFilters} />

        {phase === 'loading' && <LoadingState />}
        {phase === 'error' && <ErrorState onRetry={actions.retryInit} />}
        {phase === 'ready' && tasks.length === 0 && (
          <EmptyState variant={counts.total === 0 ? 'no-tasks' : 'no-results'} />
        )}
        {phase === 'ready' && tasks.length > 0 && (
          <TaskList tasks={tasks} filters={filters} actions={actions} />
        )}
      </div>

      <UndoToast />
    </>
  )
}

/** Композиция экрана очереди (тз.md:98). Движок запускается глобально в App (QueueProvider). */
export function GenerationQueue() {
  return <QueueScreen />
}
