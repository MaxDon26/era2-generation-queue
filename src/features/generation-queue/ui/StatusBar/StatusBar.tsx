import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
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
            layout
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18 }}
            role="complementary"
            aria-label="Статус генераций"
            className="fixed inset-x-3 bottom-3 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:justify-end sm:pb-0"
          >
            {/* Плавная смена состояний pill ↔ single ↔ multi (mode="wait"); размер панели
                анимируется layout. Редирект на /queue — только по ссылке «Открыть очередь». */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="w-full sm:w-auto"
              >
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
              </motion.div>
            </AnimatePresence>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
