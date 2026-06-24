import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatusPill } from './StatusPill'

describe('StatusPill', () => {
  it('кнопка с доступным именем и процентом; клик разворачивает', async () => {
    const onExpand = vi.fn()
    render(<StatusPill activeCount={3} avgProgress={47} onExpand={onExpand} />)
    const btn = screen.getByRole('button', { name: /3 генерации.*47%/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(btn)
    expect(onExpand).toHaveBeenCalledOnce()
  })
})
