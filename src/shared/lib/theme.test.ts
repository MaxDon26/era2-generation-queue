import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, useTheme } from './theme'

beforeEach(() => {
  useTheme.setState({ theme: 'dark' })
  document.documentElement.classList.remove('dark')
})

describe('theme', () => {
  it('toggle переключает dark ↔ light', () => {
    useTheme.setState({ theme: 'dark' })
    useTheme.getState().toggle()
    expect(useTheme.getState().theme).toBe('light')
    useTheme.getState().toggle()
    expect(useTheme.getState().theme).toBe('dark')
  })

  it('setTheme устанавливает тему', () => {
    useTheme.getState().setTheme('light')
    expect(useTheme.getState().theme).toBe('light')
  })

  it('applyTheme добавляет/убирает класс dark на <html>', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('изменение темы применяется к <html> через подписку', () => {
    useTheme.getState().setTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    useTheme.getState().setTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
