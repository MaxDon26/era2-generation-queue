import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App (smoke)', () => {
  it('рендерит страницу очереди на маршруте по умолчанию', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Очередь генераций' })).toBeInTheDocument()
  })

  it('рендерит страницу-заглушку чата на /chat', () => {
    window.history.pushState({}, '', '/chat')
    render(<App />)
    expect(screen.getByText(/здесь живёт глобальный статус-бар/i)).toBeInTheDocument()
    window.history.pushState({}, '', '/')
  })
})
