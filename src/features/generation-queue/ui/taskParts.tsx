import { Image as ImageIcon, MessageSquare, Music, Video, type LucideIcon } from 'lucide-react'
import type { GenType } from '@/entities/generation-task'
import { cn } from '@/shared/lib/cn'

const TYPE_ICON: Record<GenType, LucideIcon> = {
  text: MessageSquare,
  image: ImageIcon,
  video: Video,
  audio: Music,
}

/** Превью-заглушка по типу: градиентный квадрат + оранжевая иконка (макет). Размер — через className. */
export function TaskThumb({ type, className }: { type: GenType; className?: string }) {
  const Icon = TYPE_ICON[type]
  return (
    <div
      className={cn(
        'thumb-gradient flex shrink-0 items-center justify-center rounded-xl text-accent-foreground',
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </div>
  )
}

/** Компактная пилюля модели: mono-текст + цветная точка. */
export function ModelPill({ model }: { model: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-foreground-secondary">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
      {model}
    </span>
  )
}
