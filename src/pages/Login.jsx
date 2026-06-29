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
      localStorage.setItem('learning_notes_user', JSON.stringify({ openid, nickName: name, avatarUrl, _id: Date.now() }))
      await loginUser(openid, name, avatarUrl)
      onLogin()
    } catch (err) { alert('登录失败: ' + err.message) }
    finally { setLoading(false) }
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-icon">📚</div>
        <h1 className="brand-name">学习笔记</h1>
        <p className="brand-desc">AI 对话学习 · 知识树日报</p>
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          style={{ padding: '0.85rem 3.5rem', borderRadius: '2rem', border: 'none', background: '#fff', color: '#4A90D9', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
          开始使用
        </button>
      ) : (
        <div className="login-card">
          <h3>设置你的信息</h3>
          <div className="avatar-wrap">
            <label style={{ cursor: 'pointer' }}>
              {avatarUrl
                ? <img className="avatar-img" src={avatarUrl} alt="" />
                : <div className="avatar-placeholder">+</div>}
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.3rem' }}>点击选择头像（可选）</p>
          </div>
          <input className="login-input" type="text" placeholder="请输入你的昵称" value={nickName}
            onChange={e => setNickName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          <button className="btn" onClick={handleSubmit} disabled={loading}
            style={{ width: '100%', marginTop: '1rem', padding: '0.7rem 0', borderRadius: '0.6rem', fontSize: '0.9rem' }}>
            {loading ? '登录中...' : '开始学习'}
          </button>
        </div>
      )}
    </div>
  )
}
