import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { GenerationTask } from '@/entities/generation-task'
import { useQueueStore } from '../../model/queueStore'
import { useStatusBarCollapsed } from '../../model/useStatusBarCollapsed'
import { StatusBar } from './StatusBar'

function seedActive(n: number) {
  const tasks: Record<string, GenerationTask> = {}
  for (let i = 0; i < n; i++) {
    tasks[`r${i}`] = {
      id: `r${i}`, type: 'image', status: 'running', prompt: `p${i}`, model: 'm', credits: 1,
      estimatedDurationMs: 1000, createdAt: 0, progress: 50, startedAt: i,
    }
  }
  useQueueStore.setState({ tasks, queueOrder: [] })
}

afterEach(() => useStatusBarCollapsed.setState({ collapsed: false }))

describe('StatusBar dispatcher', () => {
  it('скрыт на /queue', () => {
    seedActive(2)
    render(
      <MemoryRouter initialEntries={['/queue']}>
        <StatusBar />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Генерации идут')).not.toBeInTheDocument()
  })

  it('скрыт при 0 активных', () => {
    useQueueStore.setState({ tasks: {}, queueOrder: [] })
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <StatusBar />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('multi при >1 активной вне /queue', () => {
    seedActive(2)
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <StatusBar />
      </MemoryRouter>,
    )
    expect(screen.getByText('Генерации идут')).toBeInTheDocument()
  })

  it('pill когда свёрнут', () => {
    seedActive(2)
    useStatusBarCollapsed.setState({ collapsed: true })
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <StatusBar />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /Развернуть статус/ })).toBeInTheDocument()
  })
})
