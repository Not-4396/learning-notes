import { useState, useEffect } from 'react'
import { getSharedReport } from '../utils/api'
import MindMap from '../components/MindMap'

export default function Share({ token }) {
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { if (token) loadShared(token) }, [token])

  async function loadShared(t) {
    try {
      const res = await getSharedReport(t)
      if (res.error) { setError(res.error); return }
      if (res.ok && res.data) { setTree(res.data.tree) }
    } catch (err) { setError('加载失败: ' + err.message) }
    finally { setLoading(false) }
  }

  if (loading) return <div className="page"><div className="loading-text">加载中...</div></div>
  if (error) return <div className="page"><div className="empty"><div className="icon">🔒</div><div>{error}</div></div></div>

  return (
    <div className="page">
      <div className="topbar">
        <span className="title">分享的学习日报</span>
      </div>
      {tree && <div style={{ padding: '0.5rem 0' }}><MindMap tree={tree} /></div>}
    </div>
  )
}
