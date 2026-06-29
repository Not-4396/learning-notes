import { useState, useCallback } from 'react'

const AUTH_KEY = 'learning_notes_user'

// Module-level cache — survives React remounts.
// ProtectedRoute reads this directly so it never flashes null.
let userCache = null

export function getUser() {
  if (userCache) return userCache
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (raw) {
      const u = JSON.parse(raw)
      if (u.openid && u.nickName) {
        userCache = u
        return u
      }
    }
  } catch {}
  return null
}

export function useAuth() {
  const [userInfo, setUserInfo] = useState(() => getUser())

  const login = useCallback((nickName, avatarUrl = '') => {
    const openid = 'local-user-' + Date.now()
    const user = { openid, nickName, avatarUrl, _id: Date.now() }
    localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    userCache = user
    setUserInfo(user)
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    userCache = null
    setUserInfo(null)
  }, [])

  const updateNickname = useCallback((newNickname) => {
    setUserInfo(prev => {
      if (!prev) return prev
      const updated = { ...prev, nickName: newNickname }
      localStorage.setItem(AUTH_KEY, JSON.stringify(updated))
      userCache = updated
      return updated
    })
  }, [])

  return { userInfo, login, logout, updateNickname }
}
