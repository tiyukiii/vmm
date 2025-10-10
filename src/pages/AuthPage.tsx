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
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Регистрация
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      
        // Если сессия не вернулась, пробуем логиниться сразу
        if (!data.session) {
          const { error: err2 } = await supabase.auth.signInWithPassword({ email, password });
          if (err2) throw err2;
        }
      }
    
      // --- НОВАЯ ЧАСТЬ ---
      // Проверяем, есть ли у пользователя никнейм в таблице profiles
      const { data: user } = await supabase.auth.getUser();
      const id = user?.user?.id;
    
      if (id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', id)
          .maybeSingle();
      
        if (!prof?.username) {
          // Если у пользователя ещё нет ника → ведём на onboarding
          navigate('/onboarding');
        } else {
          // Если ник уже есть → на главную или страницу next
          navigate(next);
        }
      } else {
        navigate(next);
      }
      // --- КОНЕЦ НОВОЙ ЧАСТИ ---
    } catch (e: any) {
      setErr(e.message || 'Ошибка');
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
