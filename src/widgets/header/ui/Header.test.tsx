import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Header } from './Header'

describe('Header nav', () => {
  it('ссылка активной страницы помечена aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/queue']}>
        <Header />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Очередь' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Чат' })).not.toHaveAttribute('aria-current')
  })
})
