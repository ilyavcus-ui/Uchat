import { Search, Send, Smile, MessageSquare } from 'lucide-react'
import AutoResizeInput from '../../components/AutoResizeInput'
import EmojiPicker from '../../components/EmojiPicker'

export default function MessagesView({
  user, ws, selectedUser, messages, filteredMessages, messageSearchQuery, setMessageSearchQuery,
  newMessage, setNewMessage, sendMessage, sendTyping, messagesEndRef,
  showEmojiPicker, setShowEmojiPicker
}) {
  if (!selectedUser) {
    return (
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center" style={{ color: '#7b8fa3' }}>
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-3" />
              <p>Выберите пользователя для чата</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const visibleMessages = messageSearchQuery ? filteredMessages : messages

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="px-3 py-2" style={{ borderBottom: '1px solid #2b3945' }}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5" style={{ color: '#7b8fa3' }} />
            <input
              value={messageSearchQuery}
              onChange={e => setMessageSearchQuery(e.target.value)}
              placeholder="Поиск в сообщениях..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-[#5e6e80]"
              style={{ background: '#242f3d', border: 'none' }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 dark-wallpaper">
          {visibleMessages.map(msg => {
            const isSent = msg.sender_id === user.id
            return (
              <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-3 py-1.5 ${isSent ? 'rounded-br-sm msg-sent' : 'rounded-bl-sm msg-received'}`}>
                  <p className="text-sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.content}
                  </p>
                  <p
                    className="text-[10px] mt-0.5 text-right"
                    style={{ color: isSent ? 'rgba(255,255,255,0.6)' : '#5e6e80' }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 flex gap-2 relative" style={{ borderTop: '1px solid #2b3945' }}>
          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelect={emoji => setNewMessage(prev => prev + emoji)}
          />
          <div className="flex-1 flex items-center gap-1 rounded-lg" style={{ background: '#242f3d' }}>
            <AutoResizeInput
              value={newMessage}
              onChange={e => {
                setNewMessage(e.target.value)
                if (e.target.value) sendTyping(ws)
              }}
              onSubmit={sendMessage}
              placeholder="Сообщение..."
              className="flex-1 px-3 py-2 text-sm text-white placeholder-[#5e6e80] focus:outline-none"
              style={{ background: 'transparent', border: 'none', outline: 'none' }}
            />
            <button
              data-emoji-btn
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex items-center justify-center pr-2 transition-colors flex-shrink-0"
              style={{ color: '#5e6e80', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#5e6e80'}
            >
              <Smile size={20} />
            </button>
          </div>
          <button
            onClick={sendMessage}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-colors self-end"
            style={{ background: '#2a6eb5', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = '#3578b8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2a6eb5'}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
