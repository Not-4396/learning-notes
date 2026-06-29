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
      const u = getUser()
      if (!u) return
      const all = await getSummaryList(u.openid)
      const paged = all.slice(0, page * 20)
      setNotes(paged.map(item => ({
        date_key: item.date_key,
        display_date: formatDate(item.date_key),
        topic_count: item.topic_count || 0,
        total_turns: item.total_turns || 0
      })))
      setHasMore(paged.length < all.length)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function handleScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop - clientHeight < 80 && hasMore && !loading) {
      setPage(p => p + 1)
    }
  }

  return (
    <div className="page" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#4A90D9', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
        {onBack && <span style={{ marginRight: 12, cursor: 'pointer' }} onClick={onBack}>&larr;</span>}
        <span style={{ fontSize: 17, fontWeight: 'bold' }}>历史笔记</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }} onScroll={handleScroll}>
        {notes.map(item => (
          <div key={item.date_key} onClick={() => { location.hash = '#/report/' + item.date_key }}
            style={{ padding: 14, marginBottom: 8, background: 'white', borderRadius: 12, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{item.display_date}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{item.date_key}</div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}><span style={{ fontSize: 16, fontWeight: 'bold', color: '#4A90D9' }}>{item.topic_count}</span><span style={{ fontSize: 11, color: '#999', marginLeft: 2 }}> 主题</span></div>
                <div style={{ textAlign: 'center' }}><span style={{ fontSize: 16, fontWeight: 'bold', color: '#4A90D9' }}>{item.total_turns}</span><span style={{ fontSize: 11, color: '#999', marginLeft: 2 }}> 对话</span></div>
              </div>
            </div>
          </div>
        ))}

        {loading && <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>加载中...</div>}
        {!loading && !hasMore && notes.length > 0 && <div style={{ textAlign: 'center', padding: 20, color: '#bbb', fontSize: 12 }}>— 没有更多了 —</div>}
        {!loading && notes.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div>暂无历史笔记</div>
          </div>
        )}
      </div>
    </div>
  )
}
