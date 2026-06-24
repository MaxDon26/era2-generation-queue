import { describe, expect, it } from 'vitest'
import { declineGenerations } from './declineGenerations'

describe('declineGenerations', () => {
  it('склоняет «генерация» по числу', () => {
    expect(declineGenerations(0)).toBe('генераций')
    expect(declineGenerations(1)).toBe('генерация')
    expect(declineGenerations(2)).toBe('генерации')
    expect(declineGenerations(4)).toBe('генерации')
    expect(declineGenerations(5)).toBe('генераций')
    expect(declineGenerations(11)).toBe('генераций')
    expect(declineGenerations(14)).toBe('генераций')
    expect(declineGenerations(21)).toBe('генерация')
    expect(declineGenerations(22)).toBe('генерации')
  })
})
