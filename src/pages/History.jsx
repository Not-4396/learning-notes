import { useState, useEffect } from 'react'
import { getUser } from '../hooks/useAuth'
import { getSummaryList } from '../utils/api'
import { formatDate } from '../utils/date'

export default function History({ onBack }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => { loadNotes() }, [page])

  async function loadNotes() {
    setLoading(true)
    try {
      const u = getUser(); if (!u) return
      const all = await getSummaryList(u.openid)
      const paged = all.slice(0, page * 20)
      setNotes(paged.map(item => ({
        date_key: item.date_key, display_date: formatDate(item.date_key),
        topic_count: item.topic_count || 0, total_turns: item.total_turns || 0
      })))
      setHasMore(paged.length < all.length)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function handleScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop - clientHeight < 80 && hasMore && !loading) setPage(p => p + 1)
  }

  const goReport = dk => { location.hash = '#/report/' + dk; window.__nav && window.__nav.report(dk) }

  return (
    <div className="page-flex">
      <div className="topbar">
        <span className="back" onClick={onBack}>&larr;</span>
        <span className="title">历史笔记</span>
        <span></span>
      </div>
      <div className="page-body" onScroll={handleScroll}>
        {notes.map(item => (
          <div key={item.date_key} className="card" onClick={() => goReport(item.date_key)}>
            <div className="card-left">
              <div className="card-title">{item.display_date}</div>
              <div className="card-date">{item.date_key}</div>
            </div>
            <div style={{ display: 'flex', gap: '1.2rem' }}>
              <div className="card-stat"><div className="card-num">{item.topic_count}</div><div className="card-label">主题</div></div>
              <div className="card-stat"><div className="card-num">{item.total_turns}</div><div className="card-label">对话</div></div>
            </div>
          </div>
        ))}
        {loading && <div className="loading-text">加载中...</div>}
        {!loading && !hasMore && notes.length > 0 && <div style={{ textAlign: 'center', padding: '1rem', color: '#bbb', fontSize: '0.7rem' }}>— 没有更多了 —</div>}
        {!loading && notes.length === 0 && <div className="empty"><div className="icon">📋</div><div>暂无历史笔记</div></div>}
      </div>
    </div>
  )
}
