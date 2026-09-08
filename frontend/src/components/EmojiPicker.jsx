import React, { useState, useRef, useEffect } from 'react'

const EMOJI_CATEGORIES = [
  { name: 'Смайлики', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖'] },
  { name: 'Жесты', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪'] },
  { name: 'Животные', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🐪', '🐫', '🦒', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🦜', '🦢', '🐇', '🐿️'] },
  { name: 'Еда', emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥝', '🍅', '🍆', '🥑', '🥦', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🌮', '🌯', '🥗', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍥', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾'] },
  { name: 'Объекты', emojis: ['⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🕹️', '💿', '📷', '📸', '📹', '🎥', '📞', '☎️', '📺', '📻', '🧭', '⏱️', '⏲️', '⏰', '⌛', '⏳', '📡', '🔋', '💡', '🔦', '🕯️', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔩', '⚙️', '⛏️', '🔨', '🔗', '🧲', '🔫', '💣', '🧨', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🏺', '🔮', '🔭', '🔬', '💊', '💉', '🧬', '🧪', '🌡️', '🧹', '🧺', '🚽', '🚿', '🛁', '🧼', '🔑', '🗝️', '🚪', '🛋️', '🛏️', '🧸', '🖼️', '🛍️', '🛒', '🎁', '🎈', '🎀', '🎊', '🎉', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📦', '📜', '📃', '📄', '📊', '📈', '📉', '📅', '🗑️', '📋', '📁', '📂', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '📎', '📐', '📏', '📌', '📍', '✂️', '🖊️', '📝', '✏️', '🔍', '🔎', '🔒', '🔓'] },
  { name: 'Символы', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '☯️', '☦️', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '⚠️', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '#️⃣', '*️⃣', '▶️', '⏸️', '⏹️', '⏭️', '⏮️', '⏪', '⏩', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '💲', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢'] }
]

export default function EmojiPicker({ onSelect, isOpen, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0)
  const ref = useRef(null)
  const tabsRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-emoji-btn]')) onClose()
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  useEffect(() => {
    const outer = ref.current
    const tabs = tabsRef.current
    if (!outer || !tabs || !isOpen) return
    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const isOnTabs = tabs.contains(e.target)
        if (isOnTabs) {
          e.preventDefault()
          e.stopPropagation()
          tabs.scrollLeft += e.deltaY > 0 ? 40 : -40
        }
      }
    }
    outer.addEventListener('wheel', handleWheel, { passive: false })
    return () => outer.removeEventListener('wheel', handleWheel)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div ref={ref} className="absolute rounded-xl shadow-xl overflow-hidden flex flex-col" style={{ background: '#17212b', border: '1px solid #2b3945', width: '320px', maxWidth: 'calc(100vw - 24px)', height: '240px', bottom: '100%', right: '50px', marginBottom: '4px' }}>
      <div ref={tabsRef} className="flex gap-0.5 p-1.5 overflow-x-auto" style={{ borderBottom: '1px solid #2b3945', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button key={i} onClick={() => setActiveCategory(i)}
            className="px-2 py-1 rounded text-xs whitespace-nowrap transition-colors"
            style={{ background: activeCategory === i ? '#3390ec' : 'transparent', color: activeCategory === i ? '#fff' : '#7b8fa3' }}
            onMouseEnter={e => { if (activeCategory !== i) e.currentTarget.style.background = '#202b36' }}
            onMouseLeave={e => { if (activeCategory !== i) e.currentTarget.style.background = 'transparent' }}>
            {cat.name}
          </button>
        ))}
      </div>
      <div className="p-2 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2b3945 transparent' }}>
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => (
            <button key={i} onClick={() => { onSelect(emoji); onClose() }}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-xl transition-colors"
              onMouseEnter={e => e.currentTarget.style.background = '#202b36'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
