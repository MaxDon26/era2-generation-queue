import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Chip } from './Chip'

describe('Chip', () => {
  it('имеет роль radio и отражает active в aria-checked', () => {
    const { rerender } = render(<Chip active>Все</Chip>)
    const chip = screen.getByRole('radio', { name: /Все/ })
    expect(chip).toHaveAttribute('aria-checked', 'true')
    rerender(<Chip>Все</Chip>)
    expect(screen.getByRole('radio', { name: /Все/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('вызывает onClick при выборе', async () => {
    const onClick = vi.fn()
    render(<Chip onClick={onClick}>Готово</Chip>)
    await userEvent.click(screen.getByRole('radio', { name: /Готово/ }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('показывает счётчик', () => {
    render(<Chip count={48}>Готово</Chip>)
    expect(screen.getByRole('radio', { name: /48/ })).toBeInTheDocument()
  })
})
