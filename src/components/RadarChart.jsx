import { useRef, useEffect } from 'react'

const CATEGORIES = ['财经', '历史', '政治', '艺术', '科技', '自然']

export default function RadarChart({ scores = {}, size = 300, animated = true }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    drawChart()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [scores, size])

  function drawChart() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = size + 'px'
    canvas.style.height = size + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const center = { x: size / 2, y: size / 2 }
    const maxRadius = size / 2 - 40
    const angles = [0, 60, 120, 180, 240, 300].map(a => a * Math.PI / 180)

    function getPoint(c, r, a) {
      return { x: c.x + r * Math.cos(a - Math.PI / 2), y: c.y + r * Math.sin(a - Math.PI / 2) }
    }
    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }

    function drawFrame(progress = 1) {
      ctx.clearRect(0, 0, size, size)
      // Grid
      ctx.strokeStyle = '#E5E5E5'
      ctx.lineWidth = 1
      for (let i = 1; i <= 5; i++) {
        const r = maxRadius * i / 5
        ctx.beginPath()
        angles.forEach((a, idx) => { const p = getPoint(center, r, a); idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y) })
        ctx.closePath(); ctx.stroke()
      }
      // Axes
      ctx.strokeStyle = '#CCC'
      angles.forEach(a => { ctx.beginPath(); ctx.moveTo(center.x, center.y); const p = getPoint(center, maxRadius, a); ctx.lineTo(p.x, p.y); ctx.stroke() })
      // Labels
      angles.forEach((angle, idx) => {
        const lp = getPoint(center, maxRadius + 25, angle)
        ctx.font = '12px sans-serif'; ctx.textBaseline = 'middle'
        if (angle === 0) ctx.textAlign = 'left'
        else if (angle === Math.PI) ctx.textAlign = 'right'
        else ctx.textAlign = 'center'
        const oy = idx === 3 ? -15 : 0
        ctx.fillStyle = '#333'; ctx.fillText(CATEGORIES[idx], lp.x, lp.y + oy)
        const s = Math.round((scores[CATEGORIES[idx]] || 0) * progress)
        ctx.fillStyle = '#4A90D9'; ctx.font = 'bold 14px sans-serif'
        ctx.fillText(s, lp.x, lp.y + oy + 16)
      })
      // Data
      ctx.beginPath()
      CATEGORIES.forEach((cat, idx) => {
        const s = (scores[cat] || 0) * progress
        const p = getPoint(center, maxRadius * s / 100, angles[idx])
        idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
      })
      ctx.closePath()
      ctx.fillStyle = 'rgba(74,144,217,0.3)'; ctx.fill()
      ctx.strokeStyle = '#4A90D9'; ctx.lineWidth = 2; ctx.stroke()
      // Points
      CATEGORIES.forEach((cat, idx) => {
        const s = (scores[cat] || 0) * progress
        const p = getPoint(center, maxRadius * s / 100, angles[idx])
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#4A90D9'; ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
      })
    }

    if (animated) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      const start = performance.now()
      const animate = () => {
        const p = easeOutCubic(Math.min((performance.now() - start) / 1000, 1))
        drawFrame(p)
        if (p < 1) animRef.current = requestAnimationFrame(animate)
      }
      animate()
    } else { drawFrame(1) }
  }

  return <div style={{ width: size, height: size, overflow: 'hidden' }}><canvas ref={canvasRef} style={{ width: size, height: size }} /></div>
}
