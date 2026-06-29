import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getUser } from './hooks/useAuth'
import Login from './pages/Login'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Report from './pages/Report'
import Topic from './pages/Topic'
import History from './pages/History'
import Share from './pages/Share'
import './App.css'

function ProtectedRoute({ children }) {
  // Uses module-level cache — 100% synchronous, zero chance of flash
  if (!getUser()) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/report/:date" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/topic/:date/:topicId" element={<ProtectedRoute><Topic /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/share/:token" element={<Share />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
