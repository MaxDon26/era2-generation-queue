import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('принимает пользовательский ввод', async () => {
    render(<Input aria-label="Поиск" />)
    const input = screen.getByRole('textbox', { name: 'Поиск' })
    await userEvent.type(input, 'кот')
    expect(input).toHaveValue('кот')
  })

  it('доступен по имени даже с иконкой и без видимого label', () => {
    render(<Input aria-label="Поиск по промптам" startIcon={<svg aria-hidden="true" />} />)
    expect(screen.getByRole('textbox', { name: 'Поиск по промптам' })).toBeInTheDocument()
  })

  it('показывает placeholder', () => {
    render(<Input placeholder="Введите запрос…" aria-label="Запрос" />)
    expect(screen.getByPlaceholderText('Введите запрос…')).toBeInTheDocument()
  })
})
