import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueueProvider, StatusBar } from '@/features/generation-queue'
import { ChatPage } from '@/pages/ChatPage'
import { QueuePage } from '@/pages/QueuePage'

export function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}
