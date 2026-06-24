import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { buttonVariants } from './buttonVariants'

describe('Button', () => {
  it('рендерит текст и по умолчанию имеет type="button"', () => {
    render(<Button>Сохранить</Button>)
    const btn = screen.getByRole('button', { name: 'Сохранить' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('вызывает onClick при клике', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Жми</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Жми' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('не вызывает onClick когда disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Нельзя
      </Button>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Нельзя' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('применяет классы варианта (destructive)', () => {
    render(<Button variant="destructive">X</Button>)
    expect(screen.getByRole('button', { name: 'X' })).toHaveClass('bg-destructive')
  })

  it('buttonVariants даёт стабильную строку классов', () => {
    expect(buttonVariants({ variant: 'default', size: 'lg' })).toContain('bg-primary')
    expect(buttonVariants({ size: 'lg' })).toContain('h-12')
  })
})
