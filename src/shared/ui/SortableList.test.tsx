import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SortableList } from './SortableList'

describe('SortableList (smoke; drag проверяется e2e/вручную)', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('рендерит все элементы', () => {
    render(
      <SortableList
        items={items}
        getId={(x) => x.id}
        onReorder={() => {}}
        renderItem={(x) => <div>{x.id}</div>}
      />,
    )
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('c')).toBeInTheDocument()
  })

  it('disabled: рендерит элементы без dnd-обвязки', () => {
    render(
      <SortableList
        disabled
        items={items}
        getId={(x) => x.id}
        onReorder={() => {}}
        renderItem={(x) => <div>{x.id}</div>}
      />,
    )
    expect(screen.getByText('b')).toBeInTheDocument()
  })
})
