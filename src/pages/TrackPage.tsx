
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchReleaseBySlug, Release } from '../api'
import { FALLBACK_COVER } from '../fallback'

export default function TrackPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = React.useState<Release | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    (async () => {
      try {
        if (!slug) return
        const r = await fetchReleaseBySlug(slug)
        setItem(r)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white">← Назад</button>
          <div className="flex items-center gap-3">
            {item?.type && (<span className="px-3 py-1 rounded-xl text-sm bg-white/10 border border-white/10">{item.type}</span>)}
            {slug && <button onClick={() => navigate(`/review/${slug}`)} className="btn-primary">Поставить рецензию</button>}
            <button onClick={() => navigate('/')} className="btn">← На главную</button>
          </div>
        </div>

        {loading && <div className="text-white/60">Загрузка…</div>}
        {!loading && item && (
          <>
            <h1 className="text-3xl font-extrabold mb-6">{item.artist} — {item.title}</h1>
            
            <div className="grid md:grid-cols-[200px_1fr] gap-6 items-start mb-8">
              <div className="w-[200px] h-[200px] rounded-2xl overflow-hidden bg-white/10 border border-white/10">
                <img src={item.cover_url || FALLBACK_COVER} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
                  Офиц. оценка: {item.admin_total ?? '—'}
                </div>

                <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
                  Пользователи: {item.score != null ? item.score.toFixed(1) : '—'} / 88
                </div>

                <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10">
                  Голосов: {item.votes ?? 0}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="grid md:grid-cols-2 gap-8 text-sm">
                <div>
                  <div className="text-white/60 mb-1">Исполнитель</div>
                  <div className="font-medium">{item.artist}</div>
                </div>
                <div>
                  <div className="text-white/60 mb-1">Продюсеры</div>
                  <div className="font-medium">—</div>
                </div>
                <div>
                  <div className="text-white/60 mb-1">Авторы</div>
                  <div className="font-medium">—</div>
                </div>
                <div>
                  <div className="text-white/60 mb-1">Дата выхода</div>
                  <div className="font-medium">{new Date(item.created_at || Date.now()).toLocaleDateString('ru-RU')}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
