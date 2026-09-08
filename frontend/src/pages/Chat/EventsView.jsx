import React from 'react'
import { Search } from 'lucide-react'
import AutoResizeInput from '../../components/AutoResizeInput'
import FormattedText from '../../components/FormattedText'
import CardActions from '../../components/CardActions'
import DateTimePicker from '../../components/DateTimePicker'

const FILTERS = [['all', 'Все'], ['active', 'Активные'], ['completed', 'Завершённые']]

async function submitEdit(editEvent, id, title, editedBy, closeEdit) {
  const ok = await editEvent(id, title, editedBy)
  if (ok) closeEdit()
}

async function submitComment(addEventComment, id, content, closeComment) {
  const ok = await addEventComment(id, content)
  if (ok) closeComment()
}

export default function EventsView({
  user, filteredEvents, eventSearchQuery, setEventSearchQuery, eventFilter, setEventFilter,
  newEventText, setNewEventText, newEventTime, setNewEventTime, eventInputRef, createEvent,
  showEventCalendar, setShowEventCalendar,
  changeTimeEventId, setChangeTimeEventId, changeTimeValue, setChangeTimeValue, changeEventTime,
  completeEvent, toggleImportantEvent, deleteEvent, copyEventText, editEvent, addEventComment,
  editingItem, setEditingItem, editTitle, setEditTitle,
  newComment, setNewComment, commentInputVisible, setCommentInputVisible
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex gap-2" style={{ borderBottom: '1px solid #2b3945' }}>
        <AutoResizeInput
          ref={eventInputRef}
          value={newEventText}
          onChange={e => setNewEventText(e.target.value)}
          onSubmit={() => { if (newEventText.trim()) setShowEventCalendar(true) }}
          placeholder="Новое событие..."
          className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-[#5e6e80]"
          style={{ background: '#242f3d', border: 'none' }}
        />
        <div className="w-48">
          <DateTimePicker
            value={newEventTime}
            onChange={setNewEventTime}
            onConfirm={createEvent}
            isOpen={showEventCalendar}
            onOpenChange={setShowEventCalendar}
          />
        </div>
      </div>
      <div className="p-3 flex gap-2" style={{ borderBottom: '1px solid #2b3945' }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5" style={{ color: '#7b8fa3' }} />
          <input
            value={eventSearchQuery}
            onChange={e => setEventSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-[#5e6e80]"
            style={{ background: '#242f3d', border: 'none' }}
          />
        </div>
      </div>
      <div className="px-3 py-2 flex justify-center gap-2" style={{ borderBottom: '1px solid #2b3945' }}>
        {FILTERS.map(([val, label]) => {
          const active = eventFilter === val
          const bg = active
            ? (val === 'active' ? '#22c55e30' : val === 'completed' ? '#ef444430' : '#3b4a5a')
            : '#1e2c3a'
          const color = active
            ? (val === 'active' ? '#4ade80' : val === 'completed' ? '#f87171' : '#fff')
            : '#7b8fa3'
          return (
            <button
              key={val}
              onClick={() => setEventFilter(val)}
              className="flex-1 max-w-[120px] py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: bg, color }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#202b36' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#1e2c3a' }}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredEvents.map((event, idx) => {
          const isCompleted = event.status === 'completed' || event.status === 'expired'
          const isExpired = event.status === 'expired'
          const isImportant = event.is_important && !isCompleted
          const isEven = idx % 2 === 0
          const cardBg = isCompleted
            ? (isEven ? '#2d1a1a' : '#241515')
            : isImportant ? (isEven ? '#362f1f' : '#2a2518') : (isEven ? '#162a1e' : '#132218')
          const cardHover = isCompleted ? '#3a2020' : isImportant ? '#3d3520' : '#1e3a28'
          const leftBorder = isCompleted ? '#ef4444' : isImportant ? '#f59e0b' : '#22c55e'
          return (
            <React.Fragment key={event.id}>
              <div
                className="rounded-xl p-3 w-full transition-colors"
                style={{ background: cardBg, borderLeft: `3px solid ${leftBorder}` }}
                onMouseEnter={e => e.currentTarget.style.background = cardHover}
                onMouseLeave={e => e.currentTarget.style.background = cardBg}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 overflow-hidden" style={{ wordBreak: 'break-word' }}>
                    <p className="text-sm text-white" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <FormattedText text={event.title} />
                    </p>
                    <div className="text-xs mt-1 space-y-0.5" style={{ color: '#7b8fa3' }}>
                      <p>
                        Создал: {event.creator_name || event.display_name} -{' '}
                        {new Date(event.created_at).toLocaleString('ru-RU')}
                      </p>
                      {event.event_time && !isCompleted && (
                        <p style={{ color: '#3390ec' }}>
                          До: {new Date(event.event_time).toLocaleString('ru-RU')}
                        </p>
                      )}
                      {isCompleted && (
                        <p>
                          {isExpired ? 'Время события истекло' : 'Завершено'} -{' '}
                          {event.completed_at && new Date(event.completed_at).toLocaleString('ru-RU')}
                        </p>
                      )}
                      {event.comment && (
                        <p>Комментарий: {event.comment.author_name || '—'} — {event.comment.content}</p>
                      )}
                      {event.edited_at && (
                        <p style={{ color: '#fbbf24' }}>
                          Редактировал: {event.editor_name || '—'} -{' '}
                          {new Date(event.edited_at).toLocaleString('ru-RU')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CardActions
                      isCompleted={isCompleted}
                      isImportant={isImportant}
                      isAdmin={user.is_admin}
                      isCommentActive={commentInputVisible[event.id]}
                      hasEventTime={!!event.event_time}
                      onComplete={() => completeEvent(event.id)}
                      onToggleImportant={() => toggleImportantEvent(event.id)}
                      onComment={() => setCommentInputVisible(prev => ({ ...prev, [event.id]: !prev[event.id] }))}
                      onEdit={() => {
                        if (editingItem?.type === 'event' && editingItem.id === event.id) {
                          setEditingItem(null)
                          setEditTitle('')
                        } else {
                          setEditingItem({ type: 'event', id: event.id })
                          setEditTitle(event.title)
                        }
                      }}
                      onDelete={() => deleteEvent(event.id)}
                      onCopy={() => copyEventText(event)}
                      onChangeTime={() => {
                        setChangeTimeEventId(event.id)
                        setChangeTimeValue(event.event_time || '')
                      }}
                    />
                  </div>
                </div>
              </div>
              {editingItem?.type === 'event' && editingItem.id === event.id && (
                <div className="p-3 rounded-lg" style={{ background: '#0e1621', border: '1px solid #2b3945' }}>
                  <AutoResizeInput
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onSubmit={() => submitEdit(editEvent, event.id, editTitle, user.id, () => {
                      setEditingItem(null)
                      setEditTitle('')
                    })}
                    placeholder="Текст события..."
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[#5e6e80]"
                    style={{ background: '#242f3d', border: 'none' }}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setEditingItem(null)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: '#242f3d', color: '#7b8fa3' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2b3945'}
                      onMouseLeave={e => e.currentTarget.style.background = '#242f3d'}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => submitEdit(editEvent, event.id, editTitle, user.id, () => {
                        setEditingItem(null)
                        setEditTitle('')
                      })}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: '#3390ec', color: '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2b7fd4'}
                      onMouseLeave={e => e.currentTarget.style.background = '#3390ec'}
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              )}
              {changeTimeEventId === event.id && (
                <div className="p-3 rounded-lg" style={{ background: '#0e1621', border: '1px solid #2b3945' }}>
                  <p className="text-xs mb-2" style={{ color: '#7b8fa3' }}>Новое время окончания:</p>
                  <div className="flex gap-2">
                    <DateTimePicker
                      value={changeTimeValue}
                      onChange={setChangeTimeValue}
                      onConfirm={() => changeEventTime(event.id, changeTimeValue)}
                      isOpen={changeTimeEventId === event.id}
                      onOpenChange={(v) => { if (!v) setChangeTimeEventId(null) }}
                      position="left"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => { setChangeTimeEventId(null); setChangeTimeValue('') }}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: '#242f3d', color: '#7b8fa3' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2b3945'}
                      onMouseLeave={e => e.currentTarget.style.background = '#242f3d'}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
              {commentInputVisible[event.id] && (
                <div className="p-3 rounded-lg" style={{ background: '#0e1621', border: '1px solid #2b3945' }}>
                  <AutoResizeInput
                    value={newComment[event.id] || ''}
                    onChange={e => setNewComment(prev => ({ ...prev, [event.id]: e.target.value }))}
                    onSubmit={() => submitComment(addEventComment, event.id, newComment[event.id], () => {
                      setNewComment(prev => ({ ...prev, [event.id]: '' }))
                      setCommentInputVisible(prev => ({ ...prev, [event.id]: false }))
                    })}
                    placeholder="Добавить комментарий..."
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[#5e6e80]"
                    style={{ background: '#242f3d', border: 'none' }}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        setCommentInputVisible(prev => ({ ...prev, [event.id]: false }))
                        setNewComment(prev => ({ ...prev, [event.id]: '' }))
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: '#242f3d', color: '#7b8fa3' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2b3945'}
                      onMouseLeave={e => e.currentTarget.style.background = '#242f3d'}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => submitComment(addEventComment, event.id, newComment[event.id], () => {
                        setNewComment(prev => ({ ...prev, [event.id]: '' }))
                        setCommentInputVisible(prev => ({ ...prev, [event.id]: false }))
                      })}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: '#3390ec', color: '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2b7fd4'}
                      onMouseLeave={e => e.currentTarget.style.background = '#3390ec'}
                    >
                      Отправить
                    </button>
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
