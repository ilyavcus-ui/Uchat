/**
 * Admin.jsx — Панель администратора (отдельная страница /admin)
 *
 * Функционал:
 * - Авторизация администратора (только пользователи с is_admin=1)
 * - Создание новых пользователей (логин, имя, пароль, права)
 * - Удаление пользователей (кроме главного админа)
 * - Просмотр списка всех пользователей
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Users, Lock } from 'lucide-react'

export default function Admin() {
  const navigate = useNavigate()
  const [isAuth, setIsAuth] = useState(false)       // авторизован ли админ
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [users, setUsers] = useState([])             // список всех пользователей
  const [newUsername, setNewUsername] = useState('')  // форма создания
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuth) fetchUsers()
  }, [isAuth])

  const handleLogin = async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: login, password })
      })
      
      if (res.ok) {
        setIsAuth(true)
      } else {
        setError('Неверный логин или пароль')
      }
    } catch (e) {
      setError('Ошибка подключения')
    }
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users')
    setUsers(await res.json())
  }

  const createUser = async () => {
    if (!newUsername || !newDisplayName || !newPassword) return
    
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: newUsername,
        display_name: newDisplayName,
        password: newPassword,
        is_admin: isAdmin
      })
    })
    
    if (res.ok) {
      setNewUsername('')
      setNewDisplayName('')
      setNewPassword('')
      setIsAdmin(false)
      setError('')
      fetchUsers()
    } else {
      const data = await res.json()
      setError(data.detail || 'Ошибка создания')
    }
  }

  const deleteUser = async (userId) => {
    if (!confirm('Удалить пользователя?')) return
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    fetchUsers()
  }

  if (!isAuth) {
    return (
      <div className="app-min-height bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Админ-панель</h1>
          </div>
          
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Логин"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Пароль"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium mb-4"
          >
            Войти
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full text-gray-400 hover:text-white py-2"
          >
            ← Вернуться в чат
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-min-height bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Вернуться в чат
        </button>
        
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold">Управление пользователями</h1>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-8">
          <h2 className="text-lg font-semibold mb-4">Добавить пользователя</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Логин"
              className="bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Отображаемое имя"
              className="bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Пароль"
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600"
              />
              <span className="text-gray-300">Админ</span>
            </label>
            <button
              onClick={createUser}
              disabled={!newUsername || !newDisplayName || !newPassword}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Добавить
            </button>
          </div>
          
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Пользователи ({users.length})</h2>
          </div>
          
          <div className="divide-y divide-gray-700">
            {users.map(u => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-bold">
                    {u.display_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-white">{u.display_name}</p>
                    <p className="text-sm text-gray-400">@{u.username}</p>
                  </div>
                  {u.is_admin && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded">Админ</span>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="hidden sm:inline text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('ru-RU')}
                  </span>
                  {u.username !== 'admin' && (
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
