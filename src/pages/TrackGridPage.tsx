import React from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchReleases, Release } from '../api'
import { FALLBACK_COVER } from '../fallback'
import { useSession } from '../session'
import { useIsAdmin } from '../hooks/useIsAdmin'

type Match = {
  id: number
  left?: Release
  right?: Release
  winner?: 'left' | 'right'
}

export default function TrackGridPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const isAdmin = useIsAdmin()

  const [loading, setLoading] = React.useState(true)
  const [round1, setRound1] = React.useState<Match[]>([])
  const [selected, setSelected] = React.useState<Release | null>(null)

  // Загружаем все релизы и формируем пары
  React.useEffect(() => {
    ;(async () => {
      try {
        const rows = await fetchReleases()

        const matches: Match[] = []
        for (let i = 0; i < rows.length; i += 2) {
          matches.push({
            id: i / 2,
            left: rows[i],
            right: rows[i + 1],
          })
        }

        setRound1(matches)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handlePickWinner = (matchIndex: number, side: 'left' | 'right', rel?: Release) => {
    if (!isAdmin || !rel) return

    setRound1(prev =>
      prev.map((m, idx) =>
        idx === matchIndex
          ? {
              ...m,
              winner: side,
            }
          : m,
      ),
    )
    setSelected(rel)
  }

  const renderMatchCard = (match: Match, index: number) => {
    const makeCard = (rel: Release | undefined, side: 'left' | 'right') => {
      if (!rel) {
        return (
          <div className="card p-4 bg-white/5 border border-white/5 rounded-xl opacity-40">
            <div className="text-sm text-white/40">Пустой слот</div>
          </div>
        )
      }

      const isWinner = match.winner === side
      const clickable = isAdmin && !!rel

      return (
        <div
          onClick={() => clickable && handlePickWinner(index, side, rel)}
          onMouseEnter={() => setSelected(rel)}
          className={[
            'card p-4 flex items-center gap-4 transition',
            clickable ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
            isWinner ? 'ring-2 ring-emerald-400 bg-white/10' : 'bg-white/5 border border-white/5',
          ].join(' ')}
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0">
            <img
              src={rel.cover_url || FALLBACK_COVER}
              alt={rel.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{rel.artist}</div>
            <div className="text-xs text-white/70 truncate">{rel.title}</div>
          </div>
          {clickable && (
            <div className="text-[10px] text-white/40 uppercase tracking-wide">
              клик — продвинуть
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={match.id} className="space-y-2">
        {makeCard(match.left, 'left')}
        {makeCard(match.right, 'right')}
      </div>
    )
  }

  const winners = React.useMemo(() => {
    const list: Release[] = []
    round1.forEach(m => {
      if (m.winner === 'left' && m.left) list.push(m.left)
      if (m.winner === 'right' && m.right) list.push(m.right)
    })
    return list
  }, [round1])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Шапка */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-extrabold">Музыкальные Оценки</div>
          <div className="flex gap-3 items-center">
            <button className="btn-primary" onClick={() => navigate('/top100')}>
              Топ 100
            </button>
            {user?.email && (
              <span className="text-white/60 text-sm">{user.email}</span>
            )}
          </div>
        </div>

        {/* Назад к премии */}
        <button
          className="text-sm text-emerald-300 flex items-center gap-1"
          onClick={() => navigate('/award2025')}
        >
          ← Вернуться к премии 2025
        </button>

        {/* Заголовок */}
        <div className="card bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2">
          <div className="text-xl font-semibold">Трек года — турнирная сетка</div>
          <div className="text-sm text-white/70">
            Все треки, добавленные на сайт в 2025 году. Админы кликают по трекам, чтобы
            продвигать их дальше по сетке. Обычные пользователи могут только смотреть.
          </div>
          {!isAdmin && (
            <div className="text-xs text-white/50">
              Ты не админ — клик по трекам отключён, но треки можно оценивать на их страницах.
            </div>
          )}
        </div>

        {/* Сетка + панель справа */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6 items-start">
          {/* Левая часть — сетка */}
          <div className="space-y-4">
            <div className="text-sm text-white/60 flex items-center gap-3">
              <span className="font-semibold text-white">Верхняя сетка</span>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                Раунд 1
              </span>
            </div>

            {loading && <div className="text-white/60">Загрузка треков…</div>}

            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                {/* Раунд 1 */}
                <div className="space-y-4">
                  {round1.map((match, index) => renderMatchCard(match, index))}
                </div>

                {/* Победители (условный Раунд 2) */}
                <div className="space-y-4">
                  <div className="text-sm text-white/60 mb-1">Победители пар</div>
                  {winners.length === 0 && (
                    <div className="text-sm text-white/40">
                      Пока никто не продвинут. Кликни по трекам (как админ), чтобы выбрать
                      победителей.
                    </div>
                  )}
                  {winners.map((rel, idx) => (
                    <div
                      key={rel.id ?? idx}
                      onMouseEnter={() => setSelected(rel)}
                      className="card p-4 flex items-center gap-4 bg-white/10 border border-emerald-400/70 rounded-xl"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 shrink-0">
                        <img
                          src={rel.cover_url || FALLBACK_COVER}
                          alt={rel.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{rel.artist}</div>
                        <div className="text-xs text-white/70 truncate">{rel.title}</div>
                      </div>
                      <div className="text-[10px] text-emerald-300 uppercase tracking-wide">
                        продвинут
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Правая панель — инфа о треке */}
          <div className="card bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="text-sm font-semibold">Информация о треке</div>

            {!selected && (
              <div className="text-sm text-white/60">
                Наведи или кликни по треку в сетке, чтобы увидеть подробности.
              </div>
            )}

            {selected && (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 shrink-0">
                    <img
                      src={selected.cover_url || FALLBACK_COVER}
                      alt={selected.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{selected.artist}</div>
                    <div className="text-xs text-white/70 truncate">{selected.title}</div>
                  </div>
                </div>

                <button
                  className="btn-primary w-full"
                  onClick={() => navigate(`/track/${selected.slug}`)}
                >
                  Открыть на сайте
                </button>

                {isAdmin ? (
                  <div className="text-[11px] text-emerald-300/80">
                    Ты админ: кликом по карточке в сетке продвигаешь трек в следующий раунд.
                  </div>
                ) : (
                  <div className="text-[11px] text-white/40">
                    Выбор победителей доступен только администраторам, но ты можешь оценивать трек
                    на его странице.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
