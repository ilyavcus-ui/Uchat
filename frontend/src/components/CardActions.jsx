import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Pencil, Copy, AlertCircle, CheckCircle, MessageSquare, Clock } from 'lucide-react'

const hoverStyle = { onMouseEnter: e => e.currentTarget.style.background = '#2b3945', onMouseLeave: e => e.currentTarget.style.background = 'transparent' }

export default function CardActions({ isCompleted, isImportant, isAdmin, isCommentActive, hasEventTime, onComplete, onToggleImportant, onComment, onEdit, onDelete, onCopy, onChangeTime }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (isCompleted) {
    return isAdmin ? (
      <button onClick={onDelete} className="p-1.5 rounded" style={{ color: '#e55c5c' }} title="Удалить" {...hoverStyle}>X</button>
    ) : null
  }

  return (
    <div className="flex flex-col items-center gap-1" ref={ref}>
      <button onClick={onComplete} className="p-1.5 rounded transition-colors" style={{ color: '#4ade80' }} title="Завершить" {...hoverStyle}><CheckCircle size={16} /></button>
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded transition-colors" style={{ color: open ? '#fff' : '#7b8fa3' }} title="Действия" {...hoverStyle}><MoreVertical size={16} /></button>
        {open && (
          <div className="absolute right-0 top-0 mr-10 flex flex-col gap-1 p-1 rounded-lg z-10" style={{ background: '#242f3d', border: '1px solid #2b3945' }}>
            <button onClick={() => { onCopy(); setOpen(false) }} className="p-1.5 rounded transition-colors" style={{ color: '#7b8fa3' }} title="Копировать" {...hoverStyle}><Copy size={14} /></button>
            <button onClick={() => { onToggleImportant(); setOpen(false) }} className="p-1.5 rounded transition-colors" style={{ color: isImportant ? '#f59e0b' : '#7b8fa3' }} title={isImportant ? 'Убрать важное' : 'Важное'} {...hoverStyle}><AlertCircle size={14} /></button>
            <button onClick={() => { onComment(); setOpen(false) }} className="p-1.5 rounded transition-colors" style={{ color: isCommentActive ? '#3390ec' : '#7b8fa3' }} {...hoverStyle}><MessageSquare size={14} /></button>
            <button onClick={() => { onEdit(); setOpen(false) }} className="p-1.5 rounded transition-colors" style={{ color: '#7b8fa3' }} {...hoverStyle}><Pencil size={14} /></button>
            {hasEventTime && <button onClick={() => { onChangeTime(); setOpen(false) }} className="p-1.5 rounded transition-colors" style={{ color: '#3390ec' }} title="Изменить время" {...hoverStyle}><Clock size={14} /></button>}
            {isAdmin && <button onClick={() => { onDelete(); setOpen(false) }} className="p-1.5 rounded transition-colors" style={{ color: '#e55c5c' }} {...hoverStyle}>X</button>}
          </div>
        )}
      </div>
    </div>
  )
}
