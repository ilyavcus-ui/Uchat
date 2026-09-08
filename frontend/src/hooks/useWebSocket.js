import { useState, useEffect, useRef } from 'react'

const SESSION_ID = Math.random().toString(36).substring(7)

/**
 * WebSocket-соединение с автопереподключением и диспетчеризацией входящих
 * сообщений в переданные обработчики. `handlers` может меняться каждый
 * рендер — актуальная версия всегда читается из handlersRef, поэтому
 * обработчики никогда не видят устаревшее состояние (aналог
 * selectedUserRef/activeViewRef из исходной версии, но общий для всех).
 */
export default function useWebSocket(user, handlers) {
  const [ws, setWs] = useState(null)
  const wsRef = useRef(null)
  const [typing, setTyping] = useState(null)
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!user) return

    const connectWebSocket = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.close()
        wsRef.current = null
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const socket = new WebSocket(
        `${protocol}//${window.location.host}/ws?session_id=${SESSION_ID}&user_id=${user.id}`
      )
      wsRef.current = socket
      socket.onopen = () => console.log('WebSocket connected')
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'ping') return
        const h = handlersRef.current
        switch (data.type) {
          case 'user_list': h.onUserList(data.users); break
          case 'new_message': h.onNewMessage(data.message); break
          case 'typing':
            setTyping(data.display_name)
            setTimeout(() => setTyping(null), 2000)
            break
          case 'work_notification': h.onWorkNotification(data); break
          case 'event_notification': h.onEventNotification(data); break
          case 'lunch_notification': h.onLunchNotification(); break
        }
      }
      socket.onclose = () => setTimeout(connectWebSocket, 3000)
      socket.onerror = () => socket.close()
      setWs(socket)
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [user])

  return { ws, typing }
}
