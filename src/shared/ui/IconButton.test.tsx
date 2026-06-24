import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('имеет доступное имя из aria-label', () => {
    render(
      <IconButton aria-label="Удалить">
        <svg aria-hidden="true" />
      </IconButton>,
    )
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument()
  })

  it('вызывает onClick', async () => {
    const onClick = vi.fn()
    render(
      <IconButton aria-label="Повторить" onClick={onClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
