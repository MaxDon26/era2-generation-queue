import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueuePage } from '@/pages/QueuePage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/queue" element={<QueuePage />} />
        <Route path="*" element={<Navigate to="/queue" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
