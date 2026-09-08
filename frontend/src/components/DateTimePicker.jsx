import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y, m) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }

export default function DateTimePicker({ value, onChange, onConfirm, isOpen, onOpenChange, position = 'right' }) {
  const now = new Date()
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(null)
  const [hours, setHours] = useState(12)
  const [minutes, setMinutes] = useState(0)
  const [open, setOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const hourRef = useRef(null)
  const minuteRef = useRef(null)

  const isOpenControlled = isOpen !== undefined
  const isOpenState = isOpenControlled ? isOpen : open

  useEffect(() => {
    if (editingField === 'hours' && hourRef.current) hourRef.current.focus()
    if (editingField === 'minutes' && minuteRef.current) minuteRef.current.focus()
  }, [editingField])

  useEffect(() => {
    if (isOpenState && !value) {
      const n = new Date()
      setHours(n.getHours())
      setMinutes(n.getMinutes())
      setSelectedDate(new Date(n.getFullYear(), n.getMonth(), n.getDate()))
      setViewDate(new Date(n.getFullYear(), n.getMonth(), 1))
    }
  }, [isOpenState])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()

  useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
        setHours(d.getHours())
        setMinutes(d.getMinutes())
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1))
      }
    }
  }, [value])

  const isPastDateTime = (y, m, d, h, mi) => {
    const dt = new Date(y, m, d, h, mi)
    return dt < new Date()
  }

  const applyValue = (y, m, d, h, mi) => {
    const mm = String(m + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    const hh = String(h).padStart(2, '0')
    const mmi = String(mi).padStart(2, '0')
    onChange(`${y}-${mm}-${dd}T${hh}:${mmi}:00`)
  }

  const handleDayClick = (day) => {
    const d = new Date(year, month, day)
    if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return
    setSelectedDate(d)
    applyValue(year, month, day, hours, minutes)
  }

  const handleHourChange = (delta) => {
    let h = (hours + delta + 24) % 24
    setHours(h)
    if (selectedDate) {
      if (isPastDateTime(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h, minutes)) return
      applyValue(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h, minutes)
    }
  }

  const handleMinuteChange = (delta) => {
    let m = minutes + delta
    if (m < 0) m = 59
    if (m >= 60) m = 0
    setMinutes(m)
    if (selectedDate) {
      if (isPastDateTime(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, m)) return
      applyValue(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, m)
    }
  }

  const setMinute = (m) => {
    setMinutes(m)
    if (selectedDate) {
      if (isPastDateTime(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, m)) return
      applyValue(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, m)
    }
  }

  const isSelected = (day) => selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day
  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const formatDisplay = () => {
    if (!selectedDate) return 'Выберите дату'
    const d = selectedDate
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative">
      <button onClick={() => { const next = !isOpenState; if (isOpenControlled) onOpenChange(next); else setOpen(next); }} className="w-full px-3 py-2 rounded-lg text-sm text-left" style={{ background: '#242f3d', color: '#fff', border: 'none', cursor: 'pointer' }}>
        {formatDisplay()}
      </button>

      {isOpenState && (
        <div className={`absolute top-full mt-1 z-50 rounded-lg p-3 ${position === 'left' ? 'left-0' : 'right-0'}`} style={{ background: '#17212b', border: '1px solid #2b3945', width: '280px', maxWidth: 'calc(100vw - 24px)' }}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1 rounded" style={{ color: '#7b8fa3' }}><ChevronLeft size={16} /></button>
            <span className="text-sm font-medium text-white">{MONTHS[month]} {year}</span>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1 rounded" style={{ color: '#7b8fa3' }}><ChevronRight size={16} /></button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-xs py-1" style={{ color: '#5e6e80' }}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const sel = isSelected(day)
              const tod = isToday(day)
              const d = new Date(year, month, day)
              const isPast = d < new Date(today.getFullYear(), today.getMonth(), today.getDate())
              return (
                <button key={day} onClick={() => handleDayClick(day)} disabled={isPast}
                  className="text-sm py-1.5 rounded transition-all"
                  style={isPast ? { color: '#3b4a5a', cursor: 'not-allowed' } : sel ? { background: '#3390ec', color: '#fff' } : tod ? { background: '#242f3d', color: '#fff' } : { color: '#a8b9cc' }}
                  onMouseEnter={e => { if (!sel && !tod && !isPast) e.target.style.background = '#2b3945' }}
                  onMouseLeave={e => { if (!sel && !tod && !isPast) e.target.style.background = 'transparent' }}>
                  {day}
                </button>
              )
            })}
          </div>

          <div className="mt-3 pt-3 flex items-center justify-center gap-4" style={{ borderTop: '1px solid #2b3945' }}>
            <div className="flex flex-col items-center">
              <button onClick={() => handleHourChange(1)} className="p-0.5" style={{ color: '#7b8fa3' }}><ChevronRight size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
              {editingField === 'hours' ? (
                <input ref={hourRef} type="text" value={inputValue}
                  onChange={e => setInputValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  onBlur={() => { const v = parseInt(inputValue); if (!isNaN(v) && v >= 0 && v <= 23) setHours(v); setEditingField(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(inputValue); if (!isNaN(v) && v >= 0 && v <= 23) setHours(v); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                  className="text-xl font-bold text-white w-10 text-center bg-transparent border-b-2 outline-none" style={{ borderColor: '#3390ec' }} />
              ) : (
                <span onClick={() => { setEditingField('hours'); setInputValue(hours.toString().padStart(2, '0')) }}
                  className="text-xl font-bold text-white w-10 text-center cursor-pointer hover:opacity-80">{hours.toString().padStart(2, '0')}</span>
              )}
              <button onClick={() => handleHourChange(-1)} className="p-0.5" style={{ color: '#7b8fa3' }}><ChevronLeft size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
              <span className="text-xs" style={{ color: '#5e6e80' }}>часы</span>
            </div>
            <span className="text-xl font-bold" style={{ color: '#3390ec' }}>:</span>
            <div className="flex flex-col items-center">
              <button onClick={() => handleMinuteChange(1)} className="p-0.5" style={{ color: '#7b8fa3' }}><ChevronRight size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
              {editingField === 'minutes' ? (
                <input ref={minuteRef} type="text" value={inputValue}
                  onChange={e => setInputValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  onBlur={() => { const v = parseInt(inputValue); if (!isNaN(v) && v >= 0 && v <= 59) setMinutes(v); setEditingField(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt(inputValue); if (!isNaN(v) && v >= 0 && v <= 59) setMinutes(v); setEditingField(null) } if (e.key === 'Escape') setEditingField(null) }}
                  className="text-xl font-bold text-white w-10 text-center bg-transparent border-b-2 outline-none" style={{ borderColor: '#3390ec' }} />
              ) : (
                <span onClick={() => { setEditingField('minutes'); setInputValue(minutes.toString().padStart(2, '0')) }}
                  className="text-xl font-bold text-white w-10 text-center cursor-pointer hover:opacity-80">{minutes.toString().padStart(2, '0')}</span>
              )}
              <button onClick={() => handleMinuteChange(-1)} className="p-0.5" style={{ color: '#7b8fa3' }}><ChevronLeft size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
              <span className="text-xs" style={{ color: '#5e6e80' }}>минуты</span>
            </div>
          </div>

          <div className="flex gap-1 mt-2 justify-center">
            {[0, 15, 30, 45].map(m => (
              <button key={m} onClick={() => setMinute(m)}
                className="text-xs px-3 py-1 rounded transition-colors"
                style={minutes === m ? { background: '#3390ec', color: '#fff' } : { background: '#242f3d', color: '#7b8fa3' }}>
                {m.toString().padStart(2, '0')}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #2b3945' }}>
            {(() => {
              const canCreate = selectedDate && !isPastDateTime(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hours, minutes)
              return (
                <button onClick={() => { if (onConfirm) onConfirm(); (isOpenControlled ? onOpenChange : setOpen)(false) }}
                  disabled={!canCreate}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={canCreate
                    ? { background: '#3390ec', color: '#fff' }
                    : { background: '#1e2c3a', color: '#5e6e80', cursor: 'not-allowed' }}
                  onMouseEnter={e => { if (canCreate) e.currentTarget.style.background = '#2b7fd4' }}
                  onMouseLeave={e => { if (canCreate) e.currentTarget.style.background = '#3390ec' }}>
                  Создать
                </button>
              )
            })()}
            <button onClick={() => { if (onConfirm) onConfirm(''); (isOpenControlled ? onOpenChange : setOpen)(false) }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#242f3d', color: '#7b8fa3' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2b3945'}
              onMouseLeave={e => e.currentTarget.style.background = '#242f3d'}>
              Без времени
            </button>
            <button onClick={() => (isOpenControlled ? onOpenChange : setOpen)(false)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: '#242f3d', color: '#7b8fa3' }}
              onMouseEnter={e => e.currentTarget.style.background = '#2b3945'}
              onMouseLeave={e => e.currentTarget.style.background = '#242f3d'}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
