/**
 * App.jsx — Корневой компонент приложения
 *
 * Маршруты:
 * /       → Chat (основной чат + работы на сети)
 * /admin  → Admin (панель управления пользователями, только для админов)
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Chat from './pages/Chat'
import Admin from './pages/Admin'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

export default App
