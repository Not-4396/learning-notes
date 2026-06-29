import { useState, useEffect } from 'react'
import { getDailyReport, shareReport, generateSummary } from '../utils/api'
import MindMap from '../components/MindMap'

export default function Report({ date, userInfo, onBack }) {
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDownload, setShowDownload] = useState(false)

  useEffect(() => { loadReport() }, [date])

  async function loadReport() {
    setLoading(true)
    try {
      const res = await getDailyReport(date, userInfo.openid)
      if (res.ok) setTree(res.data.tree); else setTree(null)
    } catch (err) { console.error(err); setTree(null) }
    finally { setLoading(false) }
  }

  function handleLeafTap(node) {
    location.hash = `#/topic/${date}/${node.id}?label=${encodeURIComponent(node.label || '')}&detail=${encodeURIComponent(node.detail || '')}`
  }

  async function handleShare() {
    try {
      const res = await shareReport(date, userInfo.openid)
      if (res.ok) {
        if (navigator.share) {
          await navigator.share({ title: `学习日报 ${date}`, text: '查看我的学习日报', url: `${location.origin}/#/share/${res.share_token}` })
        } else {
          await navigator.clipboard.writeText(`${location.origin}/#/share/${res.share_token}`)
          alert(`分享链接已复制:\nToken: ${res.share_token}`)
        }
      }
    } catch (err) { alert('分享失败: ' + err.message) }
  }

  async function handleRegenerate() {
    if (!confirm('将重新分析对话内容生成知识树，确定吗？')) return
    try {
      const res = await generateSummary(date, userInfo.openid)
      if (res.ok) { alert('已开始重新生成，请稍后刷新'); setTimeout(loadReport, 2000) }
    } catch (err) { alert('生成失败: ' + err.message) }
  }

  function downloadMarkdown() {
    if (!tree) return; setShowDownload(false)
    let md = ''
    function walk(node, depth) {
      if (depth === 0) { md += `# ${node.label || '学习笔记'}\n\n` }
      else if (depth === 1) { md += `## ${node.label || ''}\n`; if (node.summary) md += `> ${node.summary}\n\n` }
      else if (depth === 2) { md += `### ${node.label || ''}\n`; if (node.summary) md += `${node.summary}\n\n` }
      else { md += `${'  '.repeat(depth - 3)}- **${node.label || ''}**`; if (node.detail) md += `: ${node.detail}`; md += '\n' }
      if (node.children) node.children.forEach(c => walk(c, depth + 1))
    }
    walk(tree, 0)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `学习日报_${date}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <div className="topbar">
        <span className="back" onClick={onBack}>&larr; {date}</span>
        <span style={{ fontSize: '0.85rem' }}>{tree?.children?.length || 0} 个主题</span>
      </div>
      {loading ? (
        <div className="loading-text">加载中...</div>
      ) : tree ? (
        <>
          <div style={{ padding: '0.5rem 0' }}><MindMap tree={tree} onLeafTap={handleLeafTap} /></div>
          <div className="action-row">
            <button className="btn" onClick={handleShare}>分享</button>
            <button className="btn secondary" onClick={() => setShowDownload(!showDownload)}>下载</button>
            <button className="btn secondary" onClick={handleRegenerate}>重新生成</button>
          </div>
          {showDownload && (
            <div className="sheet">
              <button onClick={downloadMarkdown}>导出思维导图(Markdown)</button>
              <button onClick={() => { setShowDownload(false); location.hash = `#/topic/${date}/${tree.id || 'root'}?label=${encodeURIComponent(tree.label || '')}` }}>查看文字版</button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">
          <div className="icon">📄</div><div>暂无数据</div>
          <button className="btn" style={{ marginTop: '1rem' }} onClick={handleRegenerate}>生成笔记</button>
        </div>
      )}
    </div>
  )
}
