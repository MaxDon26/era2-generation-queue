import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { declineGenerations } from '@/shared/lib/declineGenerations'
import { useActiveAggregate, useActiveTasks } from '../../model/useQueue'
import { useStatusBarCollapsed } from '../../model/useStatusBarCollapsed'
import { StatusMulti } from './StatusMulti'
import { StatusPill } from './StatusPill'
import { StatusSingle } from './StatusSingle'

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
}

/**
 * Глобальный плавающий индикатор генераций (тз.md:4.8). Диспетчеризует состояния
 * (mobile-компакт / pill / single / multi) из единого стора. Скрыт на /queue и при 0 активных.
 */
export function StatusBar() {
  const { activeCount, avgProgress } = useActiveAggregate()
  const tasks = useActiveTasks(3)
  const { collapsed, setCollapsed } = useStatusBarCollapsed()
  const { pathname } = useLocation()

  const visible = activeCount > 0 && pathname !== '/queue'
  const mode = collapsed ? 'pill' : activeCount === 1 ? 'single' : 'multi'

  // Анонс для скринридеров — только при СМЕНЕ числа активных, не на тиках прогресса.
  const [announce, setAnnounce] = useState('')
  const prevCount = useRef(0)
  useEffect(() => {
    if (activeCount > 0 && prevCount.current === 0) {
      setAnnounce(`Идёт ${activeCount} ${declineGenerations(activeCount)}`)
    } else if (activeCount === 0 && prevCount.current > 0) {
      setAnnounce('Все генерации завершены')
    } else if (activeCount > 0 && activeCount !== prevCount.current) {
      setAnnounce(`${activeCount} ${declineGenerations(activeCount)} в работе`)
    }
    prevCount.current = activeCount
  }, [activeCount])

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </div>
      <AnimatePresence>
        {visible && (
          <motion.aside
            key="statusbar"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18 }}
            role="complementary"
            aria-label="Статус генераций"
            className="fixed inset-x-3 bottom-3 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end sm:pb-0"
          >
            {/* mobile: компактная полоса на всю ширину */}
            <Link
              to="/queue"
              className="flex w-full items-center gap-2.5 rounded-control border border-primary bg-secondary px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
            >
              <Loader2
                aria-hidden="true"
                className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none"
              />
              <span className="flex-1 text-sm text-foreground">
                {activeCount} {declineGenerations(activeCount)} · {avgProgress}%
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </Link>

            {/* desktop/tablet: pill / single / multi */}
            <div className="hidden sm:block">
              {mode === 'pill' && (
                <StatusPill
                  activeCount={activeCount}
                  avgProgress={avgProgress}
                  onExpand={() => setCollapsed(false)}
                />
              )}
              {mode === 'single' && tasks[0] && <StatusSingle task={tasks[0]} />}
              {mode === 'multi' && (
                <StatusMulti
                  tasks={tasks}
                  activeCount={activeCount}
                  avgProgress={avgProgress}
                  onCollapse={() => setCollapsed(true)}
                />
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
