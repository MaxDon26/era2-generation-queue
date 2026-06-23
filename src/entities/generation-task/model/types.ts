/**
 * Доменные типы сущности «задача генерации» (тз.md:47, 84).
 *
 * Модель — discriminated union по `status`: форма задачи зависит от статуса,
 * что исключает нелегальные состояния (`queued` с `error`, `done` без `finishedAt`
 * и т.п.) на уровне типов и убирает non-null assertion в UI.
 *
 * Сущность ЧИСТАЯ: не знает о своей позиции в очереди (порядок исполнения живёт
 * в `queueOrder` слоя feature), не хранит вычислимое (ETA, позицию, превью).
 */

/** Тип генерации (тз.md:144). */
export type GenType = 'text' | 'image' | 'video' | 'audio'

/** Статус задачи в конечном автомате очереди (тз.md:3, 4). */
export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled'

/** Поля, общие для всех статусов. */
interface TaskBase {
  id: string
  type: GenType
  /** Текст промпта (обрезка длинного — на стороне UI, тз.md:150). */
  prompt: string
  /** Имя модели для пилюли (тз.md:151). */
  model: string
  /** Стоимость генерации в кредитах (тз.md:151). */
  credits: number
  /**
   * Оценочная полная длительность генерации, мс. Вход движка: задаёт скорость
   * прогресса и базу для ETA. Зависит от типа — video/audio дольше (тз.md:121).
   * Это НЕ ETA (ETA вычисляется из estimatedDurationMs + progress).
   */
  estimatedDurationMs: number
  /** Время создания, epoch ms. FIFO + сортировка «новые/старые» (тз.md:118, 142). */
  createdAt: number
}

/** В очереди, ещё не обрабатывалась. */
export interface QueuedTask extends TaskBase {
  status: 'queued'
  progress: 0
}

/** Обрабатывается. `progress` 0–100 (инвариант диапазона гарантирует reducer-clamp). */
export interface RunningTask extends TaskBase {
  status: 'running'
  progress: number
  startedAt: number
}

/** Успешно завершена. */
export interface DoneTask extends TaskBase {
  status: 'done'
  progress: 100
  startedAt: number
  finishedAt: number
}

/** Упала с ошибкой. Сбой возможен только в процессе → `startedAt` обязателен (тз.md:120). */
export interface FailedTask extends TaskBase {
  status: 'failed'
  progress: number
  startedAt: number
  finishedAt: number
  error: string
}

/**
 * Отменена пользователем. Отмена возможна из `queued` или `running` (тз.md:157),
 * поэтому `startedAt` опционален (его нет, если отменили до старта).
 */
export interface CanceledTask extends TaskBase {
  status: 'canceled'
  progress: number
  startedAt?: number
  finishedAt: number
}

/** Задача генерации в любом из возможных состояний. */
export type GenerationTask =
  | QueuedTask
  | RunningTask
  | DoneTask
  | FailedTask
  | CanceledTask
