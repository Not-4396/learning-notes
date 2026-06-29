import { useRef, useEffect, useState, useCallback } from 'react'

const NODE_W = 150, NODE_H = 36, H_GAP = 50, V_GAP = 12
const COLORS = ['#4A90D9', '#5BA85B', '#E8A838', '#D94A4A', '#8B5CF6']

export default function MindMap({ tree, onLeafTap }) {
  const cRef = useRef(null), wrapRef = useRef(null)
  const [expandedIds, setExpandedIds] = useState(new Set())
  const vNodes = useRef([]), layout = useRef({ scale: 1, ox: 0, oy: 0 })
  const tsRef = useRef(null)

  useEffect(() => {
    if (!tree) return
    const ids = new Set()
    ;(function walk(n) { if (n.id) ids.add(n.id); if (n.children) n.children.forEach(walk) })(tree)
    setExpandedIds(ids)
  }, [tree])

  useEffect(() => { draw() }, [tree, expandedIds])

  function getExpIds() { return expandedIds }

  function toggleNode(id) {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function draw() {
    const canvas = cRef.current, wrap = wrapRef.current
    if (!canvas || !wrap || !tree) return
    const w = wrap.clientWidth, h = Math.max(wrap.clientHeight, 500)
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr; canvas.height = h * dpr
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h)

    const ids = getExpIds()
    const nodes = layoutTree(tree, ids); vNodes.current = nodes
    const fit = autoFit(nodes, w, h); layout.current = fit

    ctx.save(); ctx.translate(fit.ox, fit.oy); ctx.scale(fit.scale, fit.scale)
    for (const n of nodes) { if (n.parent) drawConn(ctx, n.parent, n) }
    for (const n of nodes) drawNode(ctx, n, ids)
    ctx.restore()
  }

  function layoutTree(root, expIds) {
    const nodes = []; let ny = 0
    function measure(node, depth) {
      const expanded = expIds?.has(node.id), hasKids = node.children?.length > 0
      if (!hasKids || !expanded) { const h = NODE_H + V_GAP; ny += h; return { node, depth, y: ny - h, height: h } }
      const kids = node.children.map(c => measure(c, depth + 1))
      const th = kids.reduce((s, k) => s + k.height, 0)
      return { node, depth, y: kids[0].y + (th - NODE_H) / 2, height: th, childLayouts: kids }
    }
    const ml = measure(root, 0)
    function flatten(layout, parent) {
      const nd = { id: layout.node.id, label: layout.node.label || '', summary: layout.node.summary || '', detail: layout.node.detail || '', x: layout.depth * (NODE_W + H_GAP), y: layout.y, width: NODE_W, height: NODE_H, depth: layout.depth, hasChildren: layout.node.children?.length > 0, isExpanded: expIds?.has(layout.node.id), parent, raw: layout.node }
      nodes.push(nd)
      if (layout.childLayouts) layout.childLayouts.forEach(c => flatten(c, nd))
    }
    flatten(ml, null); return nodes
  }

  function drawNode(ctx, node, expIds) {
    const { x, y, width, height, label, depth, hasChildren } = node
    const r = 6
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + width - r, y); ctx.arcTo(x + width, y, x + width, y + r, r); ctx.lineTo(x + width, y + height - r); ctx.arcTo(x + width, y + height, x + width - r, y + height, r); ctx.lineTo(x + r, y + height); ctx.arcTo(x, y + height, x, y + height - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
    ctx.fillStyle = COLORS[depth % COLORS.length]; ctx.fill()
    if (hasChildren) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.arc(x + width - 14, y + height / 2, 8, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(expIds?.has(node.id) ? '−' : '+', x + width - 14, y + height / 2)
    }
    ctx.fillStyle = '#fff'; ctx.font = depth === 0 ? 'bold 13px sans-serif' : '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
    let txt = label; const mw = width - (hasChildren ? 32 : 16)
    while (ctx.measureText(txt).width > mw && txt.length > 1) txt = txt.slice(0, -1)
    if (txt !== label) txt += '…'
    ctx.fillText(txt, x + 8, y + height / 2)
  }

  function drawConn(ctx, p, c) {
    ctx.beginPath(); ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.5
    const cp1x = p.x + p.width + (c.x - p.x - p.width) * 0.5
    ctx.moveTo(p.x + p.width, p.y + p.height / 2); ctx.bezierCurveTo(cp1x, p.y + p.height / 2, cp1x, c.y + c.height / 2, c.x, c.y + c.height / 2); ctx.stroke()
  }

  function autoFit(nodes, cw, ch) {
    if (!nodes.length) return { scale: 1, ox: 0, oy: 0 }
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9
    nodes.forEach(n => { mnx = Math.min(mnx, n.x); mny = Math.min(mny, n.y); mxx = Math.max(mxx, n.x + n.width); mxy = Math.max(mxy, n.y + n.height) })
    const pad = 30, tw = mxx - mnx, th = mxy - mny
    const s = Math.min((cw - pad * 2) / tw, (ch - pad * 2) / th, 2)
    return { scale: s, ox: pad - mnx * s, oy: pad - mny * s + (ch - th * s) / 2 }
  }

  function hitTest(cx, cy) {
    const wrap = wrapRef.current; if (!wrap) return null
    const rect = wrap.getBoundingClientRect()
    const canvas = cRef.current; const dpr = window.devicePixelRatio || 1
    const sx = canvas.width / dpr / rect.width
    const x = (cx - rect.left) * sx, y = (cy - rect.top) * sx
    const { scale, ox, oy } = layout.current
    const tx = (x - ox) / scale, ty = (y - oy) / scale
    return vNodes.current.find(n => tx >= n.x && tx <= n.x + n.width && ty >= n.y && ty <= n.y + n.height) || null
  }

  const handleTouchStart = useCallback(e => { const t = e.touches[0]; tsRef.current = { time: Date.now(), x: t.clientX, y: t.clientY } }, [])
  const handleTouchEnd = useCallback(e => {
    if (!tsRef.current) return; const t = e.changedTouches[0]
    if (Date.now() - tsRef.current.time > 350 || Math.abs(t.clientX - tsRef.current.x) > 10 || Math.abs(t.clientY - tsRef.current.y) > 10) return
    const n = hitTest(t.clientX, t.clientY)
    if (n?.hasChildren) toggleNode(n.id)
    else if (n && onLeafTap) onLeafTap(n.raw)
  }, [onLeafTap])
  const handleClick = useCallback(e => {
    const n = hitTest(e.clientX, e.clientY)
    if (n?.hasChildren) toggleNode(n.id)
    else if (n && onLeafTap) onLeafTap(n.raw)
  }, [onLeafTap])

  return <div ref={wrapRef} style={{ width: '100%', height: '500px', touchAction: 'none' }} onClick={handleClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}><canvas ref={cRef} style={{ width: '100%', height: '100%' }} /></div>
}
