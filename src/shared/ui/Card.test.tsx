import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, CardContent, CardHeader, CardTitle } from './Card'

describe('Card', () => {
  it('рендерит заголовок и содержимое', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Midjourney v6</CardTitle>
        </CardHeader>
        <CardContent>Генерация изображений</CardContent>
      </Card>,
    )
    expect(screen.getByRole('heading', { name: 'Midjourney v6' })).toBeInTheDocument()
    expect(screen.getByText('Генерация изображений')).toBeInTheDocument()
  })

  it('CardTitle меняет уровень заголовка через as', () => {
    render(<CardTitle as="h2">Секция</CardTitle>)
    expect(screen.getByRole('heading', { level: 2, name: 'Секция' })).toBeInTheDocument()
  })
})
