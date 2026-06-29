import { useState, useEffect, useCallback } from 'react'
import { getUser } from './hooks/useAuth'
import Login from './pages/Login'
import Home from './pages/Home'
import Chat from './pages/Chat'
import History from './pages/History'
import Report from './pages/Report'
import Topic from './pages/Topic'
import Share from './pages/Share'
import './App.css'

// ─── Helper: parse #/report/2024-01-01 → {page:'report', date:'2024-01-01'} ───
function parseHash() {
  const h = window.location.hash.slice(2) // strip '#/'
  if (!h) return { page: null }
  const parts = h.split('/')
  const page = parts[0]
  const params = parts.slice(1)
  const [path, qs] = (parts.join('/') || '').split('?')
  const search = new URLSearchParams(qs || '')
  return { page, params, path, search }
}

export default function App() {
  const [screen, setScreen] = useState(() => {
    const info = parseHash()
    if (info.page === 'share') return { page: 'share', token: info.params[0] }
    if (info.page === 'report') return { page: 'report', date: info.params[0] }
    if (info.page === 'topic') return { page: 'topic', date: info.params[0], topicId: info.params[1] }
    return getUser() ? { page: 'home' } : { page: 'login' }
  })

  // Listen for hash changes (back button, external links)
  useEffect(() => {
    function onHashChange() {
      const info = parseHash()
      if (info.page === 'share') setScreen({ page: 'share', token: info.params[0] })
      else if (info.page === 'report') setScreen({ page: 'report', date: info.params[0] })
      else if (info.page === 'topic') setScreen({ page: 'topic', date: info.params[0], topicId: info.params[1] })
      else if (info.page === 'home') setScreen({ page: 'home' })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const goHome = useCallback(() => { location.hash = '#/home'; setScreen({ page: 'home' }) }, [])
  const goChat = useCallback(() => setScreen({ page: 'chat' }), [])
  const goHistory = useCallback(() => setScreen({ page: 'history' }), [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('learning_notes_user')
    setScreen({ page: 'login' })
  }, [])

  const handleUpdateNickname = useCallback((name) => {
    const u = getUser()
    if (u) {
      const updated = { ...u, nickName: name }
      localStorage.setItem('learning_notes_user', JSON.stringify(updated))
      setScreen(s => ({ ...s }))
    }
  }, [])

  // ─── Render ───
  if (screen.page === 'login') {
    return <Login onLogin={() => { location.hash = '#/home'; setScreen({ page: 'home' }) }} />
  }

  if (screen.page === 'chat') {
    return <Chat onBack={goHome} />
  }

  if (screen.page === 'history') {
    return <History onBack={goHome} />
  }

  if (screen.page === 'report') {
    const u = getUser()
    if (!u) return <Login onLogin={() => setScreen({ page: 'home' })} />
    return <Report date={screen.date} userInfo={u} onBack={goHome} />
  }

  if (screen.page === 'topic') {
    const u = getUser()
    if (!u) return <Login onLogin={() => setScreen({ page: 'home' })} />
    return <Topic date={screen.date} topicId={screen.topicId} searchParams={screen.search} onBack={() => setScreen(s => ({ page: 'report', date: s.date }))} />
  }

  if (screen.page === 'share') {
    return <Share token={screen.token} />
  }

  // default: home
  const userInfo = getUser()
  return <Home
    key="home"
    userInfo={userInfo}
    onChat={goChat}
    onHistory={goHistory}
    onLogout={handleLogout}
    onUpdateNickname={handleUpdateNickname}
  />
}
