import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { TaskStatus } from '@/entities/generation-task'
import { Chip, Input } from '@/shared/ui'
import type { QueueFilters } from '../model/selectors'

const STATUS_FILTERS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'queued', label: 'В очереди' },
  { value: 'running', label: 'Идёт' },
  { value: 'done', label: 'Готово' },
  { value: 'failed', label: 'Ошибка' },
]

const SORTS: { value: QueueFilters['sort']; label: string }[] = [
  { value: 'queue', label: 'Очередь' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'oldest', label: 'Сначала старые' },
]

interface QueueToolbarProps {
  filters: QueueFilters
  counts: { queued: number; running: number; done: number; failed: number; total: number }
  onChange: (next: QueueFilters) => void
}

/** Тулбар: фильтр-чипы по статусу + сортировка + поиск с debounce (тз.md:141-143). */
export function QueueToolbar({ filters, counts, onChange }: QueueToolbarProps) {
  const [searchInput, setSearchInput] = useState(filters.search)

  // debounce поиска 300мс (тз.md:143): шлём наверх через 300мс после последнего ввода.
  useEffect(() => {
    if (searchInput === filters.search) return
    const id = setTimeout(() => onChange({ ...filters, search: searchInput }), 300)
    return () => clearTimeout(id)
  }, [searchInput, filters, onChange])

  const countFor = (value: TaskStatus | 'all'): number | undefined => {
    if (value === 'all') return counts.total
    if (value === 'queued' || value === 'running' || value === 'done' || value === 'failed') {
      return counts[value]
    }
    return undefined
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div
        role="radiogroup"
        aria-label="Фильтр по статусу"
        className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5"
      >
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            active={filters.status === f.value}
            count={countFor(f.value)}
            onClick={() => onChange({ ...filters, status: f.value })}
            className="shrink-0"
          >
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as QueueFilters['sort'] })}
          aria-label="Сортировка"
          className="h-9 shrink-0 rounded-control border border-border bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value} className="bg-card text-foreground">
              {s.label}
            </option>
          ))}
        </select>

        <form role="search" className="w-full lg:w-64" onSubmit={(e) => e.preventDefault()}>
          <Input
            rounded="full"
            startIcon={<Search className="size-4" aria-hidden="true" />}
            aria-label="Поиск по промптам"
            placeholder="Поиск по промптам…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
      </div>
    </div>
  )
}
