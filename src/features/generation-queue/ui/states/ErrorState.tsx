import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui'

/** Состояние ошибки инициализации с повтором (тз.md:163). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <AlertTriangle className="size-10 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-foreground">Не удалось загрузить очередь</p>
        <p className="text-sm text-muted-foreground">Проверьте соединение и попробуйте снова</p>
      </div>
      <Button onClick={onRetry}>Повторить</Button>
    </div>
  )
}
