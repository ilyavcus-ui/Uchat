import { LogOut, Settings, MessageSquare, Briefcase, Calendar, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export default function Sidebar({
  user, users, activeView, selectedUser, sidebarOpen, setSidebarOpen,
  newWorksCount, newEventsCount, totalUnread, userSearchQuery, setUserSearchQuery,
  userFilter, setUserFilter, filteredUsers, unreadCounts,
  onSelectView, onSelectUser, onLogout, onShowAdmin,
  lunchSearchQuery, setLunchSearchQuery, selectedLunchUser, setSelectedLunchUser,
  lunches, clearAllLunches
}) {
  return (
    <div
      className={`flex flex-col flex-shrink-0 overflow-hidden md:transition-all md:duration-200 ${sidebarOpen ? 'w-full md:w-[280px]' : 'w-0'}`}
      style={{ background: '#17212b', borderRight: sidebarOpen ? '1px solid #2b3945' : 'none' }}
    >

      {/* Logo + Toggle */}
      <div className="h-14 px-4 flex items-center justify-between" style={{ borderBottom: '1px solid #2b3945' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Uchat" className="w-9 h-9 rounded-lg object-contain" />
          <span className="font-semibold text-white text-sm">Uchat</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#7b8fa3' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#7b8fa3'} title="Свернуть">
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* Navigation */}
      <div className="px-2 py-2 space-y-1.5">
        <button onClick={() => onSelectView('works')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm"
          style={!selectedUser && activeView === 'works' ? { background: '#202b36', color: '#fff' } : { color: '#fff' }}
          onMouseEnter={e => { if (!(activeView === 'works' && !selectedUser)) e.currentTarget.style.background = '#202b36' }}
          onMouseLeave={e => { if (!(activeView === 'works' && !selectedUser)) e.currentTarget.style.background = '' }}>
          <MessageSquare className="w-5 h-5" style={!selectedUser && activeView === 'works' ? {} : { color: '#7b8fa3' }} />
          <span>Работы</span>
          {newWorksCount > 0 ? <span className="ml-auto w-2 h-2 rounded-full" style={{ background: '#3390ec' }}></span> : null}
        </button>
        <button onClick={() => onSelectView('events')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm"
          style={!selectedUser && activeView === 'events' ? { background: '#202b36', color: '#fff' } : { color: '#fff' }}
          onMouseEnter={e => { if (!(activeView === 'events' && !selectedUser)) e.currentTarget.style.background = '#202b36' }}
          onMouseLeave={e => { if (!(activeView === 'events' && !selectedUser)) e.currentTarget.style.background = '' }}>
          <Calendar className="w-5 h-5" style={!selectedUser && activeView === 'events' ? {} : { color: '#7b8fa3' }} />
          <span>События</span>
          {newEventsCount > 0 ? <span className="ml-auto w-2 h-2 rounded-full" style={{ background: '#3390ec' }}></span> : null}
        </button>
        <button onClick={() => onSelectView('lunches')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm"
          style={!selectedUser && activeView === 'lunches' ? { background: '#202b36', color: '#fff' } : { color: '#fff' }}
          onMouseEnter={e => { if (!(activeView === 'lunches' && !selectedUser)) e.currentTarget.style.background = '#202b36' }}
          onMouseLeave={e => { if (!(activeView === 'lunches' && !selectedUser)) e.currentTarget.style.background = '' }}>
          <Briefcase className="w-5 h-5" style={!selectedUser && activeView === 'lunches' ? {} : { color: '#7b8fa3' }} />
          <span>Обеды</span>
        </button>
        <button onClick={() => onSelectView('messages')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm"
          style={!selectedUser && activeView === 'messages' ? { background: '#202b36', color: '#fff' } : { color: '#fff' }}
          onMouseEnter={e => { if (!(activeView === 'messages' && !selectedUser)) e.currentTarget.style.background = '#202b36' }}
          onMouseLeave={e => { if (!(activeView === 'messages' && !selectedUser)) e.currentTarget.style.background = '' }}>
          <MessageSquare className="w-5 h-5" style={!selectedUser && activeView === 'messages' ? {} : { color: '#7b8fa3' }} />
          <span>Сообщения</span>
          {totalUnread > 0 ? <span className="ml-auto w-2 h-2 rounded-full" style={{ background: '#3390ec' }}></span> : null}
        </button>
        {user.is_admin ? (
          <button onClick={onShowAdmin}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm" style={{ color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = '#202b36'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <Settings className="w-5 h-5" style={{ color: '#7b8fa3' }} />            <span>Админ</span>
          </button>
        ) : null}
      </div>

      {/* Messages user list */}
      {activeView === 'messages' && (
        <div className="flex-1 overflow-y-auto px-2 py-2" style={{ borderTop: '1px solid #2b3945' }}>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7b8fa3' }} />
            <input type="text" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Поиск..." className="w-full text-white rounded-lg pl-9 pr-3 py-2 text-sm placeholder-[#5e6e80]"
              style={{ background: '#242f3d', border: 'none' }} />
          </div>
          <div className="flex gap-1 mb-3 px-1">
            {[
              ['all', 'Все', '#3b4a5a'],
              ['unread', 'Непрочит.', '#3390ec'],
              ['online', 'Онлайн', '#22c55e40'],
              ['offline', 'Офлайн', '#ef444440']
            ].map(([val, label, activeBg]) => (
              <button key={val} onClick={() => setUserFilter(val)}
                className="flex-1 text-xs py-1.5 rounded-lg transition-colors text-center"
                style={userFilter === val ? { background: activeBg, color: '#fff' } : { color: '#7b8fa3', background: '#1e2c3a' }}>
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            {filteredUsers.map(u => (
              <button key={u.id} onClick={() => onSelectUser(u)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm"
                style={selectedUser?.id === u.id ? { background: '#202b36', color: '#fff' } : { color: '#fff' }}
                onMouseEnter={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = '#202b36' }}
                onMouseLeave={e => { if (selectedUser?.id !== u.id) e.currentTarget.style.background = '' }}>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: '#2a6eb5', color: '#fff' }}>{u.display_name[0]}</div>
                  {u.is_online ? <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full" style={{ background: '#4dcd5e', border: '2px solid #17212b' }}></div> : null}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm truncate" style={{ color: '#fff' }}>{u.display_name}</p>
                </div>
                {unreadCounts[u.id] > 0 ? (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium text-center" style={{ background: '#3390ec', color: '#fff', minWidth: '20px' }}>{unreadCounts[u.id]}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lunches user list */}
      {activeView === 'lunches' && (
        <div className="flex-1 overflow-y-auto px-2 py-2" style={{ borderTop: '1px solid #2b3945' }}>
          <button onClick={clearAllLunches} disabled={lunches.length === 0}
            className="w-full text-sm py-2 rounded-lg mb-3 disabled:opacity-50 transition-colors"
            style={{ background: '#e55c5c20', color: '#e55c5c' }}
            onMouseEnter={e => e.currentTarget.style.background = '#e55c5c30'}
            onMouseLeave={e => e.currentTarget.style.background = '#e55c5c20'}>
            Очистить все
          </button>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7b8fa3' }} />
            <input type="text" value={lunchSearchQuery} onChange={(e) => setLunchSearchQuery(e.target.value)}
              placeholder="Поиск..." className="w-full text-white rounded-lg pl-9 pr-3 py-2 text-sm placeholder-[#5e6e80]"
              style={{ background: '#242f3d', border: 'none' }} />
          </div>
          <div className="space-y-1">
            {users.filter(u => {
              if (lunchSearchQuery && !u.display_name.toLowerCase().includes(lunchSearchQuery.toLowerCase())) return false
              return true
            }).sort((a, b) => a.display_name.localeCompare(b.display_name)).map(u => (
              <button key={u.id} onClick={() => setSelectedLunchUser(u.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm"
                style={selectedLunchUser === u.id ? { background: '#202b36', color: '#fff' } : { color: '#fff' }}
                onMouseEnter={e => { if (selectedLunchUser !== u.id) e.currentTarget.style.background = '#202b36' }}
                onMouseLeave={e => { if (selectedLunchUser !== u.id) e.currentTarget.style.background = '' }}>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: '#2a6eb5', color: '#fff' }}>{u.display_name[0]}</div>
                  {u.is_online ? <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full" style={{ background: '#4dcd5e', border: '2px solid #17212b' }}></div> : null}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm truncate" style={{ color: '#fff' }}>{u.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Profile */}
      <div className="mt-auto h-14 px-4 flex items-center justify-between" style={{ borderTop: '1px solid #2b3945' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-sm" style={{ background: '#2a6eb5', color: '#fff' }}>{user.display_name[0]}</div>
          <p className="font-medium text-white text-sm truncate">{user.display_name}</p>
        </div>
        <button onClick={onLogout} className="p-1.5 rounded-lg transition-colors flex-shrink-0" style={{ color: '#7b8fa3' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#7b8fa3'} title="Logout">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
