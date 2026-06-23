import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const original = window.matchMedia

function installMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => false,
  }))
  return {
    set(next: boolean) {
      matches = next
      listeners.forEach((l) => l())
    },
  }
}

afterEach(() => {
  window.matchMedia = original
})

describe('usePrefersReducedMotion', () => {
  it('false, когда reduce не запрошен', () => {
    installMatchMedia(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
  })

  it('true, когда prefers-reduced-motion: reduce', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })

  it('реагирует на изменение настройки', () => {
    const mm = installMatchMedia(false)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
    act(() => mm.set(true))
    expect(result.current).toBe(true)
  })
})
