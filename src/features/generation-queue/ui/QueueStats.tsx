import { Card } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface QueueStatsProps {
  counts: { queued: number; running: number; done: number; failed: number }
  className?: string
}

/** Точка несёт статус цветом, число — нейтральное (foreground). */
const ITEMS = [
  { key: 'queued', label: 'В очереди', dot: 'bg-muted-foreground' },
  { key: 'running', label: 'Идёт', dot: 'bg-primary' },
  { key: 'done', label: 'Готово', dot: 'bg-success' },
  { key: 'failed', label: 'Ошибка', dot: 'bg-destructive' },
] as const

/** Сводка из 4 счётчиков (тз.md:138). Реактивна. Адаптив 2×2 → 1×4. */
export function QueueStats({ counts, className }: QueueStatsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {ITEMS.map((item) => (
        <Card key={item.key} className="gap-2 rounded-2xl px-[18px] py-4">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className={cn('size-2 rounded-full', item.dot)} />
            <span className="text-[13px] text-muted-foreground">{item.label}</span>
          </div>
          <span className="text-[28px] font-bold leading-none tabular-nums text-foreground">
            {counts[item.key]}
          </span>
        </Card>
      ))}
    </div>
  )
}
