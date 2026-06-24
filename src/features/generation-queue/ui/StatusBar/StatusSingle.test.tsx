import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { RunningTask } from '@/entities/generation-task'
import { StatusSingle } from './StatusSingle'

const task: RunningTask = {
  id: '1',
  type: 'image',
  status: 'running',
  prompt: 'Неоновый город',
  model: 'Midjourney v6',
  credits: 8,
  estimatedDurationMs: 15000,
  createdAt: 0,
  progress: 64,
  startedAt: 0,
}

describe('StatusSingle', () => {
  it('показывает заголовок типа, модель·%, промпт и ссылку на очередь', () => {
    render(<StatusSingle task={task} />, { wrapper: MemoryRouter })
    expect(screen.getByText('Генерация изображения')).toBeInTheDocument()
    expect(screen.getByText(/Midjourney v6 · 64%/)).toBeInTheDocument()
    expect(screen.getByText('Неоновый город')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /очередь/i })).toHaveAttribute('href', '/queue')
  })
})
