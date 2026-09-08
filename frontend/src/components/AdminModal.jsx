import { useState } from 'react'
import { X, Search, Key } from 'lucide-react'

export default function AdminModal({
  user, users, adminSearchQuery, setAdminSearchQuery, newUsername, setNewUsername,
  newDisplayName, setNewDisplayName, newPassword, setNewPassword, newIsAdmin, setNewIsAdmin,
  adminError, onCreateUser, onDeleteUser, onChangePassword, onClose
}) {
  const [changingPasswordId, setChangingPasswordId] = useState(null)
  const [newPassValue, setNewPassValue] = useState('')
  const filteredUsers = users.filter(u => !adminSearchQuery || u.display_name.toLowerCase().includes(adminSearchQuery.toLowerCase()) || u.username.toLowerCase().includes(adminSearchQuery.toLowerCase()))

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#17212b] rounded-2xl w-full max-w-md mx-4 border border-[#2b3945]">
        <div className="flex items-center justify-between p-4 border-b-2 border-[#2b3945]">
          <h2 className="text-lg font-semibold text-white">Управление пользователями</h2>
          <button onClick={onClose} className="text-[#7b8fa3] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-[#7b8fa3] mb-3">Добавить пользователя</p>
          <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Логин" className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-2 text-sm mb-2 focus:outline-none placeholder-[#5e6e80]" />
          <input type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="Отображаемое имя" className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-2 text-sm mb-2 focus:outline-none placeholder-[#5e6e80]" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Пароль" className="w-full bg-[#242f3d] text-white rounded-lg px-4 py-2 text-sm mb-2 focus:outline-none placeholder-[#5e6e80]" />
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" checked={newIsAdmin} onChange={(e) => setNewIsAdmin(e.target.checked)}
              className="w-4 h-4 rounded bg-[#242f3d] border-[#1e2c3a] text-blue-600" />
            <span className="text-sm text-[#a8b9cc]">Администратор</span>
          </label>
          {adminError && <p className="text-red-400 text-sm mb-2">{adminError}</p>}
          <button onClick={onCreateUser} disabled={!newUsername || !newDisplayName || !newPassword}
            className="w-full bg-[#3390ec] hover:bg-[#2b7fd4] py-2 rounded-lg text-sm text-white disabled:opacity-50">
            Добавить
          </button>
        </div>

        <div className="p-4 border-t-2 border-[#2b3945] max-h-64 overflow-y-auto">
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8fa3]" />
            <input type="text" value={adminSearchQuery} onChange={(e) => setAdminSearchQuery(e.target.value)}
              placeholder="Найти пользователя..." className="w-full bg-[#242f3d] text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none placeholder-[#5e6e80]" />
          </div>
          <p className="text-sm text-[#7b8fa3] mb-2">Пользователи ({filteredUsers.length})</p>
          <div className="space-y-2">
            {filteredUsers.map(u => (
              <div key={u.id} className="bg-[#242f3d]/50 rounded-lg">
                <div className="flex items-center justify-between py-2 px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium" style={{ background: '#2a6eb5', color: '#fff' }}>{u.display_name[0]}</div>
                    <div>
                      <p className="text-sm text-white">{u.display_name}</p>
                      <p className="text-xs text-[#7b8fa3]">@{u.username}</p>
                    </div>
                    {u.is_admin ? <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Админ</span> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setChangingPasswordId(changingPasswordId === u.id ? null : u.id); setNewPassValue('') }}
                      className="p-1 text-[#7b8fa3] hover:text-[#3390ec] transition-colors" title="Сменить пароль">
                      <Key className="w-4 h-4" />
                    </button>
                    {u.username !== 'admin' ? (
                      <button onClick={() => onDeleteUser(u.id)} className="p-1 text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                {changingPasswordId === u.id && (
                  <div className="px-3 pb-3 flex gap-2">
                    <input type="password" value={newPassValue} onChange={(e) => setNewPassValue(e.target.value)}
                      placeholder="Новый пароль" className="flex-1 bg-[#1e2c3a] text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none placeholder-[#5e6e80]"
                      onKeyDown={(e) => { if (e.key === 'Enter' && newPassValue.trim()) { onChangePassword(u.id, newPassValue); setChangingPasswordId(null); setNewPassValue('') } }} autoFocus />
                    <button onClick={() => { if (newPassValue.trim()) { onChangePassword(u.id, newPassValue); setChangingPasswordId(null); setNewPassValue('') } }}
                      className="px-3 py-1.5 bg-[#3390ec] hover:bg-[#2b7fd4] rounded-lg text-xs text-white">OK</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
