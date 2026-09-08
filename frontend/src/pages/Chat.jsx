/**
 * Chat — Main application component.
 * Handles auth, navigation, works, events, lunches, messages, and admin.
 */

import { useState, useEffect } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import AdminModal from '../components/AdminModal'
import LoginForm from './Chat/LoginForm'
import WorksView from './Chat/WorksView'
import EventsView from './Chat/EventsView'
import LunchesView from './Chat/LunchesView'
import MessagesView from './Chat/MessagesView'
import useApi from '../hooks/useApi'
import useAuth from '../hooks/useAuth'
import useWebSocket from '../hooks/useWebSocket'
import useUsers from '../hooks/useUsers'
import useWorks from '../hooks/useWorks'
import useEvents from '../hooks/useEvents'
import useLunches from '../hooks/useLunches'
import useMessages from '../hooks/useMessages'
import useIsMobile from '../hooks/useIsMobile'

export default function Chat() {
  const { api, loading, globalError } = useApi()
  const auth = useAuth(api)
  const { user } = auth

  const [activeView, setActiveView] = useState(() => localStorage.getItem('chat_activeView') || 'works')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAdmin, setShowAdmin] = useState(false)
  const isMobile = useIsMobile()

  // Общее для панелей "Работы" и "События" состояние редактирования и
  // комментариев — словари ключуются по id, единое поле для обеих панелей,
  // как и в исходной версии (сознательно не разносится по хукам).
  const [editingItem, setEditingItem] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [newComment, setNewComment] = useState({})
  const [commentInputVisible, setCommentInputVisible] = useState({})

  // Форма создания пользователя в админ-модалке
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSearchQuery, setAdminSearchQuery] = useState('')

  const usersHook = useUsers(user, api)
  const worksHook = useWorks(user, api, activeView)
  const eventsHook = useEvents(user, api, activeView)
  const lunchesHook = useLunches(user, api)
  const messagesHook = useMessages(user, api, usersHook.updateLastMessageTime)
  const { ws, typing } = useWebSocket(user, {
    onUserList: usersHook.setUsers,
    onNewMessage: messagesHook.handleNewMessage,
    onWorkNotification: worksHook.handleWorkNotification,
    onEventNotification: eventsHook.handleEventNotification,
    onLunchNotification: lunchesHook.handleLunchNotification
  })

  useEffect(() => {
    localStorage.setItem('chat_activeView', activeView)
  }, [activeView])

  const handleLogout = () => {
    auth.logout()
    messagesHook.setMessages([])
    worksHook.setWorks([])
    usersHook.setUsers([])
  }

  const filteredUsers = usersHook.users.filter(u => {
    if (u.id === user.id) return false
    if (usersHook.userFilter === 'online' && !u.is_online) return false
    if (usersHook.userFilter === 'offline' && u.is_online) return false
    if (usersHook.userFilter === 'unread' && !messagesHook.unreadCounts[u.id]) return false
    if (
      usersHook.userSearchQuery &&
      !u.display_name.toLowerCase().includes(usersHook.userSearchQuery.toLowerCase())
    ) {
      return false
    }
    return true
  }).sort((a, b) => {
    const aTime = usersHook.lastMessageTimes[a.id] || ''
    const bTime = usersHook.lastMessageTimes[b.id] || ''
    if (aTime && bTime) return bTime.localeCompare(aTime)
    if (aTime) return -1
    if (bTime) return 1
    return a.display_name.localeCompare(b.display_name)
  })

  if (!user) {
    return (
      <LoginForm
        loginForm={auth.loginForm}
        setLoginForm={auth.setLoginForm}
        authError={auth.authError}
        loadingLogin={loading.login}
        onSubmit={auth.login}
      />
    )
  }

  return (
    <div className="app-height flex" style={{ background: '#0e1621' }}>
      <Sidebar
        user={user}
        users={usersHook.users}
        activeView={activeView}
        selectedUser={messagesHook.selectedUser}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        newWorksCount={worksHook.newWorksCount}
        newEventsCount={eventsHook.newEventsCount}
        totalUnread={messagesHook.totalUnread}
        userSearchQuery={usersHook.userSearchQuery}
        setUserSearchQuery={usersHook.setUserSearchQuery}
        userFilter={usersHook.userFilter}
        setUserFilter={usersHook.setUserFilter}
        filteredUsers={filteredUsers}
        unreadCounts={messagesHook.unreadCounts}
        onSelectView={(view) => {
          setActiveView(view)
          messagesHook.setSelectedUser(null)
          if (view === 'works') worksHook.setNewWorksCount(0)
          if (view === 'events') eventsHook.setNewEventsCount(0)
          // "Сообщения"/"Обеды" сами показывают список для выбора внутри
          // сайдбара (собеседник / сотрудник) — закрывать его сразу нельзя,
          // иначе на мобильном не из чего будет выбирать. Закрываем только
          // при выборе конкретного пользователя (onSelectUser / setSelectedLunchUser).
          if (isMobile && view !== 'messages' && view !== 'lunches') setSidebarOpen(false)
        }}
        onSelectUser={(u) => {
          messagesHook.selectUser(u)
          if (isMobile) setSidebarOpen(false)
        }}
        onLogout={handleLogout}
        onShowAdmin={() => setShowAdmin(true)}
        lunchSearchQuery={lunchesHook.lunchSearchQuery}
        setLunchSearchQuery={lunchesHook.setLunchSearchQuery}
        selectedLunchUser={lunchesHook.selectedLunchUser}
        setSelectedLunchUser={(userId) => {
          lunchesHook.setSelectedLunchUser(userId)
          if (isMobile) setSidebarOpen(false)
        }}
        lunches={lunchesHook.selectedDateLunches}
        clearAllLunches={lunchesHook.clearAllLunches}
      />

      <div
        className={`flex-1 flex-col min-w-0 ${sidebarOpen ? 'hidden md:flex' : 'flex'}`}
        style={{ background: '#0e1621' }}
      >
        <div className="h-14 flex items-center px-4" style={{ borderBottom: '1px solid #2b3945' }}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-3 p-1.5 rounded-lg transition-colors"
              style={{ color: '#7b8fa3' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = '#7b8fa3'}
              title="Развернуть"
            >
              <PanelLeftOpen size={20} />
            </button>
          )}
          <h2 className="font-semibold text-white">
            {activeView === 'works' && 'Работы'}
            {activeView === 'events' && 'События'}
            {activeView === 'lunches' && 'Обеды'}
            {activeView === 'messages' &&
              (messagesHook.selectedUser ? messagesHook.selectedUser.display_name : 'Сообщения')}
          </h2>
          {typing && activeView === 'messages' && (
            <span className="ml-3 text-sm" style={{ color: '#7b8fa3' }}>{typing} печатает...</span>
          )}
          {globalError && <span className="ml-auto text-sm" style={{ color: '#e55c5c' }}>{globalError}</span>}
        </div>

        <div className="flex-1 overflow-hidden">
          {activeView === 'works' && (
            <WorksView
              user={user}
              works={worksHook.works}
              filteredWorks={worksHook.filteredWorks}
              workSearchQuery={worksHook.workSearchQuery}
              setWorkSearchQuery={worksHook.setWorkSearchQuery}
              workFilter={worksHook.workFilter}
              setWorkFilter={worksHook.setWorkFilter}
              newWorkText={worksHook.newWorkText}
              setNewWorkText={worksHook.setNewWorkText}
              workInputRef={worksHook.workInputRef}
              createWork={worksHook.createWork}
              completeWork={worksHook.completeWork}
              toggleImportantWork={worksHook.toggleImportantWork}
              deleteWork={worksHook.deleteWork}
              copyWorkText={worksHook.copyWorkText}
              editWork={worksHook.editWork}
              addWorkComment={worksHook.addWorkComment}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              newComment={newComment}
              setNewComment={setNewComment}
              commentInputVisible={commentInputVisible}
              setCommentInputVisible={setCommentInputVisible}
            />
          )}

          {activeView === 'events' && (
            <EventsView
              user={user}
              filteredEvents={eventsHook.filteredEvents}
              eventSearchQuery={eventsHook.eventSearchQuery}
              setEventSearchQuery={eventsHook.setEventSearchQuery}
              eventFilter={eventsHook.eventFilter}
              setEventFilter={eventsHook.setEventFilter}
              newEventText={eventsHook.newEventText}
              setNewEventText={eventsHook.setNewEventText}
              newEventTime={eventsHook.newEventTime}
              setNewEventTime={eventsHook.setNewEventTime}
              eventInputRef={eventsHook.eventInputRef}
              createEvent={eventsHook.createEvent}
              showEventCalendar={eventsHook.showEventCalendar}
              setShowEventCalendar={eventsHook.setShowEventCalendar}
              changeTimeEventId={eventsHook.changeTimeEventId}
              setChangeTimeEventId={eventsHook.setChangeTimeEventId}
              changeTimeValue={eventsHook.changeTimeValue}
              setChangeTimeValue={eventsHook.setChangeTimeValue}
              changeEventTime={eventsHook.changeEventTime}
              completeEvent={eventsHook.completeEvent}
              toggleImportantEvent={eventsHook.toggleImportantEvent}
              deleteEvent={eventsHook.deleteEvent}
              copyEventText={eventsHook.copyEventText}
              editEvent={eventsHook.editEvent}
              addEventComment={eventsHook.addEventComment}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              newComment={newComment}
              setNewComment={setNewComment}
              commentInputVisible={commentInputVisible}
              setCommentInputVisible={setCommentInputVisible}
            />
          )}

          {activeView === 'lunches' && (
            <LunchesView
              selectedDateLunches={lunchesHook.selectedDateLunches}
              selectedLunchUser={lunchesHook.selectedLunchUser}
              createLunch={lunchesHook.createLunch}
              deleteLunch={lunchesHook.deleteLunch}
            />
          )}

          {activeView === 'messages' && (
            <MessagesView
              user={user}
              ws={ws}
              selectedUser={messagesHook.selectedUser}
              messages={messagesHook.messages}
              filteredMessages={messagesHook.filteredMessages}
              messageSearchQuery={messagesHook.messageSearchQuery}
              setMessageSearchQuery={messagesHook.setMessageSearchQuery}
              newMessage={messagesHook.newMessage}
              setNewMessage={messagesHook.setNewMessage}
              sendMessage={messagesHook.sendMessage}
              sendTyping={messagesHook.sendTyping}
              messagesEndRef={messagesHook.messagesEndRef}
              showEmojiPicker={messagesHook.showEmojiPicker}
              setShowEmojiPicker={messagesHook.setShowEmojiPicker}
            />
          )}
        </div>
      </div>

      {showAdmin && (
        <AdminModal
          user={user}
          users={usersHook.users}
          adminSearchQuery={adminSearchQuery}
          setAdminSearchQuery={setAdminSearchQuery}
          newUsername={newUsername}
          setNewUsername={setNewUsername}
          newDisplayName={newDisplayName}
          setNewDisplayName={setNewDisplayName}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          newIsAdmin={newIsAdmin}
          setNewIsAdmin={setNewIsAdmin}
          adminError={adminError}
          onCreateUser={async () => {
            setAdminError('')
            try {
              await api('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                  username: newUsername,
                  display_name: newDisplayName,
                  password: newPassword,
                  is_admin: newIsAdmin
                })
              })
              setNewUsername('')
              setNewDisplayName('')
              setNewPassword('')
              setNewIsAdmin(false)
              usersHook.fetchUsers()
            } catch (e) {
              setAdminError(e.message)
            }
          }}
          onDeleteUser={async (userId) => {
            if (!confirm('Delete user?')) return
            try {
              await api(`/api/admin/users/${userId}`, { method: 'DELETE' })
              usersHook.fetchUsers()
            } catch (e) {
              setAdminError(e.message)
            }
          }}
          onChangePassword={async (userId, newPasswordValue) => {
            try {
              await api(`/api/admin/users/${userId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ password: newPasswordValue })
              })
            } catch (e) {
              setAdminError(e.message)
            }
          }}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  )
}
