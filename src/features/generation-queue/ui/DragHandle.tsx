import { GripHorizontal } from 'lucide-react'
import type { DragHandleProps } from '@/shared/ui'

/** Видимая ручка перетаскивания (внизу строки/карточки) — хват для reorder queued-задач. */
export function DragHandle({ handle }: { handle: DragHandleProps }) {
  return (
    <button
      type="button"
      aria-label="Перетащить для изменения порядка"
      className="flex w-full cursor-grab touch-none items-center justify-center gap-1 border-t border-border/60 py-1.5 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
      {...handle.attributes}
      {...handle.listeners}
    >
      <GripHorizontal className="size-4" />
    </button>
  )
}
