import { type ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getReorderIndices } from '@/shared/lib/reorder'

/** Пропсы drag-ручки для навешивания на конкретный элемент (иконку-хват). */
export type DragHandleProps = Pick<ReturnType<typeof useSortable>, 'attributes' | 'listeners'>

export interface SortableListProps<T> {
  items: T[]
  getId: (item: T) => string
  /** from/to — индексы в текущем `items`. */
  onReorder: (from: number, to: number) => void
  renderItem: (item: T, handle?: DragHandleProps) => ReactNode
  /** Отключает перетаскивание (например, когда сортировка ≠ «порядок очереди»). */
  disabled?: boolean
  className?: string
}

/**
 * Generic вертикальный sortable-список на dnd-kit (бонус drag-reorder, тз.md:212).
 * Не знает о бизнесе. Клавиатурный drag из коробки (a11y). Перетаскивание вызывает
 * `onReorder(from, to)` с индексами в `items` — наверху это `actions.reorder` (queueOrder).
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  disabled,
  className,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map(getId)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const indices = getReorderIndices(ids, String(active.id), String(over.id))
    if (indices) onReorder(indices.from, indices.to)
  }

  if (disabled) {
    return (
      <div className={className}>
        {items.map((item) => (
          <div key={getId(item)}>{renderItem(item)}</div>
        ))}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableRow key={getId(item)} id={getId(item)}>
              {(handle) => renderItem(item, handle)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({
  id,
  children,
}: {
  id: string
  children: (handle: DragHandleProps) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  )
}
