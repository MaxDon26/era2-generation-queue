import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('рендерит содержимое', () => {
    render(<Badge>Готово</Badge>)
    expect(screen.getByText('Готово')).toBeInTheDocument()
  })

  it('применяет классы варианта secondary', () => {
    render(<Badge variant="secondary">В очереди</Badge>)
    expect(screen.getByText('В очереди')).toHaveClass('bg-secondary')
  })
})
