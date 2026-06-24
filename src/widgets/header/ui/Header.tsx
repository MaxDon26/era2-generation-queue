import { Moon, Search, Sun } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useTheme } from '@/shared/lib/theme'
import { IconButton, Input } from '@/shared/ui'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn('text-sm transition-colors', isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')

/** Переключатель темы на готовом сторе useTheme (persist + авто-применение к <html>). */
function ThemeToggle() {
  const theme = useTheme((s) => s.theme)
  const toggle = useTheme((s) => s.toggle)
  const isDark = theme === 'dark'
  return (
    <IconButton
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      variant="secondary"
      onClick={toggle}
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </IconButton>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-lg font-bold leading-none text-primary-foreground">
          E
        </span>
        <span className="text-xl font-semibold leading-none text-foreground">era2</span>
        <span className="hidden text-[13px] text-muted-foreground sm:inline">.ai</span>
      </div>

      <nav className="hidden items-center gap-4 sm:flex">
        <NavLink to="/queue" className={navLinkClass}>
          Очередь
        </NavLink>
        <NavLink to="/chat" className={navLinkClass}>
          Чат
        </NavLink>
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden w-40 md:block">
          <Input
            rounded="full"
            startIcon={<Search className="size-4" aria-hidden="true" />}
            aria-label="Поиск моделей"
            placeholder="Поиск моделей"
          />
        </div>
        <ThemeToggle />
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-secondary text-sm font-medium text-foreground"
        >
          А
        </span>
      </div>
    </header>
  )
}
