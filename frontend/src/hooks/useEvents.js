import { useState, useEffect, useRef } from 'react'

/**
 * События: список, фильтры, счётчик новых, CRUD, комментарии, время окончания.
 */
export default function useEvents(user, api, activeView) {
  const [events, setEvents] = useState([])
  const [eventSearchQuery, setEventSearchQuery] = useState('')
  const [eventFilter, setEventFilter] = useState('active')
  const [newEventText, setNewEventText] = useState('')
  const [newEventTime, setNewEventTime] = useState('')
  const [showEventCalendar, setShowEventCalendar] = useState(false)
  const [changeTimeEventId, setChangeTimeEventId] = useState(null)
  const [changeTimeValue, setChangeTimeValue] = useState('')
  const [newEventsCount, setNewEventsCount] = useState(
    () => parseInt(localStorage.getItem('chat_newEventsCount') || '0')
  )
  const eventInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('chat_newEventsCount', newEventsCount)
  }, [newEventsCount])

  const fetchEvents = async () => {
    const data = await api('/api/events/bulk')
    setEvents(data)
  }

  useEffect(() => {
    if (user) fetchEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const createEvent = async (timeValue) => {
    if (!newEventText.trim()) return
    const eventTime = (timeValue !== undefined && timeValue !== null && timeValue !== '')
      ? timeValue : newEventTime || null
    if (eventTime && new Date(eventTime) < new Date()) return
    await api('/api/events', {
      method: 'POST',
      body: JSON.stringify({ title: newEventText.trim(), user_id: user.id, event_time: eventTime })
    })
    setNewEventText('')
    setNewEventTime('')
    fetchEvents()
  }

  const completeEvent = async (id) => {
    await api(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed', completed_by: user.id, is_important: 0 })
    })
    fetchEvents()
  }

  const deleteEvent = async (id) => {
    if (!confirm('Удалить событие?')) return
    await api(`/api/events/${id}`, { method: 'DELETE' })
    fetchEvents()
  }

  const toggleImportantEvent = async (id) => {
    await api(`/api/events/${id}/important`, { method: 'PUT' })
    fetchEvents()
  }

  const editEvent = async (id, title, editedBy) => {
    if (!title.trim()) return false
    await api(`/api/events/${id}/edit`, {
      method: 'PUT',
      body: JSON.stringify({ title: title.trim(), edited_by: editedBy })
    })
    fetchEvents()
    return true
  }

  const changeEventTime = async (id, timeValue) => {
    if (!timeValue) return
    await api(`/api/events/${id}/time`, {
      method: 'PUT',
      body: JSON.stringify({ event_time: timeValue })
    })
    setChangeTimeEventId(null)
    setChangeTimeValue('')
    fetchEvents()
  }

  const addEventComment = async (eventId, content) => {
    if (!content?.trim()) return false
    await api(`/api/events/${eventId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: content.trim(), user_id: user.id })
    })
    return true
  }

  const copyEventText = (event) => {
    navigator.clipboard.writeText(event.title)
  }

  const filteredEvents = events.filter(e => {
    if (eventFilter === 'active' && e.status !== 'active') return false
    if (eventFilter === 'completed' && e.status !== 'completed' && e.status !== 'expired') {
      return false
    }
    if (eventFilter === 'all') { /* show all */ }
    if (eventSearchQuery && !e.title.toLowerCase().includes(eventSearchQuery.toLowerCase())) {
      return false
    }
    return true
  }).sort((a, b) => {
    const aImportant = a.is_important ? 1 : 0
    const bImportant = b.is_important ? 1 : 0
    if (aImportant !== bImportant) return bImportant - aImportant
    const aDone = (a.status === 'completed' || a.status === 'expired') ? 1 : 0
    const bDone = (b.status === 'completed' || b.status === 'expired') ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    if (aImportant && bImportant) return (b.important_at || '').localeCompare(a.important_at || '')
    if (aDone && bDone) return (b.completed_at || '').localeCompare(a.completed_at || '')
    return (b.created_at || '').localeCompare(a.created_at || '')
  })

  const handleEventNotification = (data) => {
    fetchEvents()
    if (data.action === 'created' && data.user_id !== user.id && activeView !== 'events') {
      setNewEventsCount(prev => prev + 1)
    }
  }

  return {
    events, setEvents, eventSearchQuery, setEventSearchQuery, eventFilter, setEventFilter,
    newEventText, setNewEventText, newEventTime, setNewEventTime,
    showEventCalendar, setShowEventCalendar,
    changeTimeEventId, setChangeTimeEventId, changeTimeValue, setChangeTimeValue,
    newEventsCount, setNewEventsCount, eventInputRef, filteredEvents,
    createEvent, completeEvent, deleteEvent, toggleImportantEvent, editEvent,
    changeEventTime, addEventComment, copyEventText, handleEventNotification
  }
}
