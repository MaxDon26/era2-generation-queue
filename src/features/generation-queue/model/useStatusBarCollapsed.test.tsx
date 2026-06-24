import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useStatusBarCollapsed } from './useStatusBarCollapsed'

afterEach(() => useStatusBarCollapsed.setState({ collapsed: false }))

describe('useStatusBarCollapsed', () => {
  it('toggle и setCollapsed меняют состояние', () => {
    const { result } = renderHook(() => useStatusBarCollapsed())
    expect(result.current.collapsed).toBe(false)
    act(() => result.current.toggle())
    expect(useStatusBarCollapsed.getState().collapsed).toBe(true)
    act(() => result.current.setCollapsed(false))
    expect(useStatusBarCollapsed.getState().collapsed).toBe(false)
  })
})
