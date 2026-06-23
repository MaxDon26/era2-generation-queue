import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GenerationTask } from '@/entities/generation-task'
import { initialState } from './queueReducer'
import { useQueueStore } from './queueStore'
import { useUndo } from './useUndo'

const queued = (id: string): GenerationTask => ({
  id, type: 'text', status: 'queued', prompt: 'p', model: 'm',
  credits: 1, estimatedDurationMs: 1000, createdAt: 0, progress: 0,
})

const seedReady = () =>
  useQueueStore.setState({ phase: 'ready', tasks: { q1: queued('q1') }, queueOrder: ['q1'] })

beforeEach(() => useQueueStore.setState({ ...initialState }))
afterEach(() => vi.useRealTimers())

describe('useUndo', () => {
  it('после DELETE показывает snapshot с label', () => {
    seedReady()
    const { result } = renderHook(() => useUndo())
    expect(result.current.snapshot).toBeNull()
    act(() => useQueueStore.getState().dispatch({ type: 'DELETE', id: 'q1' }))
    expect(result.current.label).toBe('Задача удалена')
  })

  it('undo() восстанавливает задачу и скрывает тост', () => {
    seedReady()
    const { result } = renderHook(() => useUndo())
    act(() => useQueueStore.getState().dispatch({ type: 'DELETE', id: 'q1' }))
    act(() => result.current.undo())
    expect(result.current.snapshot).toBeNull()
    expect(useQueueStore.getState().tasks.q1).toBeDefined()
  })

  it('авто-скрытие через timeoutMs (snapshot в сторе остаётся)', () => {
    vi.useFakeTimers()
    seedReady()
    const { result } = renderHook(() => useUndo(5000))
    act(() => useQueueStore.getState().dispatch({ type: 'DELETE', id: 'q1' }))
    expect(result.current.snapshot).not.toBeNull()
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.snapshot).toBeNull()
    expect(useQueueStore.getState().undo).not.toBeNull()
  })

  it('dismiss() скрывает тост без отмены', () => {
    seedReady()
    const { result } = renderHook(() => useUndo())
    act(() => useQueueStore.getState().dispatch({ type: 'DELETE', id: 'q1' }))
    act(() => result.current.dismiss())
    expect(result.current.snapshot).toBeNull()
    expect(useQueueStore.getState().tasks.q1).toBeUndefined()
  })
})
