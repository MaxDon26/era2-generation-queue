import { Header } from '@/widgets/header'

/** Страница-заглушка: простой фон для демонстрации глобального статус-бара (тз.md:177). */
export function ChatPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto grid min-h-[60vh] w-full max-w-[1120px] place-items-center px-4">
        <p className="text-sm text-muted-foreground">
          Чат — здесь живёт глобальный статус-бар генераций.
        </p>
      </main>
    </div>
  )
}
