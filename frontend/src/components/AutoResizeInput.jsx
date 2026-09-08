import { useRef, useEffect } from 'react'

export default function AutoResizeInput({ value, onChange, onKeyDown, onSubmit, placeholder, className, style, autoFocus }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])

  const handleKeyDown = (e) => {
    if (onKeyDown) onKeyDown(e)
    if (!e.defaultPrevented && onSubmit && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  const mergedStyle = { minHeight: '36px', maxHeight: '200px', lineHeight: '1.4', resize: 'none', overflowY: 'auto', ...style }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={1}
      className={className}
      style={mergedStyle}
    />
  )
}
