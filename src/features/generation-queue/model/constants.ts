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
