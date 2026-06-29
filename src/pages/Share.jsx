import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getSharedReport } from '../utils/api'
import MindMap from '../components/MindMap'

export default function Share() {
  const { token } = useParams()
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) loadShared(token)
  }, [token])

  async function loadShared(shareToken) {
    try {
      const res = await getSharedReport(shareToken)
      if (res.error) { setError(res.error); setLoading(false); return }
      if (res.ok && res.data) { setTree(res.data.tree) }
    } catch (err) {
      setError('加载失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="page"><div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div></div>
  if (error) return <div className="page"><div style={{ textAlign: 'center', padding: 60, color: '#999' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div><div>{error}</div></div></div>

  return (
    <div className="page">
      <div style={{ background: '#4A90D9', color: 'white', padding: '12px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 'bold' }}>分享的学习日报</span>
      </div>
      {tree && (
        <div style={{ padding: '8px 0' }}>
          <MindMap tree={tree} />
        </div>
      )}
    </div>
  )
}
