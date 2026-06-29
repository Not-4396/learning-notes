import { useState, useEffect, useRef } from 'react'
import { getUser } from '../hooks/useAuth'
import { sendMessage, pollReply, getChatHistory, generateSummary, pollGenerate } from '../utils/api'
import { markdownToHtml } from '../utils/markdown'
import { getToday } from '../utils/date'

export default function Chat({ onBack }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const u = getUser()
    if (u) checkHistory(u)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function checkHistory(u) {
    try {
      const history = await getChatHistory(u.openid, 50)
      if (history.length > 0) {
        const pairCount = Math.floor(history.length / 2)
        if (window.confirm(`你有 ${pairCount} 组历史对话，是否继续上次的知识旅程？`)) {
          setMessages(history.map(m => ({
            role: m.role, content: m.content,
            html: m.role === 'assistant' ? markdownToHtml(m.content) : ''
          })))
        }
      }
    } catch (err) { console.error('checkHistory error:', err) }
  }

  function handleSend() {
    const text = inputText.trim()
    const u = getUser()
    if (!text || loading || !u) return
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInputText('')
    setLoading(true)
    sendMessage(text, u).then(res => {
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
    const u = getUser()
    if (!u) return
    setGenerating(true)
    try {
      const res = await generateSummary(getToday(), u.openid)
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
    <div className="page-flex">
      <div className="topbar">
        <span className="back" onClick={onBack}>&larr;</span>
        <span className="title">AI 学习助手</span>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <span className="action" onClick={() => { if (confirm('清空对话？')) setMessages([]) }}>清空</span>
          <span className="action" onClick={handleGenerate}>{generating ? '生成中...' : '生成笔记'}</span>
        </div>
      </div>

      <div className="page-body">
        {messages.length === 0 && (
          <div className="empty">
            <div className="icon">🤖</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>你好！我是AI学习助手</div>
            <div style={{ fontSize: '0.8rem' }}>有什么问题都可以问我</div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`msg-row ${msg.role === 'user' ? 'user' : ''}`}>
            <div className={`msg-avatar ${msg.role === 'user' ? 'user' : msg.role === 'error' ? 'error' : 'ai'}`}>
              {msg.role === 'user' ? '我' : msg.role === 'error' ? '!' : 'AI'}
            </div>
            <div className={`msg-bubble ${msg.role === 'user' ? 'user' : msg.role === 'error' ? 'error' : 'ai'}`}>
              {msg.role === 'user' ? msg.content : (
                msg.html ? <div dangerouslySetInnerHTML={{ __html: msg.html }} /> : msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg-row">
            <div className="msg-avatar ai">AI</div>
            <div className="msg-bubble ai" style={{ color: '#999' }}>思考中...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-row">
        <input className="chat-input" placeholder="输入你的问题..." value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={loading} />
        <button className="btn" onClick={handleSend} disabled={loading || !inputText.trim()}>发送</button>
      </div>
    </div>
  )
}
