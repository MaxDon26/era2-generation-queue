import { createSeed } from '@/entities/generation-task'
import type { TickRoll } from './actions'
import { useQueueStore } from './queueStore'
import {
  ERROR_MESSAGES,
  INIT_DELAY_MS,
  INIT_FAIL_RATE,
  JITTER_RANGE,
  TICK_INTERVAL_MS,
} from './constants'

let intervalId: ReturnType<typeof setInterval> | null = null
let initTimer: ReturnType<typeof setTimeout> | null = null

/** Источник недетерминизма для одной running-задачи на тик (граница случайности). */
function randomRoll(): TickRoll {
  const [lo, hi] = JITTER_RANGE
  return {
    jitter: lo + Math.random() * (hi - lo),
    failRoll: Math.random(),
    errorMsg: ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)],
  }
}

function onTick() {
  const s = useQueueStore.getState()
  if (s.phase !== 'ready') return
  const perTask: Record<string, TickRoll> = {}
  for (const id of Object.keys(s.tasks)) {
    if (s.tasks[id].status === 'running') perTask[id] = randomRoll()
  }
  s.dispatch({ type: 'TICK', dtMs: TICK_INTERVAL_MS, now: Date.now(), perTask })
}

/**
 * Движок очереди — тонкая оболочка над стором. Единственный setInterval (инвариант №5).
 * Состояния не держит: единый источник правды — стор. Время и рандом живут только здесь.
 */
export const queueEngine = {
  start() {
    if (intervalId !== null) return
    intervalId = setInterval(onTick, TICK_INTERVAL_MS)
  },
  stop() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  },
  init() {
    const { dispatch } = useQueueStore.getState()
    dispatch({ type: 'INIT_START' })
    if (initTimer) clearTimeout(initTimer)
    initTimer = setTimeout(() => {
      if (Math.random() < INIT_FAIL_RATE) dispatch({ type: 'INIT_ERROR' })
      else dispatch({ type: 'INIT_SUCCESS', tasks: createSeed(Date.now()) })
    }, INIT_DELAY_MS)
  },
  retryInit() {
    if (useQueueStore.getState().phase === 'error') this.init()
  },
}
