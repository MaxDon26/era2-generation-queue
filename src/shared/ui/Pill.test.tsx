import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Pill } from './Pill'

describe('Pill', () => {
  it('рендерит текст модели', () => {
    render(<Pill>GPT-4o</Pill>)
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
  })

  it('декоративная точка скрыта от скринридера (aria-hidden)', () => {
    const { container } = render(<Pill>Flux</Pill>)
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })
})
