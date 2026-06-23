import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('склеивает классы', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('разрешает конфликт Tailwind — последний класс побеждает', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('игнорирует falsy-значения', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})
