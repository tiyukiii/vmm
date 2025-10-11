
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchReleases, Release } from '../api'
import { FALLBACK_COVER } from '../fallback'
import { useSession, signOut } from '../session'
import { useIsAdmin } from '../hooks/useIsAdmin' // 👈 добавь вверху, рядом с остальными import'ами




export default function App() {
  const navigate = useNavigate()
  const { user } = useSession()
  const isAdmin = useIsAdmin()  
  const [query, setQuery] = React.useState('')
  const [items, setItems] = React.useState<Release[]>([])
  const [loading, setLoading] = React.useState(true)


  React.useEffect(() => {
    (async () => {
      try {
        const rows = await fetchReleases()
        setItems(rows)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = items.filter(r => (r.artist + ' ' + r.title).toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-extrabold">Музыкальные Оценки</div>
          <div className="flex gap-3 items-center">

            {/* Кнопка Админ видна только если пользователь — админ */}
            {isAdmin === true && (
              <button className="btn" onClick={() => navigate('/admin')}>
                Админ
              </button>
            )}
            
            <button className="btn-primary" onClick={() => navigate('/top100')}>
              Топ 100
            </button>
            
            {/* Войти/Выйти */}
            {user?.email ? (
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">{user?.email}</span>
                <button className="btn" onClick={signOut}>Выйти</button>
              </div>
            ) : (
              <button
                className="btn"
                onClick={() => {
                  // для GitHub Pages c HashRouter берём корень приложения
                  const next = encodeURIComponent('/')
                  navigate(`/auth?next=${next}`)
                }}
              >
                Войти
              </button>
            )}

          </div>

        </div>

        <div className="flex gap-3">
          <input
            className="flex-1 px-4 py-2 rounded-2xl bg-white/10 border border-white/10 placeholder-white/40 outline-none"
            placeholder="Поиск по исполнителю или названию"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {loading && <div className="text-white/60">Загрузка…</div>}

        {!loading && filtered.map(item => (
          <div key={item.slug} className="card p-5 flex items-center justify-between hover:bg-white/10 transition">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 border border-white/10">
                <img src={item.cover_url || FALLBACK_COVER} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-xl font-semibold">{item.artist} — {item.title}</div>
                <div className="text-sm text-white/60">{item.type}</div>
              </div>
            </div>
            <button className="btn-primary" onClick={() => navigate(`/track/${item.slug}`)}>Открыть</button>
          </div>
        ))}
      </div>
    </div>
  )
}
