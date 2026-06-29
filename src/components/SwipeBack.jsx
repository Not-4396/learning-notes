import { useRef, useEffect } from 'react'

// Left-to-right swipe → go back (iOS / WeChat convention)
// Does NOT conflict with Android system edge-back gesture.
const MIN_DX = 80   // minimum horizontal pixel distance
const MAX_DY = 60   // maximum vertical deviation (to avoid scroll conflict)
const MAX_MS = 500  // maximum swipe duration

export default function SwipeBack({ children, onBack }) {
  const startRef = useRef(null)
  const elRef = useRef(null)

  useEffect(() => {
    if (!onBack) return
    const el = elRef.current
    if (!el) return

    function onTouchStart(e) {
      const t = e.touches[0]
      startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    }

    function onTouchEnd(e) {
      if (!startRef.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - startRef.current.x
      const dy = Math.abs(t.clientY - startRef.current.y)
      const dt = Date.now() - startRef.current.t
      startRef.current = null

      // left-to-right, mostly horizontal, fast enough
      if (dx > MIN_DX && dy < MAX_DY && dt < MAX_MS) {
        onBack()
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [onBack])

  return <div ref={elRef} style={{ height: '100%', width: '100%', overflowX: 'hidden' }}>
    {children}
  </div>
}
