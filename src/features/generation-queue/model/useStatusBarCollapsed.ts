import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface StatusBarCollapsedState {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggle: () => void
}

/** Свёрнутость глобального статус-бара (пилюля ↔ развёрнутый). Сохраняется в localStorage. */
export const useStatusBarCollapsed = create<StatusBarCollapsedState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: 'era2-statusbar', version: 1 },
  ),
)
