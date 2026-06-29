// All data operations now go through the backend REST API
// Vite proxies /api → localhost:3001 in dev
const BACKEND_URL = ''

async function request(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const resp = await fetch(`${BACKEND_URL}${path}`, opts)
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || `接口错误 ${resp.status}`)
  return data
}

// ─── DeepSeek proxy (for client-side callers, though mostly unused now) ───

async function callBackendAPI(systemPrompt, userMessages, maxTokens = 800, endpoint = 'chat') {
  const body = { messages: userMessages, maxTokens }
  if (systemPrompt) body.system = systemPrompt
  return request('POST', `/api/${endpoint}`, body)
}

// ─── Auth ─────────────────────────────────────────────────

export async function loginUser(openid, nickName, avatarUrl = '') {
  if (!nickName) return { ok: false, error: 'nickName required' }
  return request('POST', '/api/auth/login', { openid, nickName, avatarUrl })
}

// ─── Chat ─────────────────────────────────────────────────

export async function sendMessage(message, userInfo) {
  if (!message?.trim()) return { ok: false, error: 'message empty' }
  return request('POST', '/api/conversations/send', {
    message: message.trim(),
    openid: userInfo?.openid || 'local-user',
    nickName: userInfo?.nickName || '',
    avatarUrl: userInfo?.avatarUrl || ''
  })
}

export async function pollReply(msgId) {
  return request('GET', `/api/conversations/poll/${msgId}`)
}

export async function getChatHistory(openid, limit = 50) {
  return request('GET', `/api/conversations?openid=${encodeURIComponent(openid)}&limit=${limit}`)
}

// ─── Summaries ────────────────────────────────────────────

export async function generateSummary(dateKey, openid) {
  return request('POST', '/api/summaries/generate', { dateKey, openid })
}

export async function pollGenerate(taskId) {
  return request('GET', `/api/summaries/generate/${taskId}`)
}

export async function getDailyReport(dateKey, openid) {
  return request('GET', `/api/summaries/${encodeURIComponent(dateKey)}?openid=${encodeURIComponent(openid)}`)
}

export async function getSummaryList(openid) {
  return request('GET', `/api/summaries?openid=${encodeURIComponent(openid)}`)
}

// ─── Scores ───────────────────────────────────────────────

export async function getUserScores(openid) {
  return request('GET', `/api/scores?openid=${encodeURIComponent(openid)}`)
}

// ─── Share ────────────────────────────────────────────────

export async function shareReport(dateKey, openid) {
  return request('POST', '/api/share', { dateKey, openid })
}

export async function getSharedReport(token) {
  return request('GET', `/api/share/${encodeURIComponent(token)}`)
}
