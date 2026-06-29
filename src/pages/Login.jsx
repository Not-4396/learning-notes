import { useState } from 'react'
import { loginUser } from '../utils/api'

export default function Login({ onLogin }) {
  const [nickName, setNickName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit() {
    const name = nickName.trim()
    if (!name) { alert('请输入昵称'); return }
    setLoading(true)
    try {
      const openid = 'local-user-' + Date.now()
      const user = { openid, nickName: name, avatarUrl, _id: Date.now() }
      localStorage.setItem('learning_notes_user', JSON.stringify(user))
      await loginUser(openid, name, avatarUrl)
      onLogin()
    } catch (err) {
      alert('登录失败: ' + err.message)
    } finally { setLoading(false) }
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #4A90D9, #357ABD)', padding: 20 }}>
      <div style={{ color: 'white', textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
        <h1 style={{ fontSize: 26, fontWeight: 'bold' }}>学习笔记</h1>
        <p style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>AI 对话学习 · 知识树日报</p>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '14px 60px', borderRadius: 30, border: 'none', background: 'white', color: '#4A90D9', fontSize: 17, fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}
        >
          开始使用
        </button>
      ) : (
        <div style={{ background: 'white', borderRadius: 16, padding: 30, width: '100%', maxWidth: 340, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
          <h3 style={{ textAlign: 'center', marginBottom: 20, fontSize: 18 }}>设置你的信息</h3>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <label style={{ cursor: 'pointer', display: 'inline-block' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #4A90D9' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#999' }}>+</div>
              )}
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>点击选择头像（可选）</p>
          </div>

          <input
            className="input-field"
            type="text"
            placeholder="请输入你的昵称"
            value={nickName}
            onChange={e => setNickName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', borderRadius: 10 }}
          />

          <button
            className="btn"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', marginTop: 16, padding: '12px 0', borderRadius: 10, fontSize: 16 }}
          >
            {loading ? '登录中...' : '开始学习'}
          </button>
        </div>
      )}
    </div>
  )
}
