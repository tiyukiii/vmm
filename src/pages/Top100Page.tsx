
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchReleases, Release } from '../api'
import { FALLBACK_COVER } from '../fallback'

export default function Top100Page() {
  const navigate = useNavigate()
  const [tab, setTab] = React.useState<'Трек' | 'Альбом'>('Трек')
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

  const filtered = items
    .filter(r => r.type === tab)
    .sort((a,b) => (b.admin_total ?? 0) - (a.admin_total ?? 0))
    .slice(0, 100)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="text-white/60 hover:text-white">← Назад</button>
          <h1 className="text-2xl font-bold">Топ 100</h1>
          <div />
        </div>

        <div className="flex gap-2 mb-6">
          {(['Трек','Альбом'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-2xl border ${tab===t ? 'bg-white/15 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>{t}</button>
          ))}
        </div>

        {loading && <div className="text-white/60">Загрузка…</div>}
        {!loading && filtered.length === 0 && (<div className="text-white/60">Нет записей этой категории.</div>)}

        {!loading && filtered.map((r, idx) => (
          <div key={r.slug} className="card p-4 mb-3 flex items-center justify-between hover:bg-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 text-white/50 tabular-nums">{idx + 1}</div>
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 border border-white/10">
                <img src={r.cover_url || FALLBACK_COVER} alt={r.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-semibold">{r.artist} — {r.title}</div>
                <div className="text-xs text-white/60">{r.type}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/10">
                    <span className="text-white/60 mr-1">Офиц.:</span>
                    {(r.admin_total ?? 0).toFixed(1)} / 88
                  </span>
                        
                  <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/10">
                    <span className="text-white/60 mr-1">Польз.:</span>
                    {(r.score ?? 0).toFixed(1)} / 88
                  </span>
                        
                  <div className="text-xs text-white/60">
                    Голосов: {r.votes ?? 0}
                  </div>
                </div>

              </div>
              <button
                onClick={() => navigate(`/track/${r.slug}`)}
                className="btn-primary text-sm"
              >
                Открыть
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
