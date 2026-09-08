import { useState, useEffect, useRef } from 'react'

/**
 * Работы на сети: список, фильтры, счётчик новых, CRUD, комментарии.
 */
export default function useWorks(user, api, activeView) {
  const [works, setWorks] = useState([])
  const [workSearchQuery, setWorkSearchQuery] = useState('')
  const [workFilter, setWorkFilter] = useState('all')
  const [newWorkText, setNewWorkText] = useState('')
  const [newWorksCount, setNewWorksCount] = useState(
    () => parseInt(localStorage.getItem('chat_newWorksCount') || '0')
  )
  const workInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('chat_newWorksCount', newWorksCount)
  }, [newWorksCount])

  const fetchWorks = async () => {
    const data = await api('/api/works/bulk')
    setWorks(data)
  }

  useEffect(() => {
    if (user) fetchWorks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const createWork = async () => {
    if (!newWorkText.trim()) return
    await api('/api/works', {
      method: 'POST',
      body: JSON.stringify({ title: newWorkText.trim(), user_id: user.id })
    })
    setNewWorkText('')
    fetchWorks()
  }

  const completeWork = async (id) => {
    await api(`/api/works/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed', completed_by: user.id, is_important: 0 })
    })
    fetchWorks()
  }

  const deleteWork = async (id) => {
    if (!confirm('Удалить работу?')) return
    await api(`/api/works/${id}`, { method: 'DELETE' })
    fetchWorks()
  }

  const toggleImportantWork = async (id) => {
    await api(`/api/works/${id}/important`, { method: 'PUT' })
    fetchWorks()
  }

  const editWork = async (id, title, editedBy) => {
    if (!title.trim()) return false
    await api(`/api/works/${id}/edit`, {
      method: 'PUT',
      body: JSON.stringify({ title: title.trim(), edited_by: editedBy })
    })
    fetchWorks()
    return true
  }

  const addWorkComment = async (workId, content) => {
    if (!content?.trim()) return false
    await api(`/api/works/${workId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: content.trim(), user_id: user.id })
    })
    return true
  }

  const copyWorkText = (work) => {
    navigator.clipboard.writeText(work.title)
  }

  const filteredWorks = works.filter(w => {
    if (workFilter !== 'all' && w.status !== workFilter) return false
    if (workSearchQuery && !w.title.toLowerCase().includes(workSearchQuery.toLowerCase())) {
      return false
    }
    return true
  }).sort((a, b) => {
    const aImportant = a.is_important ? 1 : 0
    const bImportant = b.is_important ? 1 : 0
    if (aImportant !== bImportant) return bImportant - aImportant
    const aCompleted = a.status === 'completed' ? 1 : 0
    const bCompleted = b.status === 'completed' ? 1 : 0
    if (aCompleted !== bCompleted) return aCompleted - bCompleted
    if (aImportant && bImportant) return (b.important_at || '').localeCompare(a.important_at || '')
    if (aCompleted && bCompleted) return (b.completed_at || '').localeCompare(a.completed_at || '')
    return (b.created_at || '').localeCompare(a.created_at || '')
  })

  const handleWorkNotification = (data) => {
    fetchWorks()
    if (data.action === 'created' && data.user_id !== user.id && activeView !== 'works') {
      setNewWorksCount(prev => prev + 1)
    }
  }

  return {
    works, setWorks, workSearchQuery, setWorkSearchQuery, workFilter, setWorkFilter,
    newWorkText, setNewWorkText, newWorksCount, setNewWorksCount, workInputRef,
    filteredWorks, createWork, completeWork, deleteWork, toggleImportantWork,
    editWork, addWorkComment, copyWorkText, handleWorkNotification
  }
}
