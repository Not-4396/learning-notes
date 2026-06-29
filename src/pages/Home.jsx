import { useState, useEffect, useRef } from 'react'
import { getUser } from '../hooks/useAuth'
import { getSummaryList, getUserScores, generateSummary, pollGenerate } from '../utils/api'
import { formatDate, getToday } from '../utils/date'
import RadarChart from '../components/RadarChart'

export default function Home({ userInfo }) {
  const [dates, setDates] = useState([])
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const winW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 30, 320) : 280
  const [radarSize, setRadarSize] = useState(winW)

  const loadedRef = useRef(false)
  useEffect(() => { setRadarSize(Math.min(window.innerWidth - 30, 320)) }, [])
  useEffect(() => {
    if (userInfo && !loadedRef.current) { loadedRef.current = true; loadData() }
  }, [userInfo])

  async function loadData() {
    const u = getUser(); if (!u) return
    setLoading(true)
    try {
      const [list, scoreRes] = await Promise.all([getSummaryList(u.openid), getUserScores(u.openid)])
      setDates(list.map(d => ({ date_key: d.date_key, topic_count: d.topic_count || 0, total_turns: d.total_turns || 0, display_date: formatDate(d.date_key) })))
      if (scoreRes.ok) setScores(scoreRes.scores)
    } catch (err) { console.error('loadData error:', err) }
    finally { setLoading(false) }
  }

  async function handleGenerate(dateKey) {
    const u = getUser(); if (!u) return
    setGenerating(true)
    try {
      const res = await generateSummary(dateKey, u.openid)
      if (!res.ok) throw new Error(res.error)
      const result = await pollWithTimeout(res.task_id)
      alert(`生成完成: ${result.topic_count}个主题`)
      loadData()
    } catch (err) { alert('生成失败: ' + err.message) }
    finally { setGenerating(false) }
  }

  function pollWithTimeout(taskId) {
    return new Promise((resolve, reject) => {
      let count = 0
      const check = () => {
        if (count >= 40) { reject(new Error('生成超时')); return }
        count++
        setTimeout(async () => {
          try {
            const res = await pollGenerate(taskId)
            if (res.ok) { if (res.status === 'done') resolve(res.result); else if (res.status === 'error') reject(new Error(res.result?.error || '生成失败')); else check() }
            else check()
          } catch { check() }
        }, 3000)
      }
      check()
    })
  }

  function handleGeneratePress() {
    const choice = prompt('选择操作:\n1. 生成今天的笔记\n2. 选择日期生成\n输入 1 或 2:')
    if (choice === '1') handleGenerate(getToday())
    else if (choice === '2') {
      const d = prompt('输入日期 (YYYY-MM-DD):', getToday())
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) handleGenerate(d.trim())
      else if (d) alert('日期格式不正确')
    }
  }

  function handleUserMenu() {
    const action = prompt('1. 修改昵称\n2. 退出登录\n输入 1 或 2:')
    if (action === '1') {
      const n = prompt('输入新昵称:', userInfo?.nickName)
      if (n && n.trim() && window.__nav) window.__nav.updateNickname(n.trim())
    } else if (action === '2') {
      if (confirm('确定要退出登录吗？') && window.__nav) window.__nav.logout()
    }
  }

  const goChat = () => window.__nav && window.__nav.chat()
  const goHistory = () => window.__nav && window.__nav.history()
  const goReport = dk => { location.hash = '#/report/' + dk; window.__nav && window.__nav.report(dk) }

  return (
    <div className="page">
      <div className="header">
        <div className="user-row" onClick={handleUserMenu}>
          {userInfo?.avatarUrl
            ? <img className="user-avatar" src={userInfo.avatarUrl} alt="" />
            : <div className="user-fallback">{(userInfo?.nickName || '?')[0]}</div>}
          <span style={{ fontSize: '0.9rem' }}>{userInfo?.nickName || '用户'}</span>
        </div>
        <span className="site-title">学习笔记</span>
        <span className="site-subtitle">v2.0 · 自适应 · 右滑返回</span>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={goChat}>AI 对话</button>
        <button className="btn secondary" onClick={handleGeneratePress} disabled={generating}>
          {generating ? '生成中...' : '生成笔记'}
        </button>
        <button className="btn secondary" onClick={goHistory}>历史笔记</button>
      </div>

      {userInfo && (
        <div className="section">
          <div className="section-title">学习领域分布 <span className="section-sub">通过对话学习积累分数</span></div>
          <div className="radar-wrap"><RadarChart scores={scores} size={radarSize} animated /></div>
        </div>
      )}

      {dates.length > 0 ? (
        <div className="section">
          {dates.map(item => (
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
        </div>
      ) : !loading ? (
        <div className="empty"><div className="icon">📝</div><div>暂无学习笔记</div><div style={{ fontSize: '0.75rem', color: '#bbb', marginTop: '0.25rem' }}>点击上方按钮生成</div></div>
      ) : (
        <div className="loading-text">加载中...</div>
      )}
    </div>
  )
}
