import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export default function PageTransition({ children }) {
  const location = useLocation()
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    const timer = setTimeout(() => {
      el.style.opacity = '1'
    }, 20)
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <div
      ref={ref}
      style={{ opacity: 0, transition: 'opacity 0.2s ease' }}
    >
      {children}
    </div>
  )
}