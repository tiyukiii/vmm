import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

export default function AuthPage() {
  const [search] = useSearchParams()
  const next = search.get('next') || '/'
  const navigate = useNavigate()

  const [mode, setMode] = React.useState<'signin'|'signup'>('signin')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      let error: any = null;
    
      if (mode === 'signin') {
        const { error: err1 } = await supabase.auth.signInWithPassword({ email, password });
        error = err1;
      } else {
        const { error: err2 } = await supabase.auth.signUp({ email, password });
        error = err2;
      }
    
      if (error) throw error;
    
      // читаем next: / по умолчанию
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/';
    
      navigate(next);
    } catch (e: any) {
      console.error('Auth error:', e);
      alert(e?.message || 'Ошибка авторизации'); // теперь покажет, что не так
      setErr(e?.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };




  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-slate-800 p-6 rounded-2xl space-y-4">
        <h1 className="text-2xl font-semibold">{mode === 'signin' ? 'Вход' : 'Регистрация'}</h1>

        <label className="block">
          <div className="mb-1 text-sm">Email</div>
          <input
            className="w-full rounded-xl bg-slate-700 p-3 outline-none"
            type="email" value={email} onChange={e=>setEmail(e.target.value)} required
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm">Пароль</div>
          <input
            className="w-full rounded-xl bg-slate-700 p-3 outline-none"
            type="password" value={password} onChange={e=>setPassword(e.target.value)} required
          />
        </label>

        {err && <div className="text-red-400 text-sm">{err}</div>}

        <button
          className="btn btn-primary w-full disabled:opacity-50"
          disabled={loading}
        >
          {loading ? '...' : (mode === 'signin' ? 'Войти' : 'Зарегистрироваться')}
        </button>

        <div className="text-sm text-slate-300">
          {mode === 'signin' ? (
            <>Нет аккаунта?{' '}
              <button type="button" className="text-white underline" onClick={()=>setMode('signup')}>
                Зарегистрируйтесь
              </button>
            </>
          ) : (
            <>Уже есть аккаунт?{' '}
              <button type="button" className="text-white underline" onClick={()=>setMode('signin')}>
                Войдите
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
