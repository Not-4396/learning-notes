import { useState, useEffect } from 'react'
import { getDailyReport } from '../utils/api'
import { getUser } from '../hooks/useAuth'

export default function Topic({ date, topicId, onBack }) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '')
  const [label, setLabel] = useState(params.get('label') || '')
  const [detail, setDetail] = useState(params.get('detail') || '')
  const [children, setChildren] = useState([])
  const [excerpts, setExcerpts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDetail() }, [date, topicId])

  async function loadDetail() {
    setLoading(true)
    try {
      const u = getUser(); if (!u) return
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
    if (node.children) for (const c of node.children) { const f = findNode(c, targetId); if (f) return f }
    return null
  }

  const goTopic = (dt, tid, lbl, dtl) => {
    location.hash = `#/topic/${dt}/${tid}?label=${encodeURIComponent(lbl || '')}&detail=${encodeURIComponent(dtl || '')}`
  }

  return (
    <div className="page">
      <div className="topbar">
        <span className="back" onClick={onBack}>&larr;</span>
        <span className="title" style={{ flex: 1, marginLeft: '0.5rem' }}>{decodeURIComponent(label)}</span>
      </div>
      <div style={{ padding: '1rem' }}>
        {loading ? (
          <div className="loading-text">加载中...</div>
        ) : (
          <>
            {detail && <div className="detail-box">{decodeURIComponent(detail)}</div>}
            {children.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#4A90D9', marginBottom: '0.6rem' }}>子主题</h4>
                {children.map(child => (
                  <div key={child.id} className="subtopic" onClick={() => goTopic(date, child.id, child.label, child.detail)}>
                    <span>{child.label}</span><span style={{ color: '#ccc' }}>&rarr;</span>
                  </div>
                ))}
              </div>
            )}
            {excerpts.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.85rem', color: '#4A90D9', marginBottom: '0.6rem' }}>相关对话</h4>
                {excerpts.map((ex, idx) => (
                  <div key={idx} style={{ padding: '0.6rem', marginBottom: '0.35rem', background: '#fff', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>
                    <span style={{ fontSize: '0.7rem', color: '#999', marginRight: '0.35rem' }}>[{ex.role === 'user' ? '用户' : 'AI'}]</span>
                    {ex.content}
                  </div>
                ))}
              </div>
            )}
            {!detail && children.length === 0 && excerpts.length === 0 && (
              <div className="loading-text">暂无详情</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
