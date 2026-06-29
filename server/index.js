import express from 'express'
import Database from 'better-sqlite3'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env
try {
  const envPath = resolve(__dirname, '.env')
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
} catch {}

const PORT = process.env.PORT || 3001
const DS_API_URL = 'https://api.deepseek.com/anthropic/v1/messages'
const DS_API_KEY = process.env.DS_API_KEY || ''
const DS_MODEL = 'deepseek-v4-pro[1m]'
const CATEGORIES = ['财经', '历史', '政治', '艺术', '科技', '自然']

// Data directory
const dataDir = resolve(__dirname, 'data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const db = new Database(resolve(dataDir, 'learning.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT UNIQUE NOT NULL,
    nickName TEXT NOT NULL,
    avatarUrl TEXT DEFAULT '',
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    reply TEXT DEFAULT '',
    replied INTEGER DEFAULT 0,
    timestamp TEXT,
    date_key TEXT,
    platform TEXT DEFAULT 'android',
    openid TEXT NOT NULL,
    nickName TEXT DEFAULT '',
    avatarUrl TEXT DEFAULT '',
    source TEXT DEFAULT 'chat',
    category TEXT DEFAULT '科技',
    depth INTEGER DEFAULT 5,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_conv_openid ON conversations(openid);
  CREATE INDEX IF NOT EXISTS idx_conv_date ON conversations(date_key);
  CREATE INDEX IF NOT EXISTS idx_conv_ts ON conversations(timestamp);
  CREATE TABLE IF NOT EXISTS daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL,
    openid TEXT NOT NULL,
    tree TEXT NOT NULL,
    topic_count INTEGER DEFAULT 0,
    total_turns INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sum_openid ON daily_summaries(openid);
  CREATE TABLE IF NOT EXISTS user_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openid TEXT NOT NULL,
    category TEXT NOT NULL,
    question_count INTEGER DEFAULT 0,
    depth_sum INTEGER DEFAULT 0,
    recent_depths TEXT DEFAULT '[]',
    streak_days INTEGER DEFAULT 0,
    last_active_date TEXT,
    today_count INTEGER DEFAULT 0,
    weekly_active_days TEXT DEFAULT '[]',
    score INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_score_openid ON user_scores(openid);
  CREATE TABLE IF NOT EXISTS generate_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS share_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    share_token TEXT UNIQUE NOT NULL,
    date_key TEXT NOT NULL,
    openid TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    view_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

// Express setup
const app = express()
app.use(express.json({ limit: '2mb' }))
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  if (_req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ─── DeepSeek proxy ──────────────────────────────────────

async function proxyToDeepSeek(system, messages, maxTokens, label) {
  const body = { model: DS_MODEL, max_tokens: maxTokens, temperature: 0.7, messages }
  if (system) body.system = system
  console.log(`[${label}] sending ${messages.length} msgs, ${maxTokens} tokens`)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const resp = await fetch(DS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': DS_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    })
    clearTimeout(timer)
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new Error(`DeepSeek error ${resp.status}: ${text.slice(0, 200)}`)
    }
    const data = await resp.json()
    if (data.content) data.content = data.content.filter(c => c.type === 'text')
    const reply = data?.content?.[0]?.text || ''
    console.log(`[${label}] reply ${reply.length} chars`)
    return data
  } finally {
    clearTimeout(timer)
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { system, messages, maxTokens } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'messages required' })
    res.json(await proxyToDeepSeek(system, messages, maxTokens || 800, 'chat'))
  } catch (err) { res.status(502).json({ error: err.message }) }
})

app.post('/api/generate', async (req, res) => {
  try {
    const { system, messages, maxTokens } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'messages required' })
    res.json(await proxyToDeepSeek(system, messages, maxTokens || 2048, 'generate'))
  } catch (err) { res.status(502).json({ error: err.message }) }
})

