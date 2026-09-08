import { useState, useEffect } from 'react'

/**
 * Список пользователей + время последнего сообщения (для сортировки в Sidebar).
 */
export default function useUsers(user, api) {
  const [users, setUsers] = useState([])
  const [lastMessageTimes, setLastMessageTimes] = useState({})
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userFilter, setUserFilter] = useState('all')

  const fetchUsers = async () => {
    const data = await api('/api/users/bulk')
    setUsers(data)
    const times = {}
    for (const u of data) {
      if (u.id !== user.id && u.last_message_at) times[u.id] = u.last_message_at
    }
    setLastMessageTimes(times)
  }

  useEffect(() => {
    if (user) fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const updateLastMessageTime = (userId, createdAt) => {
    setLastMessageTimes(prev => ({ ...prev, [userId]: createdAt }))
  }

  return {
    users, setUsers, fetchUsers, lastMessageTimes, updateLastMessageTime,
    userSearchQuery, setUserSearchQuery, userFilter, setUserFilter
  }
}
