import { useState, useCallback } from 'react'

const AUTH_KEY = 'learning_notes_user'

function readUser() {
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.openid && parsed.nickName) return parsed
    }
  } catch {}
  return null
}

export function useAuth() {
  // Read synchronously — no stale-closure gap on first render
  const [userInfo, setUserInfo] = useState(readUser)

  const login = useCallback((nickName, avatarUrl = '') => {
    const openid = 'local-user-' + Date.now()
    const user = { openid, nickName, avatarUrl, _id: Date.now() }
    localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    setUserInfo(user)
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    setUserInfo(null)
  }, [])

  const updateNickname = useCallback((newNickname) => {
    setUserInfo(prev => {
      if (!prev) return prev
      const updated = { ...prev, nickName: newNickname }
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return { userInfo, login, logout, updateNickname }
}
