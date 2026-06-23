import { useCallback } from 'react'
import { useTimedDismiss } from '@/shared/lib/useTimedDismiss'
import { useQueueStore } from './queueStore'

/**
 * Undo-тост очереди (бонус: optimistic + undo на delete / clear done, тз.md:210).
 * Бизнес-привязка: источник — `store.undo` (single-level snapshot), откат — экшен `UNDO`.
 * Логика «показывать пока не скрыто/не истекло» вынесена в generic `useTimedDismiss`.
 */
export function useUndo(timeoutMs = 5000) {
  const snapshot = useQueueStore((s) => s.undo)
  const dispatch = useQueueStore((s) => s.dispatch)
  const { value, dismiss } = useTimedDismiss(snapshot, timeoutMs)

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch])

  return { snapshot: value, label: value?.label ?? null, undo, dismiss }
}
