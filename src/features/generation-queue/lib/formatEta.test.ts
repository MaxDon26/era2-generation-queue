import { describe, expect, it } from 'vitest'
import { formatCredits, formatDuration, formatEta } from './formatEta'

describe('formatDuration', () => {
  it('секунды', () => {
    expect(formatDuration(0)).toBe('0 с')
    expect(formatDuration(45_000)).toBe('45 с')
    expect(formatDuration(59_400)).toBe('59 с')
  })
  it('минуты и минуты+секунды', () => {
    expect(formatDuration(120_000)).toBe('2 мин')
    expect(formatDuration(83_000)).toBe('1 мин 23 с')
  })
  it('часы', () => {
    expect(formatDuration(3_600_000)).toBe('1 ч')
    expect(formatDuration(3_900_000)).toBe('1 ч 5 мин')
  })
  it('отрицательное → 0 с', () => {
    expect(formatDuration(-500)).toBe('0 с')
  })
})

describe('formatEta', () => {
  it('оценивает оставшееся время по estimatedDurationMs и progress', () => {
    expect(formatEta(120_000, 0)).toBe('~2 мин')
    expect(formatEta(120_000, 50)).toBe('~1 мин')
  })
  it('почти готово при остатке < 1 с', () => {
    expect(formatEta(120_000, 100)).toBe('почти готово')
  })
  it('clamp прогресса вне 0..100', () => {
    expect(formatEta(120_000, 150)).toBe('почти готово')
    expect(formatEta(120_000, -10)).toBe('~2 мин')
  })
})

describe('formatCredits', () => {
  it('разделитель разрядов', () => {
    expect(formatCredits(8)).toBe('8')
    expect(formatCredits(1000)).toBe('1 000')
    expect(formatCredits(1_234_567)).toBe('1 234 567')
  })
})
