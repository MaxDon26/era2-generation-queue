import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

/** Применяет тему к <html> через класс `dark` (тз.md:201,215; @custom-variant в index.css). */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

/**
 * Стор темы (бонус: светлая тема, тз.md:215). Дефолт — тёмная (canon макета).
 * Сохраняется в localStorage; класс на <html> — единственный канал применения,
 * компоненты используют semantic-токены/`dark:`-утилиты, а не читают значение.
 */
export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggle: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'era2-theme' },
  ),
)

// Применяем при старте (учитывая восстановленное из localStorage) и на каждое изменение.
applyTheme(useTheme.getState().theme)
useTheme.subscribe((s) => applyTheme(s.theme))
