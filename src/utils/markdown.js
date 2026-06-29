export function markdownToHtml(md) {
  if (!md) return ''

  let html = md

  html = html.replace(/&/g, '&amp;')
  html = html.replace(/</g, '&lt;')
  html = html.replace(/>/g, '&gt;')

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre style="background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;overflow-x:auto;margin:12px 0;font-size:13px;"><code>${code.trim()}</code></pre>`
  })

  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:13px;">$1</code>')

  html = html.replace(/^(\|.+\|)\n(\|[-:| ]+\|)\n((?:\|.+\|\n?)+)/gm, (match, header, separator, body) => {
    const headers = header.split('|').filter(h => h.trim()).map(h => h.trim())
    const rows = body.trim().split('\n').map(row => {
      return row.split('|').filter(cell => cell.trim()).map(cell => cell.trim())
    })
    let table = '<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;background:#fff;">'
    table += '<thead><tr>'
    headers.forEach(h => {
      table += `<th style="border:1px solid #999;padding:8px 10px;background:#e8e8e8;text-align:left;font-weight:bold;">${h}</th>`
    })
    table += '</tr></thead><tbody>'
    rows.forEach((row, rowIndex) => {
      const bgColor = rowIndex % 2 === 0 ? '#fff' : '#f0f7ff'
      table += `<tr style="background:${bgColor};">`
      row.forEach(cell => {
        table += `<td style="border:1px solid #ccc;padding:8px 10px;">${cell}</td>`
      })
      table += '</tr>'
    })
    table += '</tbody></table>'
    return table
  })

  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:16px;font-weight:bold;margin:16px 0 8px;">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:bold;margin:20px 0 10px;">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:bold;margin:24px 0 12px;">$1</h1>')

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#4A90D9;">$1</a>')
  html = html.replace(/^[\-\*] (.+)$/gm, '<li style="margin-left:20px;">$1</li>')
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:20px;">$1</li>')

  html = html.replace(/\n\n/g, '</p><p style="margin:8px 0;">')
  html = html.replace(/\n/g, '<br>')
  html = '<p style="margin:8px 0;">' + html + '</p>'
  html = html.replace(/<p[^>]*><\/p>/g, '')
  return html
}
