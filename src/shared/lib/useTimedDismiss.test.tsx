import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTimedDismiss } from './useTimedDismiss'

afterEach(() => vi.useRealTimers())

describe('useTimedDismiss', () => {
  it('показывает значение, пока оно активно', () => {
    const v = { id: 1 }
    const { result } = renderHook(({ value }) => useTimedDismiss(value), {
      initialProps: { value: v as { id: number } | null },
    })
    expect(result.current.value).toBe(v)
  })

  it('dismiss() скрывает текущее значение', () => {
    const v = { id: 1 }
    const { result } = renderHook(() => useTimedDismiss<{ id: number }>(v))
    act(() => result.current.dismiss())
    expect(result.current.value).toBeNull()
  })

  it('авто-скрытие по таймеру', () => {
    vi.useFakeTimers()
    const v = { id: 1 }
    const { result } = renderHook(() => useTimedDismiss<{ id: number }>(v, 3000))
    expect(result.current.value).toBe(v)
    act(() => vi.advanceTimersByTime(3000))
    expect(result.current.value).toBeNull()
  })

  it('новое значение (новая ссылка) снова показывается', () => {
    const a = { id: 1 }
    const b = { id: 2 }
    const { result, rerender } = renderHook(({ value }) => useTimedDismiss(value), {
      initialProps: { value: a as { id: number } | null },
    })
    act(() => result.current.dismiss())
    expect(result.current.value).toBeNull()
    rerender({ value: b })
    expect(result.current.value).toBe(b)
  })
})
