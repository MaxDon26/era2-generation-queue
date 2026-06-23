import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createSeed } from '@/entities/generation-task'
import { initialState } from './queueReducer'
import { useQueueStore } from './queueStore'
import { useActiveAggregate, useQueue } from './useQueue'

afterEach(() => {
  useQueueStore.setState({ ...initialState })
})

describe('useQueue', () => {
  it('counts реактивны; cancel меняет статус running-задачи', () => {
    const tasks = createSeed(0)
    useQueueStore.setState({
      phase: 'ready',
      tasks: Object.fromEntries(tasks.map((t) => [t.id, t] as const)),
    })
    const { result } = renderHook(() => useQueue())
    const before = result.current.counts.running
    const runningId = tasks.find((t) => t.status === 'running')!.id
    act(() => result.current.actions.cancel(runningId))
    expect(result.current.counts.running).toBe(before - 1)
  })

  it('useActiveAggregate отдаёт число активных', () => {
    const tasks = createSeed(0)
    useQueueStore.setState({
      phase: 'ready',
      tasks: Object.fromEntries(tasks.map((t) => [t.id, t] as const)),
    })
    const { result } = renderHook(() => useActiveAggregate())
    expect(typeof result.current.activeCount).toBe('number')
    expect(result.current.activeCount).toBeGreaterThan(0)
  })
})
