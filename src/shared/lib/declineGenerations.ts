/** Русское склонение слова «генерация» по числу: 1 — генерация, 2–4 — генерации, иначе — генераций. */
export function declineGenerations(count: number): string {
  const n = Math.abs(count) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return 'генераций'
  if (n1 === 1) return 'генерация'
  if (n1 >= 2 && n1 <= 4) return 'генерации'
  return 'генераций'
}
