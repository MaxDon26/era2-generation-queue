import { describe, expect, it } from 'vitest'
import { createSeed } from './seed'
import type { GenType, TaskStatus } from './types'

describe('createSeed', () => {
  const FIXED_NOW = 1_700_000_000_000

  it('возвращает 8–12 задач (тз.md:127)', () => {
    const seed = createSeed(FIXED_NOW)
    expect(seed.length).toBeGreaterThanOrEqual(8)
    expect(seed.length).toBeLessThanOrEqual(12)
  })

  it('детерминированна относительно now', () => {
    expect(createSeed(FIXED_NOW)).toEqual(createSeed(FIXED_NOW))
  })

  it('соблюдает раскладку статусов: ≥2 running, ≥3 queued, ≥2 done, ≥1 failed, ≥1 canceled', () => {
    const seed = createSeed(FIXED_NOW)
    const count = (s: TaskStatus) => seed.filter((t) => t.status === s).length
    expect(count('running')).toBeGreaterThanOrEqual(2)
    expect(count('queued')).toBeGreaterThanOrEqual(3)
    expect(count('done')).toBeGreaterThanOrEqual(2)
    expect(count('failed')).toBeGreaterThanOrEqual(1)
    expect(count('canceled')).toBeGreaterThanOrEqual(1)
  })

  it('покрывает все типы генерации, включая video/audio', () => {
    const seed = createSeed(FIXED_NOW)
    const types = new Set<GenType>(seed.map((t) => t.type))
    expect(types).toEqual(new Set<GenType>(['text', 'image', 'video', 'audio']))
  })

  it('имеет уникальные id', () => {
    const seed = createSeed(FIXED_NOW)
    expect(new Set(seed.map((t) => t.id)).size).toBe(seed.length)
  })

  it('у всех задач progress в диапазоне 0–100', () => {
    for (const t of createSeed(FIXED_NOW)) {
      expect(t.progress).toBeGreaterThanOrEqual(0)
      expect(t.progress).toBeLessThanOrEqual(100)
    }
  })

  it('соблюдает инварианты статусов (DU)', () => {
    for (const t of createSeed(FIXED_NOW)) {
      switch (t.status) {
        case 'queued':
          expect(t.progress).toBe(0)
          break
        case 'running':
          expect(typeof t.startedAt).toBe('number')
          break
        case 'done':
          expect(t.progress).toBe(100)
          expect(typeof t.finishedAt).toBe('number')
          break
        case 'failed':
          expect(t.error.length).toBeGreaterThan(0)
          expect(typeof t.finishedAt).toBe('number')
          break
        case 'canceled':
          expect(typeof t.finishedAt).toBe('number')
          break
      }
    }
  })

  it('у каждой задачи непустые prompt и model, положительные credits и estimatedDurationMs', () => {
    for (const t of createSeed(FIXED_NOW)) {
      expect(t.prompt.length).toBeGreaterThan(0)
      expect(t.model.length).toBeGreaterThan(0)
      expect(t.credits).toBeGreaterThan(0)
      expect(t.estimatedDurationMs).toBeGreaterThan(0)
    }
  })
})
