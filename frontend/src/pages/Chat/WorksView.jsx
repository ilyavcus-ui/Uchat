import React from 'react'
import { Search, Plus } from 'lucide-react'
import AutoResizeInput from '../../components/AutoResizeInput'
import FormattedText from '../../components/FormattedText'
import CardActions from '../../components/CardActions'

const FILTERS = [['all', 'Все'], ['active', 'Активные'], ['completed', 'Завершённые']]

async function submitEdit(editWork, id, title, editedBy, closeEdit) {
  const ok = await editWork(id, title, editedBy)
  if (ok) closeEdit()
}

async function submitComment(addWorkComment, id, content, closeComment) {
  const ok = await addWorkComment(id, content)
  if (ok) closeComment()
}

export default function WorksView({
  user, works, filteredWorks, workSearchQuery, setWorkSearchQuery, workFilter, setWorkFilter,
  newWorkText, setNewWorkText, workInputRef, createWork,
  completeWork, toggleImportantWork, deleteWork, copyWorkText, editWork, addWorkComment,
  editingItem, setEditingItem, editTitle, setEditTitle,
  newComment, setNewComment, commentInputVisible, setCommentInputVisible
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex gap-2" style={{ borderBottom: '1px solid #2b3945' }}>
        <AutoResizeInput
          ref={workInputRef}
          value={newWorkText}
          onChange={e => setNewWorkText(e.target.value)}
          onSubmit={createWork}
          placeholder="Новая работа..."
          className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-[#5e6e80]"
          style={{ background: '#242f3d', border: 'none' }}
        />
        <button
          onClick={createWork}
          className="px-3 py-2 rounded-lg text-white self-end transition-colors"
          style={{ background: '#3390ec' }}
          onMouseEnter={e => e.currentTarget.style.background = '#2b7fd4'}
          onMouseLeave={e => e.currentTarget.style.background = '#3390ec'}
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="p-3 flex gap-2" style={{ borderBottom: '1px solid #2b3945' }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5" style={{ color: '#7b8fa3' }} />
          <input
            value={workSearchQuery}
            onChange={e => setWorkSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-[#5e6e80]"
            style={{ background: '#242f3d', border: 'none' }}
          />
        </div>
      </div>
      <div className="px-3 py-2 flex justify-center gap-2" style={{ borderBottom: '1px solid #2b3945' }}>
        {FILTERS.map(([val, label]) => {
          const active = workFilter === val
          const bg = active
            ? (val === 'active' ? '#22c55e30' : val === 'completed' ? '#ef444430' : '#3b4a5a')
            : '#1e2c3a'
          const color = active
            ? (val === 'active' ? '#4ade80' : val === 'completed' ? '#f87171' : '#fff')
            : '#7b8fa3'
          return (
            <button
              key={val}
              onClick={() => setWorkFilter(val)}
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
        {filteredWorks.map((work, idx) => {
          const isCompleted = work.status === 'completed'
          const isImportant = work.is_important && !isCompleted
          const isEven = idx % 2 === 0
          const cardBg = isCompleted
            ? (isEven ? '#2d1a1a' : '#241515')
            : isImportant ? (isEven ? '#362f1f' : '#2a2518') : (isEven ? '#162a1e' : '#132218')
          const cardHover = isCompleted ? '#3a2020' : isImportant ? '#3d3520' : '#1e3a28'
          const leftBorder = isCompleted ? '#ef4444' : isImportant ? '#f59e0b' : '#22c55e'
          return (
            <React.Fragment key={work.id}>
              <div
                className="rounded-xl p-3 w-full transition-colors"
                style={{ background: cardBg, borderLeft: `3px solid ${leftBorder}` }}
                onMouseEnter={e => e.currentTarget.style.background = cardHover}
                onMouseLeave={e => e.currentTarget.style.background = cardBg}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 overflow-hidden" style={{ wordBreak: 'break-word' }}>
                    <p className="text-sm text-white" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      <FormattedText text={work.title} />
                    </p>
                    <div className="text-xs mt-1 space-y-0.5" style={{ color: '#7b8fa3' }}>
                      <p>
                        Создал: {work.creator_name || work.display_name} -{' '}
                        {new Date(work.created_at).toLocaleString('ru-RU')}
                      </p>
                      {work.completed_at && (
                        <p>
                          Завершил: {work.completer_name || '—'} -{' '}
                          {new Date(work.completed_at).toLocaleString('ru-RU')}
                        </p>
                      )}
                      {work.comment && (
                        <p>Комментарий: {work.comment.author_name || '—'} — {work.comment.content}</p>
                      )}
                      {work.edited_at && (
                        <p style={{ color: '#fbbf24' }}>
                          Редактировал: {work.editor_name || '—'} -{' '}
                          {new Date(work.edited_at).toLocaleString('ru-RU')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CardActions
                      isCompleted={isCompleted}
                      isImportant={isImportant}
                      isAdmin={user.is_admin}
                      isCommentActive={commentInputVisible[work.id]}
                      onComplete={() => completeWork(work.id)}
                      onToggleImportant={() => toggleImportantWork(work.id)}
                      onComment={() => setCommentInputVisible(prev => ({ ...prev, [work.id]: !prev[work.id] }))}
                      onEdit={() => {
                        if (editingItem?.type === 'work' && editingItem.id === work.id) {
                          setEditingItem(null)
                          setEditTitle('')
                        } else {
                          setEditingItem({ type: 'work', id: work.id })
                          setEditTitle(work.title)
                        }
                      }}
                      onDelete={() => deleteWork(work.id)}
                      onCopy={() => copyWorkText(work)}
                    />
                  </div>
                </div>
              </div>
              {editingItem?.type === 'work' && editingItem.id === work.id && (
                <div className="p-3 rounded-lg" style={{ background: '#0e1621', border: '1px solid #2b3945' }}>
                  <AutoResizeInput
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onSubmit={() => submitEdit(editWork, work.id, editTitle, user.id, () => {
                      setEditingItem(null)
                      setEditTitle('')
                    })}
                    placeholder="Текст работы..."
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
                      onClick={() => submitEdit(editWork, work.id, editTitle, user.id, () => {
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
              {commentInputVisible[work.id] && (
                <div className="p-3 rounded-lg" style={{ background: '#0e1621', border: '1px solid #2b3945' }}>
                  <AutoResizeInput
                    value={newComment[work.id] || ''}
                    onChange={e => setNewComment(prev => ({ ...prev, [work.id]: e.target.value }))}
                    onSubmit={() => submitComment(addWorkComment, work.id, newComment[work.id], () => {
                      setNewComment(prev => ({ ...prev, [work.id]: '' }))
                      setCommentInputVisible(prev => ({ ...prev, [work.id]: false }))
                    })}
                    placeholder="Добавить комментарий..."
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[#5e6e80]"
                    style={{ background: '#242f3d', border: 'none' }}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        setCommentInputVisible(prev => ({ ...prev, [work.id]: false }))
                        setNewComment(prev => ({ ...prev, [work.id]: '' }))
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ background: '#242f3d', color: '#7b8fa3' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#2b3945'}
                      onMouseLeave={e => e.currentTarget.style.background = '#242f3d'}
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => submitComment(addWorkComment, work.id, newComment[work.id], () => {
                        setNewComment(prev => ({ ...prev, [work.id]: '' }))
                        setCommentInputVisible(prev => ({ ...prev, [work.id]: false }))
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
