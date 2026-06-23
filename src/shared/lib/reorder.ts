/** Чистый маппинг id → индексы для reorder (dnd-kit onDragEnd → onReorder). */
export function getReorderIndices(
  ids: string[],
  activeId: string,
  overId: string,
): { from: number; to: number } | null {
  if (activeId === overId) return null
  const from = ids.indexOf(activeId)
  const to = ids.indexOf(overId)
  return from !== -1 && to !== -1 ? { from, to } : null
}
