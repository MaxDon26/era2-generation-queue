import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VirtualList } from './VirtualList'

interface Row {
  id: string
}

const rows = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: `i${i}` }))

describe('VirtualList', () => {
  it('≤ threshold — рендерит все элементы (режим под анимации)', () => {
    render(
      <VirtualList
        items={rows(5)}
        threshold={60}
        getKey={(r) => r.id}
        renderItem={(r) => <div>{r.id}</div>}
      />,
    )
    expect(screen.getByText('i0')).toBeInTheDocument()
    expect(screen.getByText('i4')).toBeInTheDocument()
  })

  it('> threshold — виртуализация: в DOM не все элементы', () => {
    render(
      <VirtualList
        items={rows(500)}
        threshold={60}
        estimateSize={40}
        getKey={(r) => r.id}
        renderItem={(r) => <div>{r.id}</div>}
        className="h-40"
      />,
    )
    expect(screen.queryAllByText(/^i\d+$/).length).toBeLessThan(500)
  })
})
