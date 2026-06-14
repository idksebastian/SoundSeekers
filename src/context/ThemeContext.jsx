import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    if (!userId) return
    try {
      const saved = localStorage.getItem(`ss_theme_${userId}`)
      if (saved) setTheme(saved)
    } catch {}
  }, [userId])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (userId) {
      try { localStorage.setItem(`ss_theme_${userId}`, theme) } catch {}
    }
  }, [theme, userId])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')
  const setThemeUserId = (id) => setUserId(id)

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeUserId }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
