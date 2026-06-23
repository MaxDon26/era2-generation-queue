import { useCallback, useEffect, useState } from 'react'

/**
 * Generic «временно-скрываемое значение»: показывает `value`, пока оно не скрыто вручную
 * (`dismiss`) или по таймеру (`timeoutMs`). Не знает о бизнесе — годится для тостов, баннеров и т.п.
 * Скрытие отслеживается по идентичности значения: новое `value` (новая ссылка) снова показывается.
 */
export function useTimedDismiss<T>(
  value: T | null,
  timeoutMs = 5000,
): { value: T | null; dismiss: () => void } {
  const [dismissed, setDismissed] = useState<T | null>(null)
  const visible = value !== null && value !== dismissed

  useEffect(() => {
    if (!visible) return
    const id = setTimeout(() => setDismissed(value), timeoutMs)
    return () => clearTimeout(id)
  }, [visible, value, timeoutMs])

  const dismiss = useCallback(() => setDismissed(value), [value])

  return { value: visible ? value : null, dismiss }
}
