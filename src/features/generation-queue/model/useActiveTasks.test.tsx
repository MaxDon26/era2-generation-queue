import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GenerationTask } from '@/entities/generation-task'
import { useQueueStore } from './queueStore'
import { useActiveTasks } from './useQueue'

describe('useActiveTasks', () => {
  it('возвращает активные задачи с лимитом', () => {
    const tasks: Record<string, GenerationTask> = {
      a: {
        id: 'a', type: 'image', status: 'running', prompt: 'a', model: 'm', credits: 1,
        estimatedDurationMs: 1000, createdAt: 0, progress: 40, startedAt: 1,
      },
      b: {
        id: 'b', type: 'text', status: 'queued', prompt: 'b', model: 'm', credits: 1,
        estimatedDurationMs: 1000, createdAt: 0, progress: 0,
      },
    }
    useQueueStore.setState({ tasks, queueOrder: ['b'] })
    const { result } = renderHook(() => useActiveTasks(3))
    expect(result.current.map((t) => t.id)).toEqual(['a', 'b'])
  })
})
