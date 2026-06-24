import { Loader2 } from 'lucide-react'
import { declineGenerations } from '@/shared/lib/declineGenerations'

interface StatusPillProps {
  activeCount: number
  avgProgress: number
  onExpand: () => void
}

/** Свёрнутое состояние: компактная пилюля «N генераций · X%». Клик разворачивает. */
export function StatusPill({ activeCount, avgProgress, onExpand }: StatusPillProps) {
  const label = `${activeCount} ${declineGenerations(activeCount)}`
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-expanded={false}
      aria-label={`Развернуть статус: ${label}, ${avgProgress}%`}
      className="inline-flex items-center gap-2 rounded-full border border-primary bg-secondary py-2.5 pl-3.5 pr-4 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Loader2
        aria-hidden="true"
        className="size-4 animate-spin text-primary motion-reduce:animate-none"
      />
      <span className="sr-only">Идёт генерация. </span>
      <span>{label}</span>
      <span className="font-mono font-semibold text-accent-foreground">{avgProgress}%</span>
    </button>
  )
}
