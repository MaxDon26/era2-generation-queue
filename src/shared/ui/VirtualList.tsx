import { useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export interface VirtualListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T) => string
  /** Высота строки для оценки (виртуальный режим). */
  estimateSize?: number
  overscan?: number
  /** Порог переключения на виртуализацию (тз.md:211). Ниже — обычный рендер (для анимаций). */
  threshold?: number
  /** Класс контейнера; в виртуальном режиме ДОЛЖЕН задавать высоту (для скролла). */
  className?: string
}

/**
 * Адаптивный список (бонус: виртуализация 1000 задач, тз.md:211 + спека D §8).
 * ≤ threshold — обычный рендер (вызывающий может обернуть в анимации);
 * > threshold — windowing через @tanstack/react-virtual (exit-анимации несовместимы — отключены).
 */
export function VirtualList<T>(props: VirtualListProps<T>) {
  const { items, threshold = 60 } = props
  return items.length <= threshold ? <PlainList {...props} /> : <VirtualScroller {...props} />
}

function PlainList<T>({ items, renderItem, getKey, className }: VirtualListProps<T>) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <div key={getKey(item)}>{renderItem(item, i)}</div>
      ))}
    </div>
  )
}

function VirtualScroller<T>({
  items,
  renderItem,
  getKey,
  estimateSize = 96,
  overscan = 8,
  className,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  // TanStack Virtual возвращает немемоизируемые функции — известное ограничение, не баг.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) => getKey(items[index]),
  })

  return (
    <div ref={parentRef} className={className} style={{ overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((v) => (
          <div
            key={v.key}
            data-index={v.index}
            ref={virtualizer.measureElement}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${v.start}px)` }}
          >
            {renderItem(items[v.index], v.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
