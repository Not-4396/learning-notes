import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getDailyReport } from '../utils/api'

export default function Topic() {
  const { date, topicId } = useParams()
  const [searchParams] = useSearchParams()
  const { userInfo } = useAuth()
  const navigate = useNavigate()
  const [label, setLabel] = useState(searchParams.get('label') || '')
  const [detail, setDetail] = useState(searchParams.get('detail') || '')
  const [children, setChildren] = useState([])
  const [excerpts, setExcerpts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDetail()
  }, [date, topicId])

  async function loadDetail() {
    setLoading(true)
    try {
      const res = await getDailyReport(date, userInfo.openid)
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

  function treeToHtml(node, depth = 0) {
    let html = ''
    if (depth === 0) {
      if (node.children) node.children.forEach(c => { html += treeToHtml(c, depth + 1) })
      return html
    }
    const style = depth === 1 ? 'color:#4A90D9;font-size:18px;font-weight:bold;border-left:4px solid #4A90D9;padding-left:10px;margin:20px 0 8px'
      : depth === 2 ? 'color:#5BA85B;font-size:16px;font-weight:bold;margin:15px 0 6px'
      : depth === 3 ? 'color:#E8A838;font-size:14px;font-weight:bold;margin:10px 0 4px'
      : 'font-size:14px;margin:5px 0'
    html += `<div style="${style}">${node.label || ''}</div>`
    if (node.summary) html += `<div style="color:#666;font-style:italic;margin:2px 0 8px;font-size:13px">${node.summary}</div>`
    if (node.detail) html += `<div style="margin:2px 0 8px;font-size:13px">${node.detail}</div>`
    if (node.children) {
      html += `<div style="padding-left:${depth > 1 ? 15 : 0}px">`
      node.children.forEach(c => { html += treeToHtml(c, depth + 1) })
      html += '</div>'
    }
    return html
  }

  return (
    <div className="page">
      <div style={{ background: '#4A90D9', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
        <span style={{ marginRight: 12, cursor: 'pointer' }} onClick={() => navigate(-1)}>&larr;</span>
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
                  <div key={child.id} onClick={() => navigate(`/topic/${date}/${child.id}?label=${encodeURIComponent(child.label || '')}&detail=${encodeURIComponent(child.detail || '')}`)}
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
