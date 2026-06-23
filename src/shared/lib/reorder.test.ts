import { describe, expect, it } from 'vitest'
import { getReorderIndices } from './reorder'

describe('getReorderIndices', () => {
  it('возвращает from/to по id', () => {
    expect(getReorderIndices(['a', 'b', 'c'], 'a', 'c')).toEqual({ from: 0, to: 2 })
    expect(getReorderIndices(['a', 'b', 'c'], 'c', 'a')).toEqual({ from: 2, to: 0 })
  })
  it('null, если активный == целевой', () => {
    expect(getReorderIndices(['a', 'b'], 'a', 'a')).toBeNull()
  })
  it('null, если id не найден', () => {
    expect(getReorderIndices(['a', 'b'], 'x', 'b')).toBeNull()
  })
})
