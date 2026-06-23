import { useEffect, type ReactNode } from 'react'
import { queueEngine } from './queueEngine'
import { useQueueStore } from './queueStore'

/**
 * Точка жизненного цикла движка (тз.md:51). Стор глобален, но запуск/остановка движка
 * привязаны к монтированию: на mount — загрузка + старт тиков, на unmount — чистка (инвариант №5).
 *
 * Если в localStorage были данные (persist восстановил tasks, тз.md:4.7) — повторную
 * загрузку сида НЕ делаем, сразу переходим в ready (phase — служебный флаг загрузки,
 * доменные данные уже пришли через restore в merge стора).
 */
export function QueueProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const restored = Object.keys(useQueueStore.getState().tasks).length > 0
    if (restored) {
      useQueueStore.setState({ phase: 'ready' })
    } else {
      queueEngine.init()
    }
    queueEngine.start()
    return () => {
      queueEngine.stop()
    }
  }, [])

  return <>{children}</>
}
