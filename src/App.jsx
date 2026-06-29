import { useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, getUser } from './hooks/useAuth'
import Login from './pages/Login'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Report from './pages/Report'
import Topic from './pages/Topic'
import History from './pages/History'
import Share from './pages/Share'
import './App.css'

// ─── Bypass React Router for Home/Chat ───
// Phones (Capacitor WebView) can race React hydration with hash routing.
// Using plain state switching for the two main screens — zero routing.

function MainScreen() {
  const { userInfo, logout, updateNickname } = useAuth()
  const [screen, setScreen] = useState('home')

  if (!getUser()) return <Navigate to="/login" replace />

  if (screen === 'chat') {
    return <Chat onBack={() => setScreen('home')} />
  }
  if (screen === 'history') {
    return <History onBack={() => setScreen('home')} />
  }

  return <Home
    userInfo={userInfo}
    onChat={() => setScreen('chat')}
    onHistory={() => setScreen('history')}
    onLogout={logout}
    onUpdateNickname={updateNickname}
  />
}

function ProtectedRoute({ children }) {
  if (!getUser()) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<MainScreen />} />
          <Route path="/report/:date" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/topic/:date/:topicId" element={<ProtectedRoute><Topic /></ProtectedRoute>} />
          <Route path="/share/:token" element={<Share />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
