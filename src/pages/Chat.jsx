import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendMessage, pollReply, getChatHistory, generateSummary, pollGenerate } from '../utils/api'
import { markdownToHtml } from '../utils/markdown'
import { getToday } from '../utils/date'

export default function Chat() {
  const { userInfo } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    // ProtectedRoute already guards auth; don't redirect here
    // (Capacitor WebView sometimes races React state)
    if (userInfo) checkHistory()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function checkHistory() {
    try {
      const history = await getChatHistory(userInfo.openid, 50)
      if (history.length > 0) {
        const pairCount = Math.floor(history.length / 2)
        if (window.confirm(`你有 ${pairCount} 组历史对话，是否继续上次的知识旅程？`)) {
          setMessages(history.map(m => ({
            role: m.role,
            content: m.content,
            html: m.role === 'assistant' ? markdownToHtml(m.content) : ''
          })))
        }
      }
    } catch (err) { console.error('checkHistory error:', err) }
  }

  function handleSend() {
    const text = inputText.trim()
    if (!text || loading) return

    const msgs = [...messages, { role: 'user', content: text }]
    setMessages(msgs)
    setInputText('')
    setLoading(true)

    sendMessage(text, userInfo).then(res => {
      if (!res.ok) throw new Error(res.error)
      return pollWithTimeout(res.msg_id)
    }).then(reply => {
      setMessages(prev => [...prev, { role: 'assistant', content: reply, html: markdownToHtml(reply) }])
    }).catch(err => {
      setMessages(prev => [...prev, { role: 'error', content: '错误: ' + err.message }])
    }).finally(() => setLoading(false))
  }

  function pollWithTimeout(msgId) {
    return new Promise((resolve, reject) => {
      let count = 0
      const check = () => {
        if (count >= 25) { reject(new Error('等待回复超时')); return }
        count++
        setTimeout(async () => {
          try {
            const res = await pollReply(msgId)
            if (res.ok && res.status === 'done') resolve(res.reply)
            else check()
          } catch { check() }
        }, 2500)
      }
      check()
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await generateSummary(getToday(), userInfo.openid)
      if (!res.ok) throw new Error(res.error)
      const result = await new Promise((resolve, reject) => {
        let count = 0
        const check = () => {
          if (count >= 40) { reject(new Error('生成超时')); return }
          count++
          setTimeout(async () => {
            try {
              const r = await pollGenerate(res.task_id)
              if (r.ok) { if (r.status === 'done') resolve(r.result); else check() }
              else check()
            } catch { check() }
          }, 3000)
        }
        check()
      })
      alert(`生成完成: ${result.topic_count}个主题`)
    } catch (err) { alert('生成失败: ' + err.message) }
    finally { setGenerating(false) }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ background: '#4A90D9', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 17, fontWeight: 'bold' }}>AI 学习助手</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ cursor: 'pointer', fontSize: 14 }} onClick={() => { if (confirm('清空对话？')) setMessages([]) }}>清空</span>
          <span style={{ cursor: 'pointer', fontSize: 14 }} onClick={handleGenerate}>{generating ? '生成中...' : '生成笔记'}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12, WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>你好！我是AI学习助手</div>
            <div style={{ fontSize: 13 }}>有什么问题都可以问我</div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', marginBottom: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 'bold', flexShrink: 0,
              background: msg.role === 'user' ? '#4A90D9' : msg.role === 'error' ? '#D94A4A' : '#5BA85B',
              color: 'white'
            }}>
              {msg.role === 'user' ? '我' : msg.role === 'error' ? '!' : 'AI'}
            </div>
            <div style={{
              maxWidth: '75%', margin: '0 8px', padding: '10px 14px', borderRadius: 12,
              background: msg.role === 'user' ? '#4A90D9' : msg.role === 'error' ? '#fff3f3' : 'white',
              color: msg.role === 'user' ? 'white' : '#333',
              fontSize: 14, lineHeight: 1.6,
              boxShadow: msg.role !== 'user' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}>
              {msg.role === 'user' ? msg.content : (
                msg.html ? <div dangerouslySetInnerHTML={{ __html: msg.html }} /> : msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5BA85B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold', color: 'white', flexShrink: 0 }}>AI</div>
            <div style={{ marginLeft: 8, padding: '10px 14px', borderRadius: 12, background: 'white', fontSize: 14, color: '#999' }}>思考中...</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', padding: '10px 12px', gap: 8, background: 'white', borderTop: '1px solid #eee', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
        <input
          className="input-field"
          placeholder="输入你的问题..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button className="btn" onClick={handleSend} disabled={loading || !inputText.trim()} style={{ padding: '10px 20px', borderRadius: 20, opacity: loading ? 0.5 : 1 }}>
          发送
        </button>
      </div>
    </div>
  )
}