// ─── Auth ─────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  try {
    const { openid, nickName, avatarUrl } = req.body
    if (!nickName) return res.status(400).json({ ok: false, error: 'nickName required' })
    const existing = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid)
    if (existing) {
      db.prepare('UPDATE users SET nickName = ?, avatarUrl = ?, last_login = datetime(?) WHERE openid = ?')
        .run(nickName, avatarUrl || '', new Date().toISOString(), openid)
    } else {
      db.prepare('INSERT INTO users (openid, nickName, avatarUrl, last_login) VALUES (?, ?, ?, datetime(?))')
        .run(openid, nickName, avatarUrl || '', new Date().toISOString())
    }
    res.json({ ok: true, openid })
  } catch (err) { res.status(500).json({ ok: false, error: err.message }) }
})

// ─── Conversations ────────────────────────────────────────

// Send message — saves user msg, triggers async AI reply
app.post('/api/conversations/send', (req, res) => {
  try {
    const { message, openid, nickName, avatarUrl } = req.body
    if (!message || !openid) return res.status(400).json({ error: 'message and openid required' })
    const dateKey = new Date().toISOString().slice(0, 10)
    const ts = new Date().toISOString()
    const result = db.prepare(`
      INSERT INTO conversations (role, content, timestamp, date_key, platform, openid, nickName, avatarUrl, source, replied)
      VALUES ('user', ?, ?, ?, 'android', ?, ?, ?, 'chat', 0)
    `).run(message, ts, dateKey, openid, nickName || '', avatarUrl || '')
    const msgId = result.lastInsertRowid

    // Async process AI reply
    processReply(msgId, openid, message, dateKey)

    res.json({ ok: true, msg_id: Number(msgId) })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Poll reply status
app.get('/api/conversations/poll/:msgId', (req, res) => {
  try {
    const msg = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.msgId)
    if (!msg) return res.json({ ok: false, status: 'pending', reply: '' })
    res.json({ ok: true, status: msg.replied ? 'done' : 'pending', reply: msg.reply || '' })
  } catch (err) { res.json({ ok: false, error: err.message }) }
})

// Get conversation
app.get('/api/conversations/:id', (req, res) => {
  try {
    const msg = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id)
    if (!msg) return res.json(null)
    res.json({ id: msg.id, ...msg })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Get chat history
app.get('/api/conversations', (req, res) => {
  try {
    const { openid, limit } = req.query
    if (!openid) return res.status(400).json({ error: 'openid required' })
    const items = db.prepare(`
      SELECT * FROM conversations
      WHERE openid = ? AND source = 'chat' AND replied = 1
      ORDER BY timestamp DESC LIMIT ?
    `).all(openid, parseInt(limit) || 50)
    // Return chronological order
    items.reverse()
    const messages = []
    for (const c of items) {
      if (c.role === 'user' && c.reply) {
        messages.push({ role: 'user', content: c.content })
        messages.push({ role: 'assistant', content: c.reply })
      }
    }
    res.json(messages)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── AI Reply processing (runs async) ─────────────────────

async function processReply(msgId, openid, userMsg, dateKey) {
  try {
    const history = db.prepare(`
      SELECT * FROM conversations
      WHERE openid = ? AND replied = 1
      ORDER BY timestamp DESC LIMIT 4
    `).all(openid)
    history.reverse()

    const systemPrompt = `你是AI学习助手。用简洁中文回答用户问题，控制在300字以内。

回答结束后，请另起一行输出以下元数据（严格按此格式，不要有多余文本）：
---META---
category: [财经|历史|政治|艺术|科技|自然 之一]
depth: [1-10的整数，表示问题专业深度]

只输出这3行，不要输出其他内容在META区域。`

    const historyMsgs = [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: userMsg }]
    const response = await proxyToDeepSeek(systemPrompt, historyMsgs, 800, 'processReply')
    const content = response.content[0].text

    let reply = content, category = '科技', depth = 5
    const metaIdx = content.indexOf('---META---')
    if (metaIdx !== -1) {
      reply = content.slice(0, metaIdx).trim()
      const metaBlock = content.slice(metaIdx)
      const catMatch = metaBlock.match(/category:\s*(.+)/i)
      if (catMatch) {
        const raw = catMatch[1].trim()
        category = CATEGORIES.find(c => raw.includes(c)) || '科技'
      }
      const depthMatch = metaBlock.match(/depth:\s*(\d+)/i)
      if (depthMatch) {
        const d = parseInt(depthMatch[1])
        if (d >= 1 && d <= 10) depth = d
      }
    }
    if (!CATEGORIES.includes(category)) category = '科技'
    if (!depth || depth < 1 || depth > 10) depth = 5

    // Update user message
    db.prepare('UPDATE conversations SET reply = ?, replied = 1, category = ?, depth = ? WHERE id = ?')
      .run(reply, category, depth, msgId)

    // Save AI reply
    const ts = new Date().toISOString()
    db.prepare(`
      INSERT INTO conversations (role, content, timestamp, date_key, platform, openid, source, category, depth)
      VALUES ('assistant', ?, ?, ?, 'android', ?, 'chat', ?, ?)
    `).run(reply, ts, dateKey, openid, category, depth)

    // Update scores
    updateUserScore(openid, category, depth)
  } catch (err) {
    console.error('processReply error:', err.message)
    try {
      db.prepare('UPDATE conversations SET reply = ?, replied = 1 WHERE id = ?')
        .run('AI回复失败: ' + err.message, msgId)
    } catch {}
  }
}

// ─── Summaries ────────────────────────────────────────────

// List summaries for user
app.get('/api/summaries', (req, res) => {
  try {
    const { openid } = req.query
    if (!openid) return res.status(400).json({ error: 'openid required' })
    const rows = db.prepare(`
      SELECT date_key, topic_count, total_turns FROM daily_summaries
      WHERE openid = ? ORDER BY date_key DESC
    `).all(openid)
    res.json(rows.map(r => ({ date_key: r.date_key, topic_count: r.topic_count, total_turns: r.total_turns })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Get single daily report
app.get('/api/summaries/:dateKey', (req, res) => {
  try {
    const { openid } = req.query
    if (!openid) return res.status(400).json({ error: 'openid required' })
    const row = db.prepare('SELECT * FROM daily_summaries WHERE date_key = ? AND openid = ?')
      .get(req.params.dateKey, openid)
    if (!row) return res.json({ ok: false, error: 'no summary found' })
    let tree
    try { tree = JSON.parse(row.tree) } catch { tree = { id: 'root', label: row.date_key, children: [] } }
    res.json({ ok: true, data: { date_key: row.date_key, openid: row.openid, tree, topic_count: row.topic_count, total_turns: row.total_turns } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Generate summary — creates task, starts async processing
app.post('/api/summaries/generate', (req, res) => {
  try {
    const { dateKey, openid } = req.body
    if (!dateKey || !openid) return res.status(400).json({ error: 'dateKey and openid required' })
    const result = db.prepare('INSERT INTO generate_tasks (date_key, status) VALUES (?, ?)').run(dateKey, 'processing')
    const taskId = result.lastInsertRowid
    processGenerate(Number(taskId), dateKey, openid)
    res.json({ ok: true, task_id: Number(taskId) })
  } catch (err) { res.status(500).json({ ok: false, error: err.message }) }
})

// Poll generate task
app.get('/api/summaries/generate/:taskId', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM generate_tasks WHERE id = ?').get(req.params.taskId)
    if (!task) return res.json({ ok: false, status: 'pending' })
    let result = null
    try { result = JSON.parse(task.result) } catch {}
    res.json({ ok: true, status: task.status, result })
  } catch (err) { res.json({ ok: false, error: err.message }) }
})

async function processGenerate(taskId, dateKey, openid) {
  try {
    const conversations = db.prepare(`
      SELECT * FROM conversations WHERE date_key = ? AND openid = ? ORDER BY timestamp LIMIT 50
    `).all(dateKey, openid)

    if (conversations.length === 0) {
      db.prepare('UPDATE generate_tasks SET status = ?, result = ? WHERE id = ?')
        .run('error', JSON.stringify({ error: 'no conversations' }), taskId)
      return
    }

    let text = `--- User: ${openid.slice(-6)} ---\n`
    for (const t of conversations) {
      const prefix = t.role === 'user' ? '用户' : 'AI'
      const content = t.content.length > 1500 ? t.content.slice(0, 1500) + '...' : t.content
      text += `[${prefix}]: ${content}\n\n`
    }
    if (text.length > 15000) text = text.slice(0, 15000) + '\n...[已截断]'

    const prompt = `将以下对话整理成知识树JSON：
{
  "id": "root",
  "label": "${dateKey} 学习笔记",
  "children": [
    {
      "id": "t1",
      "label": "主题名",
      "summary": "一句话总结",
      "children": [
        {
          "id": "s1",
          "label": "核心概念",
          "summary": "概念说明",
          "children": [
            {"id": "d1", "label": "细节要点", "detail": "具体说明"}
          ]
        }
      ]
    }
  ]
}
规则：提取学习知识点，最多4层，中文标签，只输出JSON。`

    const response = await proxyToDeepSeek(prompt, [{ role: 'user', content: text }], 2048, 'generate-tree')
    const reply = response.content[0].text

    let tree
    try { tree = JSON.parse(reply) } catch {
      const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/)
      tree = match ? JSON.parse(match[1].trim()) : { id: 'root', label: dateKey, children: [] }
    }

    const topicCount = tree.children ? tree.children.length : 0
    const existing = db.prepare('SELECT * FROM daily_summaries WHERE date_key = ? AND openid = ?').get(dateKey, openid)
    if (existing) {
      db.prepare(`UPDATE daily_summaries SET tree = ?, topic_count = ?, total_turns = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(JSON.stringify(tree), topicCount, conversations.length, existing.id)
    } else {
      db.prepare('INSERT INTO daily_summaries (date_key, openid, tree, topic_count, total_turns) VALUES (?, ?, ?, ?, ?)')
        .run(dateKey, openid, JSON.stringify(tree), topicCount, conversations.length)
    }

    db.prepare('UPDATE generate_tasks SET status = ?, result = ? WHERE id = ?')
      .run('done', JSON.stringify({ topic_count: topicCount }), taskId)
  } catch (err) {
    console.error('processGenerate error:', err.message)
    try {
      db.prepare('UPDATE generate_tasks SET status = ?, result = ? WHERE id = ?')
        .run('error', JSON.stringify({ error: err.message }), taskId)
    } catch {}
  }
}

// ─── User Scores ──────────────────────────────────────────

app.get('/api/scores', (req, res) => {
  try {
    const { openid } = req.query
    if (!openid) return res.status(400).json({ error: 'openid required' })
    const rows = db.prepare('SELECT * FROM user_scores WHERE openid = ?').all(openid)
    const scoreMap = {}
    CATEGORIES.forEach(c => { scoreMap[c] = 0 })
    rows.forEach(r => { scoreMap[r.category] = r.score || 0 })
    const totalQuestions = rows.reduce((s, r) => s + (r.question_count || 0), 0)
    res.json({ ok: true, scores: scoreMap, total_questions: totalQuestions })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── Score calculation (mirrors original logic) ───────────

function updateUserScore(openid, category, depth) {
  if (!CATEGORIES.includes(category)) return
  const today = new Date().toISOString().slice(0, 10)
  const existing = db.prepare('SELECT * FROM user_scores WHERE openid = ? AND category = ?').get(openid, category)

  if (existing) {
    let recentDepths
    try { recentDepths = JSON.parse(existing.recent_depths || '[]') } catch { recentDepths = [] }
    recentDepths = [...recentDepths, depth].slice(-10)

    const streakDays = calculateStreakDays(existing.last_active_date, existing.streak_days || 0)

    let weeklyActive
    try { weeklyActive = JSON.parse(existing.weekly_active_days || '[]') } catch { weeklyActive = [] }
    const weekStart = getWeekStart()
    weeklyActive = weeklyActive.filter(d => d >= weekStart)
    if (!weeklyActive.includes(today)) weeklyActive.push(today)

    const todayCount = existing.last_active_date === today ? (existing.today_count || 0) : 0
    if (todayCount >= 5) return

    const record = {
      question_count: (existing.question_count || 0) + 1,
      depth_sum: (existing.depth_sum || 0) + depth,
      recent_depths: recentDepths,
      streak_days: streakDays,
      last_active_date: today,
      today_count: todayCount + 1,
      weekly_active_days: weeklyActive
    }
    const score = calculateScore(record)

    db.prepare(`UPDATE user_scores SET
      question_count = ?, depth_sum = ?, recent_depths = ?, streak_days = ?,
      last_active_date = ?, today_count = ?, weekly_active_days = ?, score = ?,
      updated_at = datetime('now')
      WHERE id = ?`)
      .run(record.question_count, record.depth_sum, JSON.stringify(record.recent_depths),
        record.streak_days, record.last_active_date, record.today_count,
        JSON.stringify(record.weekly_active_days), score, existing.id)
  } else {
    const record = {
      question_count: 1, depth_sum: depth, recent_depths: [depth],
      streak_days: 1, last_active_date: today, today_count: 1,
      weekly_active_days: [today]
    }
    const score = calculateScore(record)
    db.prepare(`INSERT INTO user_scores (openid, category, question_count, depth_sum, recent_depths, streak_days, last_active_date, today_count, weekly_active_days, score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(openid, category, record.question_count, record.depth_sum,
        JSON.stringify(record.recent_depths), record.streak_days,
        record.last_active_date, record.today_count,
        JSON.stringify(record.weekly_active_days), score)
  }
}

function calculateScore(record) {
  const { question_count, recent_depths, streak_days, weekly_active_days } = record
  const countScore = Math.min((question_count || 0) * 1.5, 100)
  const avgDepth = (recent_depths || []).length > 0
    ? recent_depths.reduce((a, b) => a + b, 0) / recent_depths.length : 0
  const depthScore = avgDepth * 10

  let chainLength = 1, maxChain = 1
  for (let i = 1; i < (recent_depths || []).length; i++) {
    if (recent_depths[i] >= recent_depths[i - 1] - 1) { chainLength++; maxChain = Math.max(maxChain, chainLength) }
    else { chainLength = 1 }
  }
  const chainScore = Math.min(maxChain * 10, 100)
  const streakScore = Math.min((streak_days || 0) * 8, 100)
  const systemScore = streakScore * 0.6 + chainScore * 0.4

  const continuousScore = (streak_days || 0) * 8
  const weeklyScore = (weekly_active_days || []).length * 5
  const persistenceScore = Math.min(continuousScore + weeklyScore, 100)

  return Math.round(Math.min(countScore * 0.25 + depthScore * 0.30 + systemScore * 0.25 + persistenceScore * 0.20, 100))
}

function calculateStreakDays(lastActiveDate, currentStreak) {
  if (!lastActiveDate) return 1
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (lastActiveDate === today) return currentStreak
  if (lastActiveDate === yesterday) return currentStreak + 1
  return 1
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  return new Date(now.getTime() - diff * 86400000).toISOString().slice(0, 10)
}

// ─── Share ────────────────────────────────────────────────

app.post('/api/share', (req, res) => {
  try {
    const { dateKey, openid } = req.body
    if (!dateKey || !openid) return res.status(400).json({ error: 'dateKey and openid required' })
    const token = Math.random().toString(36).substring(2, 10).toUpperCase()
    const expires = new Date(Date.now() + 7 * 86400000).toISOString()
    db.prepare('INSERT INTO share_links (share_token, date_key, openid, expires_at, view_count) VALUES (?, ?, ?, ?, 0)')
      .run(token, dateKey, openid, expires)
    res.json({ ok: true, share_token: token })
  } catch (err) { res.status(500).json({ ok: false, error: err.message }) }
})

app.get('/api/share/:token', (req, res) => {
  try {
    const link = db.prepare('SELECT * FROM share_links WHERE share_token = ?').get(req.params.token)
    if (!link) return res.json({ error: '无效的分享链接' })
    if (new Date(link.expires_at) < new Date()) return res.json({ error: '分享链接已过期' })
    db.prepare('UPDATE share_links SET view_count = view_count + 1 WHERE id = ?').run(link.id)
    const summary = db.prepare('SELECT * FROM daily_summaries WHERE date_key = ? AND openid = ?')
      .get(link.date_key, link.openid)
    if (!summary) return res.json({ error: '内容已被删除' })
    let tree
    try { tree = JSON.parse(summary.tree) } catch { tree = {} }
    res.json({ ok: true, data: { tree, date_key: summary.date_key } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ─── Health ───────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
  if (!DS_API_KEY) console.warn('WARNING: DS_API_KEY not set')
})
