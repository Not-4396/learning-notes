import { useState, useEffect } from 'react'
import { getDailyReport } from '../utils/api'
import { getUser } from '../hooks/useAuth'

export default function Topic({ date, topicId, searchParams: sp, onBack }) {
  const [label, setLabel] = useState(sp?.get('label') || '')
  const [detail, setDetail] = useState(sp?.get('detail') || '')
  const [children, setChildren] = useState([])
  const [excerpts, setExcerpts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDetail() }, [date, topicId])

  async function loadDetail() {
    setLoading(true)
    try {
      const u = getUser()
      if (!u) return
      const res = await getDailyReport(date, u.openid)
      if (res.ok) {
        const topic = findNode(res.data.tree, topicId)
        if (topic) {
          setLabel(topic.label || label)
          setDetail(topic.detail || detail)
          setChildren(topic.children || [])
          setExcerpts(topic.excerpts || [])
        }
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function findNode(node, targetId) {
    if (node.id === targetId) return node
    if (node.children) {
      for (const c of node.children) {
        const found = findNode(c, targetId)
        if (found) return found
      }
    }
    return null
  }

  return (
    <div className="page">
      <div style={{ background: '#4A90D9', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: 12, cursor: 'pointer' }} onClick={onBack}>&larr;</span>
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>{decodeURIComponent(label)}</span>
      </div>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>加载中...</div>
        ) : (
          <>
            {detail && (
              <div style={{ background: '#f0f7ff', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 14, lineHeight: 1.7, color: '#444', borderLeft: '3px solid #4A90D9' }}>
                {decodeURIComponent(detail)}
              </div>
            )}

            {children.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, color: '#4A90D9', marginBottom: 10 }}>子主题</h4>
                {children.map(child => (
                  <div key={child.id} onClick={() => { location.hash = `#/topic/${date}/${child.id}?label=${encodeURIComponent(child.label || '')}&detail=${encodeURIComponent(child.detail || '')}` }}
                    style={{ padding: '12px 14px', marginBottom: 6, background: 'white', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: 14 }}>{child.label}</span>
                    <span style={{ color: '#ccc' }}>&rarr;</span>
                  </div>
                ))}
              </div>
            )}

            {excerpts.length > 0 && (
              <div>
                <h4 style={{ fontSize: 14, color: '#4A90D9', marginBottom: 10 }}>相关对话</h4>
                {excerpts.map((ex, idx) => (
                  <div key={idx} style={{ padding: 10, marginBottom: 6, background: 'white', borderRadius: 8, fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                    <span style={{ fontSize: 11, color: '#999', marginRight: 6 }}>[{ex.role === 'user' ? '用户' : 'AI'}]</span>
                    {ex.content}
                  </div>
                ))}
              </div>
            )}

            {!detail && children.length === 0 && excerpts.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无详情</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
