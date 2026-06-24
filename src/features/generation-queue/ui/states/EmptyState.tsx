import { Inbox, SearchX } from 'lucide-react'

interface EmptyStateProps {
  /** no-tasks — очередь пуста вообще; no-results — нет задач под фильтром. */
  variant: 'no-tasks' | 'no-results'
}

/** Осмысленное пустое состояние списка (тз.md:161) — иконка + заголовок + подсказка. */
export function EmptyState({ variant }: EmptyStateProps) {
  const isNoResults = variant === 'no-results'
  const Icon = isNoResults ? SearchX : Inbox
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
      <Icon className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-foreground">
          {isNoResults ? 'Ничего не найдено' : 'Очередь пуста'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isNoResults
            ? 'Измените фильтры или поисковый запрос'
            : 'Здесь появятся ваши генерации'}
        </p>
      </div>
    </div>
  )
}
