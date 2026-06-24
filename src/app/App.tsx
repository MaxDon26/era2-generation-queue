import { MotionConfig } from 'framer-motion'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueueProvider, StatusBar } from '@/features/generation-queue'
import { ChatPage } from '@/pages/ChatPage'
import { QueuePage } from '@/pages/QueuePage'

export function App() {
  return (
    // HashRouter — для деплоя на GitHub Pages: маршрут в hash, refresh не даёт 404.
    <HashRouter>
      <MotionConfig reducedMotion="user">
        <QueueProvider>
          <Routes>
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/queue" replace />} />
          </Routes>
          <StatusBar />
        </QueueProvider>
      </MotionConfig>
    </HashRouter>
  )
}
