/** Форматтеры времени и кредитов для меты задачи (тз.md:67, 150). Чистые функции. */

const clampPct = (p: number) => Math.min(100, Math.max(0, p))

/** Человекочитаемая длительность из мс: «45 с», «2 мин», «1 мин 23 с», «1 ч 5 мин». */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000))
  if (totalSec < 60) return `${totalSec} с`

  const totalMin = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (totalMin < 60) return sec ? `${totalMin} мин ${sec} с` : `${totalMin} мин`

  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return min ? `${h} ч ${min} мин` : `${h} ч`
}

/** Оценка оставшегося времени для running: «~2 мин», «~30 с», «почти готово». */
export function formatEta(estimatedDurationMs: number, progress: number): string {
  const remaining = estimatedDurationMs * (1 - clampPct(progress) / 100)
  if (remaining < 1000) return 'почти готово'
  return `~${formatDuration(remaining)}`
}

/** Кредиты с разделителем разрядов: 1000 → «1 000». */
export function formatCredits(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
