import { useState, useEffect, useRef } from 'react'

/**
 * Личные сообщения: переписка, непрочитанные, поиск, набор текста,
 * эмодзи-пикер. `updateLastMessageTime` приходит из useUsers — обновляет
 * время последнего сообщения для сортировки пользователей в сайдбаре.
 */
export default function useMessages(user, api, updateLastMessageTime) {
  const [messages, setMessages] = useState([])
  const [selectedUser, setSelectedUser] = useState(() => {
    const saved = localStorage.getItem('chat_selectedUser')
    return saved ? JSON.parse(saved) : null
  })
  const [unreadCounts, setUnreadCounts] = useState({})
  const [newMessage, setNewMessage] = useState('')
  const [messageSearchQuery, setMessageSearchQuery] = useState('')
  const [filteredMessages, setFilteredMessages] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (selectedUser) localStorage.setItem('chat_selectedUser', JSON.stringify(selectedUser))
    else localStorage.removeItem('chat_selectedUser')
  }, [selectedUser])

  useEffect(() => {
    if (messageSearchQuery && messages.length > 0) {
      const q = messageSearchQuery.toLowerCase()
      setFilteredMessages(messages.filter(m => m.content && m.content.toLowerCase().includes(q)))
    } else {
      setFilteredMessages(messages)
    }
  }, [messages, messageSearchQuery])

  useEffect(() => {
    if (messages.length === 0 || messageSearchQuery) return
    // Сразу после смены messages раскладка страницы ещё может "трястись"
    // (параллельно стартуют загрузки работ/событий/обедов и WS-подключение
    // при входе): в первый момент после коммита DOM браузер иногда ещё не
    // выполнил layout-проход, и контейнер списка временно имеет
    // scrollHeight/clientHeight = 0. Считать это "уже внизу" нельзя — иначе
    // цикл останавливается раньше, чем список реально отрисован. Ждём,
    // пока контейнер не получит настоящую высоту, и только тогда сверяем
    // scrollTop, повторяя попытку на следующем кадре при необходимости.
    let cancelled = false
    let attempts = 0
    const tryScrollToBottom = () => {
      if (cancelled) return
      const el = messagesEndRef.current
      const container = el?.parentElement
      el?.scrollIntoView({ behavior: 'auto' })
      const laidOut = container && container.clientHeight > 0
      const atBottom = laidOut &&
        container.scrollHeight - container.clientHeight - container.scrollTop <= 2
      attempts += 1
      if (!atBottom && attempts < 30) {
        requestAnimationFrame(tryScrollToBottom)
      }
    }
    tryScrollToBottom()
    return () => { cancelled = true }
  }, [messages, messageSearchQuery])

  const fetchMessages = async (userId) => {
    const data = await api(`/api/messages/private/${userId}?current_user_id=${user.id}`)
    setMessages(data)
  }

  const fetchUnreadCounts = async () => {
    if (!user) return
    try {
      const data = await api(`/api/messages/unread/${user.id}`)
      setUnreadCounts(data)
    } catch (e) {
      console.error(e)
    }
  }

  const markAsRead = async (otherUserId) => {
    try {
      await api(`/api/messages/read/${user.id}`, {
        method: 'POST',
        body: JSON.stringify({ other_user_id: otherUserId })
      })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!user) return
    fetchUnreadCounts()
    if (selectedUser) {
      fetchMessages(selectedUser.id)
      markAsRead(selectedUser.id)
    }
    const interval = setInterval(fetchUnreadCounts, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const selectUser = (u) => {
    setSelectedUser(u)
    fetchMessages(u.id)
    setUnreadCounts(prev => ({ ...prev, [u.id]: 0 }))
    markAsRead(u.id)
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    const content = newMessage.trim()
    setNewMessage('')
    setShowEmojiPicker(false)
    try {
      await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          sender_id: user.id,
          receiver_id: selectedUser?.id || null,
          content
        })
      })
    } catch (e) {
      setNewMessage(content)
    }
  }

  const sendTyping = (ws) => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'typing', user_id: user.id, display_name: user.display_name }))
    }
  }

  const handleNewMessage = (message) => {
    if (!message.receiver_id) {
      if (!selectedUser) setMessages(prev => [...prev, message])
    } else {
      if (selectedUser && (
        (message.sender_id === user.id && message.receiver_id === selectedUser.id) ||
        (message.sender_id === selectedUser.id && message.receiver_id === user.id)
      )) {
        setMessages(prev => [...prev, message])
      } else if (message.receiver_id === user.id && message.sender_id !== user.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.sender_id]: (prev[message.sender_id] || 0) + 1
        }))
      }
      const otherId = message.sender_id === user.id ? message.receiver_id : message.sender_id
      updateLastMessageTime(otherId, message.created_at)
    }
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return {
    messages, setMessages, selectedUser, setSelectedUser, selectUser,
    unreadCounts, setUnreadCounts, totalUnread,
    newMessage, setNewMessage, messageSearchQuery, setMessageSearchQuery, filteredMessages,
    showEmojiPicker, setShowEmojiPicker, messagesEndRef,
    fetchMessages, markAsRead, sendMessage, sendTyping, handleNewMessage
  }
}
