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

// ─── Global navigation — bypasses React props ───
let _setScreen
window.__nav = {
  chat: () => _setScreen && _setScreen({ page: 'chat' }),
  home: () => _setScreen && _setScreen({ page: 'home' }),
  history: () => _setScreen && _setScreen({ page: 'history' }),
  login: () => _setScreen && _setScreen({ page: 'login' }),
  report: (date) => _setScreen && _setScreen({ page: 'report', date }),
  topic: (date, topicId) => _setScreen && _setScreen({ page: 'topic', date, topicId }),
  share: (token) => _setScreen && _setScreen({ page: 'share', token }),
  logout: () => { localStorage.removeItem('learning_notes_user'); _setScreen && _setScreen({ page: 'login' }) },
  updateNickname: (name) => {
    const u = getUser()
    if (u) {
      const updated = { ...u, nickName: name }
      localStorage.setItem('learning_notes_user', JSON.stringify(updated))
      _setScreen && _setScreen(s => ({ ...s }))
    }
  }
}

function parseHash() {
  const h = window.location.hash ? window.location.hash.slice(2) : ''
  if (!h) return {}
  const parts = h.split('/')
  const qsIdx = (parts.slice(1).join('/') || '').indexOf('?')
  const raw = parts.slice(1).join('/')
  return {
    page: parts[0] || null,
    params: parts.slice(1),
    date: parts[1],
    topicId: parts[2],
    token: parts[1]
  }
}

export default function App() {
  const [screen, setScreen] = useState(() => {
    const info = parseHash()
    if (info.page === 'share') return { page: 'share', token: info.token }
    if (info.page === 'report') return { page: 'report', date: info.date }
    if (info.page === 'topic') return { page: 'topic', date: info.date, topicId: info.topicId }
    return getUser() ? { page: 'home' } : { page: 'login' }
  })

  _setScreen = setScreen

  useEffect(() => {
    const fn = () => {
      const info = parseHash()
      if (info.page === 'share') setScreen({ page: 'share', token: info.token })
      else if (info.page === 'report') setScreen({ page: 'report', date: info.date })
      else if (info.page === 'topic') setScreen({ page: 'topic', date: info.date, topicId: info.topicId })
      else if (info.page === 'home') setScreen({ page: 'home' })
    }
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])

  if (screen.page === 'login') {
    return <Login onLogin={() => { location.hash = '#/home'; setScreen({ page: 'home' }) }} />
  }
  if (screen.page === 'chat') {
    return <Chat onBack={() => setScreen({ page: 'home' })} />
  }
  if (screen.page === 'history') {
    return <History onBack={() => setScreen({ page: 'home' })} />
  }
  if (screen.page === 'report') {
    const u = getUser()
    if (!u) return <Login onLogin={() => setScreen({ page: 'home' })} />
    return <Report date={screen.date} userInfo={u} onBack={() => setScreen({ page: 'home' })} />
  }
  if (screen.page === 'topic') {
    const u = getUser()
    if (!u) return <Login onLogin={() => setScreen({ page: 'home' })} />
    return <Topic date={screen.date} topicId={screen.topicId} onBack={() => setScreen({ page: 'report', date: screen.date })} />
  }
  if (screen.page === 'share') {
    return <Share token={screen.token} />
  }

  const userInfo = getUser()
  return <Home userInfo={userInfo} />
}
