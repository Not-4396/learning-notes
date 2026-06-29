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
  const [radarSize, setRadarSize] = useState(280)

  const loadedRef = useRef(false)
  useEffect(() => {
    setRadarSize(Math.min(window.innerWidth - 40, 320))
  }, [])
  useEffect(() => {
    if (userInfo && !loadedRef.current) {
      loadedRef.current = true
      loadData()
    }
  }, [userInfo])

  async function loadData() {
    const u = getUser()
    if (!u) return
    setLoading(true)
    try {
      const [list, scoreRes] = await Promise.all([
        getSummaryList(u.openid),
        getUserScores(u.openid)
      ])
      setDates(list.map(d => ({
        date_key: d.date_key,
        topic_count: d.topic_count || 0,
        total_turns: d.total_turns || 0,
        display_date: formatDate(d.date_key)
      })))
      if (scoreRes.ok) setScores(scoreRes.scores)
    } catch (err) { console.error('loadData error:', err) }
    finally { setLoading(false) }
  }

  async function handleGenerate(dateKey) {
    const u = getUser()
    if (!u) return
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
            if (res.ok) {
              if (res.status === 'done') resolve(res.result)
              else if (res.status === 'error') reject(new Error(res.result?.error || '生成失败'))
              else check()
            } else check()
          } catch { check() }
        }, 3000)
      }
      check()
    })
  }

  function handleGeneratePress() {
    const choice = prompt('选择操作:\n1. 生成今天的笔记\n2. 选择日期生成\n输入 1 或 2:')
    if (choice === '1') {
      handleGenerate(getToday())
    } else if (choice === '2') {
      const dateKey = prompt('输入日期 (YYYY-MM-DD):', getToday())
      if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey.trim())) {
        handleGenerate(dateKey.trim())
      } else if (dateKey) {
        alert('日期格式不正确')
      }
    }
  }

  function handleUserMenu() {
    const action = prompt('1. 修改昵称\n2. 退出登录\n输入 1 或 2:')
    if (action === '1') {
      const newName = prompt('输入新昵称:', userInfo?.nickName)
      if (newName && newName.trim() && window.__nav) window.__nav.updateNickname(newName.trim())
    } else if (action === '2') {
      if (confirm('确定要退出登录吗？') && window.__nav) window.__nav.logout()
    }
  }

  // Direct callbacks — no prop drilling
  const goChat = () => window.__nav && window.__nav.chat()
  const goHistory = () => window.__nav && window.__nav.history()
  const goReport = (dateKey) => { location.hash = '#/report/' + dateKey; window.__nav && window.__nav.report(dateKey) }

  return (
    <div className="page">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }} onClick={handleUserMenu}>
          {userInfo?.avatarUrl ? (
            <img src={userInfo.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold' }}>{(userInfo?.nickName || '?')[0]}</div>
          )}
          <span style={{ fontSize: 15 }}>{userInfo?.nickName || '用户'}</span>
        </div>
        <span className="title">学习笔记</span>
        <span className="subtitle">AI 对话学习 · 知识树日报</span>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '16px', justifyContent: 'center' }}>
        <button className="btn"
          onClick={goChat}
          onTouchStart={goChat}
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', userSelect: 'none' }}
        >AI 对话</button>
        <button className="btn secondary"
          onClick={handleGeneratePress}
          disabled={generating}
        >{generating ? '生成中...' : '生成笔记'}</button>
        <button className="btn secondary"
          onClick={goHistory}
          onTouchStart={goHistory}
          style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation', userSelect: 'none' }}
        >历史笔记</button>
      </div>

      {userInfo && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 'bold', fontSize: 15 }}>学习领域分布</span>
            <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>通过对话学习积累分数</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RadarChart scores={scores} size={radarSize} animated />
          </div>
        </div>
      )}

      {dates.length > 0 ? (
        <div style={{ padding: '0 16px' }}>
          {dates.map(item => (
            <div key={item.date_key} onClick={() => goReport(item.date_key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', marginBottom: 8, background: 'white', borderRadius: 12, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{item.display_date}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{item.date_key}</div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 'bold', color: '#4A90D9' }}>{item.topic_count}</div><div style={{ fontSize: 11, color: '#999' }}>主题</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 'bold', color: '#4A90D9' }}>{item.total_turns}</div><div style={{ fontSize: 11, color: '#999' }}>对话</div></div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <div>暂无学习笔记</div>
          <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>点击上方按钮生成</div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
      )}
    </div>
  )
}
