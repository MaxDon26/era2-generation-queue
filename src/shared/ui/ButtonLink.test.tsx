import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ButtonLink } from './ButtonLink'

describe('ButtonLink', () => {
  it('рендерит ссылку с href и визуалом кнопки', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/queue">Открыть очередь</ButtonLink>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Открыть очередь' })
    expect(link).toHaveAttribute('href', '/queue')
    expect(link).toHaveClass('bg-primary')
  })
})
