import { GenerationQueue } from '@/widgets/generation-queue'
import { Header } from '@/widgets/header'

/** Тонкая страница-композиция (тз.md:31, 75): глобальная шапка + виджет очереди. */
export function QueuePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <GenerationQueue />
      </main>
    </div>
  )
}
