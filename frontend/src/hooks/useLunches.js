import { useState, useEffect } from 'react'

/**
 * График обедов: список за выбранную дату, CRUD.
 */
export default function useLunches(user, api) {
  const [lunches, setLunches] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedLunchUser, setSelectedLunchUser] = useState(null)
  const [lunchSearchQuery, setLunchSearchQuery] = useState('')

  const fetchLunches = async () => {
    const data = await api('/api/lunches')
    setLunches(data)
  }

  useEffect(() => {
    if (user) fetchLunches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const createLunch = async (hour) => {
    if (!selectedLunchUser) return
    await api('/api/lunches', {
      method: 'POST',
      body: JSON.stringify({ user_id: selectedLunchUser, lunch_date: selectedDate, lunch_hour: hour })
    })
    fetchLunches()
  }

  const deleteLunch = async (id) => {
    await api(`/api/lunches/${id}`, { method: 'DELETE' })
    fetchLunches()
  }

  const clearAllLunches = async () => {
    if (!confirm('Clear all lunches?')) return
    for (const l of lunches.filter(l => l.lunch_date === selectedDate)) {
      await api(`/api/lunches/${l.id}`, { method: 'DELETE' })
    }
    fetchLunches()
  }

  const selectedDateLunches = lunches.filter(l => l.lunch_date === selectedDate)

  return {
    lunches, setLunches, selectedDate, setSelectedDate,
    selectedLunchUser, setSelectedLunchUser, lunchSearchQuery, setLunchSearchQuery,
    selectedDateLunches, createLunch, deleteLunch, clearAllLunches,
    handleLunchNotification: fetchLunches
  }
}
