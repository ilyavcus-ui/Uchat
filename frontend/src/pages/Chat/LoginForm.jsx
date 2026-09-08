export default function LoginForm({ loginForm, setLoginForm, authError, loadingLogin, onSubmit }) {
  return (
    <div className="app-min-height flex items-center justify-center px-4" style={{ background: '#0e1621' }}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit() }}
        className="p-8 rounded-xl shadow-lg w-full max-w-sm"
        style={{ background: '#17212b' }}
      >
        <h1 className="text-2xl font-bold mb-6 text-center text-white">Uchat</h1>
        {authError && <p className="text-red-500 text-sm mb-4">{authError}</p>}
        <input
          type="text"
          placeholder="Логин"
          value={loginForm.username}
          onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
          className="w-full px-4 py-3 rounded-lg mb-3 text-sm text-white placeholder-[#5e6e80]"
          style={{ background: '#242f3d', border: 'none' }}
          autoFocus
        />
        <input
          type="password"
          placeholder="Пароль"
          value={loginForm.password}
          onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
          className="w-full px-4 py-3 rounded-lg mb-4 text-sm text-white placeholder-[#5e6e80]"
          style={{ background: '#242f3d', border: 'none' }}
        />
        <button
          type="submit"
          disabled={loadingLogin}
          className="w-full py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          style={{ background: '#3390ec' }}
        >
          {loadingLogin ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
