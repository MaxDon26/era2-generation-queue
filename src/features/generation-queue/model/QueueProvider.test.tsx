import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeed } from '@/entities/generation-task'
import { initialState } from './queueReducer'
import { useQueueStore } from './queueStore'
import { QueueProvider } from './QueueProvider'

beforeEach(() => {
  vi.useFakeTimers()
  useQueueStore.setState({ ...initialState })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('QueueProvider', () => {
  it('первый запуск: init → phase ready после задержки', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    render(
      <QueueProvider>
        <div>app</div>
      </QueueProvider>,
    )
    expect(useQueueStore.getState().phase).toBe('loading')
    vi.advanceTimersByTime(600)
    expect(useQueueStore.getState().phase).toBe('ready')
  })

  it('восстановление из localStorage: tasks есть → сразу ready, без перезагрузки сида', () => {
    const restored = createSeed(0)
    useQueueStore.setState({
      phase: 'loading',
      tasks: Object.fromEntries(restored.map((t) => [t.id, t] as const)),
    })
    render(
      <QueueProvider>
        <div>app</div>
      </QueueProvider>,
    )
    expect(useQueueStore.getState().phase).toBe('ready')
    // сид не перезагружался — id остались прежними
    expect(Object.keys(useQueueStore.getState().tasks).sort()).toEqual(restored.map((t) => t.id).sort())
  })

  it('unmount чистит движок (нет тиков после)', () => {
    useQueueStore.setState({
      phase: 'ready',
      tasks: Object.fromEntries(createSeed(0).map((t) => [t.id, t] as const)),
    })
    const { unmount } = render(
      <QueueProvider>
        <div>app</div>
      </QueueProvider>,
    )
    unmount()
    const snapshot = JSON.stringify(useQueueStore.getState().tasks)
    vi.advanceTimersByTime(3000)
    expect(JSON.stringify(useQueueStore.getState().tasks)).toBe(snapshot)
  })
})
