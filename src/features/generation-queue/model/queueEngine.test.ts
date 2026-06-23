import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeed } from '@/entities/generation-task'
import { useQueueStore } from './queueStore'
import { queueEngine } from './queueEngine'
import { initialState } from './queueReducer'

beforeEach(() => {
  vi.useFakeTimers()
  useQueueStore.setState({ ...initialState })
})
afterEach(() => {
  queueEngine.stop()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('queueEngine', () => {
  it('init: loading → ready с сидом после INIT_DELAY_MS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // не сбой инициализации
    queueEngine.init()
    expect(useQueueStore.getState().phase).toBe('loading')
    vi.advanceTimersByTime(600)
    expect(useQueueStore.getState().phase).toBe('ready')
    expect(Object.keys(useQueueStore.getState().tasks).length).toBeGreaterThan(0)
  })

  it('init: сбой инициализации → phase error', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0) // < INIT_FAIL_RATE
    queueEngine.init()
    vi.advanceTimersByTime(600)
    expect(useQueueStore.getState().phase).toBe('error')
  })

  it('start крутит тики только при ready; stop чистит интервал (нет тиков после)', () => {
    useQueueStore.setState({
      phase: 'ready',
      tasks: Object.fromEntries(createSeed(0).map((t) => [t.id, t] as const)),
    })
    queueEngine.start()
    vi.advanceTimersByTime(1500)
    queueEngine.stop()
    const snapshot = JSON.stringify(useQueueStore.getState().tasks)
    vi.advanceTimersByTime(3000)
    expect(JSON.stringify(useQueueStore.getState().tasks)).toBe(snapshot)
  })

  it('start идемпотентен (повторный вызов не создаёт второй интервал)', () => {
    const spy = vi.spyOn(globalThis, 'setInterval')
    queueEngine.start()
    queueEngine.start()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('retryInit из error повторяет init', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    useQueueStore.setState({ phase: 'error' })
    queueEngine.retryInit()
    vi.advanceTimersByTime(600)
    expect(useQueueStore.getState().phase).toBe('ready')
  })

  it('retryInit не из error — no-op', () => {
    useQueueStore.setState({ phase: 'ready' })
    queueEngine.retryInit()
    expect(useQueueStore.getState().phase).toBe('ready')
  })
})
