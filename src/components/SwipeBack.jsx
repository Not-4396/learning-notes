import { useRef, useEffect } from 'react'

// Right-edge swipe-left → go back. Common mobile gesture.
const EDGE_WIDTH = 30  // px from right edge to detect swipe start
const MIN_DELTA = 60   // px minimum swipe distance to trigger back
const MAX_TIME = 400   // ms maximum swipe duration

export default function SwipeBack({ children, onBack }) {
  const startRef = useRef(null)
  const elRef = useRef(null)

  useEffect(() => {
    if (!onBack) return
    const el = elRef.current
    if (!el) return

    function onTouchStart(e) {
      const t = e.changedTouches[0]
      // Only detect swipes starting within right EDGE_WIDTH
      if (window.innerWidth - t.clientX > EDGE_WIDTH) return
      startRef.current = { x: t.clientX, t: Date.now() }
    }

    function onTouchEnd(e) {
      if (!startRef.current) return
      const t = e.changedTouches[0]
      const dx = startRef.current.x - t.clientX
      const dt = Date.now() - startRef.current.t
      startRef.current = null
      if (dx > MIN_DELTA && dt < MAX_TIME) {
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

  return <div ref={elRef} style={{ height: '100%', width: '100%' }}>
    {children}
  </div>
}
