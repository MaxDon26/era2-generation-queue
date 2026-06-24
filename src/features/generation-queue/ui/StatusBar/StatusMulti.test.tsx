import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveTask } from '@/entities/generation-task'
import { StatusMulti } from './StatusMulti'

const tasks: ActiveTask[] = [
  {
    id: '1', type: 'image', status: 'running', prompt: 'Город', model: 'm', credits: 1,
    estimatedDurationMs: 1000, createdAt: 0, progress: 64, startedAt: 0,
  },
  {
    id: '2', type: 'text', status: 'queued', prompt: 'Логотип', model: 'm', credits: 1,
    estimatedDurationMs: 1000, createdAt: 0, progress: 0,
  },
]

describe('StatusMulti', () => {
  it('заголовок, список, прогресс/в очереди, сворачивание и переход', async () => {
    const onCollapse = vi.fn()
    render(
      <StatusMulti tasks={tasks} activeCount={3} avgProgress={47} onCollapse={onCollapse} />,
      { wrapper: MemoryRouter },
    )
    expect(screen.getByText(/3 активны · 47%/)).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('64%')).toBeInTheDocument()
    expect(screen.getByText('в очереди')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Открыть очередь/i })).toHaveAttribute('href', '/queue')
    await userEvent.click(screen.getByRole('button', { name: /Свернуть/i }))
    expect(onCollapse).toHaveBeenCalledOnce()
  })
})
