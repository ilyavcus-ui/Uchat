import { useState, useEffect } from 'react'

/**
 * Авторизация: текущий пользователь, форма логина, сессия в localStorage.
 */
export default function useAuth(api) {
  const [user, setUser] = useState(null)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('chat_user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  const login = async () => {
    setAuthError('')
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
        loadingKey: 'login'
      })
      localStorage.setItem('chat_user', JSON.stringify(data))
      setUser(data)
    } catch (e) {
      setAuthError(e.message || 'Invalid credentials')
    }
  }

  const logout = () => {
    localStorage.removeItem('chat_user')
    setUser(null)
  }

  return { user, loginForm, setLoginForm, authError, login, logout }
}
