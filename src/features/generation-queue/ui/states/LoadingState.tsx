/** Скелетон-заглушка списка на время первичной загрузки сида (тз.md:162). */
export function LoadingState() {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Загрузка очереди">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5"
        >
          <div className="size-14 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  )
}
