import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App (smoke)', () => {
  it('рендерит страницу очереди на маршруте по умолчанию', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Очередь генераций' })).toBeInTheDocument()
  })
})
