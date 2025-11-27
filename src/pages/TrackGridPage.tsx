// src/pages/TrackGridPage.tsx

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

  // Верхняя и нижняя сетки (первый раунд)
  const [upperRound1, setUpperRound1] = React.useState<Match[]>([])
  const [lowerRound1, setLowerRound1] = React.useState<Match[]>([])

  const [selected, setSelected] = React.useState<Release | null>(null)

  // ========= Инициализация верхней сетки (ТОП-32 ТРЕКОВ по admin_total) =========
  React.useEffect(() => {
    ;(async () => {
      try {
        const rows = await fetchReleases()

        // Берём только треки (чтобы не залетали альбомы и др. типы)
        const onlyTracks = rows.filter(r => r.type === 'трек')

        // Сортируем по admin_total по убыванию — как на топ-100
        const sorted = [...onlyTracks].sort(
          (a, b) =>
            ((b as any).admin_total ?? 0) - ((a as any).admin_total ?? 0),
        )

        // Берём только топ-32 трека
        const top32 = sorted.slice(0, 32)

        const matches: Match[] = []
        for (let i = 0; i < top32.length; i += 2) {
          const left = top32[i]
          const right = top32[i + 1]

          matches.push({
            id: i / 2,
            left,
            right,
            // если нет соперника справа — авто-проход
            winner: right ? undefined : 'left',
          })
        }

        setUpperRound1(matches)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ========= Победители / проигравшие верхнего раунда =========

  const upperWinners = React.useMemo(() => {
    const list: Release[] = []
    upperRound1.forEach(m => {
      if (m.winner === 'left' && m.left) list.push(m.left)
      if (m.winner === 'right' && m.right) list.push(m.right)
    })
    return list
  }, [upperRound1])

  const upperLosers = React.useMemo(() => {
    const list: Release[] = []
    upperRound1.forEach(m => {
      if (m.winner === 'left' && m.right) list.push(m.right)
      if (m.winner === 'right' && m.left) list.push(m.left)
    })
    return list
  }, [upperRound1])

  // ========= Формирование нижней сетки из проигравших =========

  React.useEffect(() => {
    const matches: Match[] = []
    for (let i = 0; i < upperLosers.length; i += 2) {
      const left = upperLosers[i]
      const right = upperLosers[i + 1]

      matches.push({
        id: i / 2,
        left,
        right,
        // если нет соперника — авто-проход
        winner: right ? undefined : 'left',
      })
    }
    setLowerRound1(matches)
  }, [upperLosers])

  const lowerWinners = React.useMemo(() => {
    const list: Release[] = []
    lowerRound1.forEach(m => {
      if (m.winner === 'left' && m.left) list.push(m.left)
      if (m.winner === 'right' && m.right) list.push(m.right)
    })
    return list
  }, [lowerRound1])

  // ========= Обработчики кликов (верх / низ) =========

  const handlePickUpper = (matchIndex: number, side: 'left' | 'right', rel?: Release) => {
    if (!isAdmin || !rel) return
    setUpperRound1(prev =>
      prev.map((m, idx) =>
        idx === matchIndex
          ? { ...m, winner: side }
          : m,
      ),
    )
    setSelected(rel)
  }

  const handlePickLower = (matchIndex: number, side: 'left' | 'right', rel?: Release) => {
    if (!isAdmin || !rel) return
    setLowerRound1(prev =>
      prev.map((m, idx) =>
        idx === matchIndex
          ? { ...m, winner: side }
          : m,
      ),
    )
    setSelected(rel)
  }

  // ========= Рендер карточек матча (общий) =========

  const renderMatchCard = (
    match: Match,
    index: number,
    handlePick: (matchIndex: number, side: 'left' | 'right', rel?: Release) => void,
    isUpper: boolean,
  ) => {
    const makeCard = (rel: Release | undefined, side: 'left' | 'right') => {
      if (!rel) {
        return (
          <div className="card px-3 py-2 bg-white/5 border border-white/5 rounded-xl opacity-40 text-xs text-white/40">
            Нет соперника
          </div>
        )
      }

      const isWinner = match.winner === side
      const clickable = isAdmin && !!rel

      return (
        <div
          onClick={() => clickable && handlePick(index, side, rel)}
          onMouseEnter={() => setSelected(rel)}
          className={[
            'card px-3 py-2 flex items-center gap-3 rounded-xl text-sm transition',
            clickable ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
            isWinner
              ? isUpper
                ? 'ring-2 ring-emerald-400 bg-white/10'
                : 'ring-2 ring-sky-400 bg-white/10'
              : 'bg-white/5 border border-white/5',
          ].join(' ')}
        >
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
            <img
              src={rel.cover_url || FALLBACK_COVER}
              alt={rel.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{rel.artist}</div>
            <div className="text-[11px] text-white/70 truncate">{rel.title}</div>
          </div>
          {clickable && (
            <div className="text-[9px] text-white/40 uppercase tracking-wide">
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

  // ========= Рендер страницы =========

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
            {user?.email && <span className="text-white/60 text-sm">{user.email}</span>}
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
            В сетку попадает топ-32 треков (по admin_total) из всех релизов 2025 года. Админы
            кликают по трекам, чтобы продвигать их дальше по сетке. Обычные пользователи могут
            только смотреть.
          </div>
          {!isAdmin && (
            <div className="text-xs text-white/50">
              Ты не админ — клик по трекам отключён, но треки можно оценивать на их страницах.
            </div>
          )}
        </div>

        {/* Верхняя + нижняя сетки + инфо */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6 items-start">
          {/* Левая часть */}
          <div className="space-y-6">
            {/* ВЕРХНЯЯ СЕТКА */}
            <div className="space-y-3">
              <div className="text-sm text-white/60 flex items-center gap-3">
                <span className="font-semibold text-white">Верхняя сетка</span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  Раунд 1
                </span>
              </div>

              {loading && <div className="text-white/60">Загрузка треков…</div>}

              {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
                  {/* Раунд 1 */}
                  <div className="space-y-3">
                    {upperRound1.map((match, index) =>
                      renderMatchCard(match, index, handlePickUpper, true),
                    )}
                  </div>

                  {/* Раунд 2 — победители пар */}
                  <div className="space-y-3">
                    <div className="text-sm text-white/60 mb-1">Раунд 2</div>
                    {upperWinners.length === 0 && (
                      <div className="text-sm text-white/40">
                        Пока никто не продвинут. Кликни по трекам (как админ), чтобы выбрать
                        победителей.
                      </div>
                    )}
                    {upperWinners.map((rel, idx) => (
                      <div
                        key={rel.id ?? idx}
                        onMouseEnter={() => setSelected(rel)}
                        className="card px-3 py-2 flex items-center gap-3 bg-white/10 border border-emerald-400/70 rounded-xl text-sm"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                          <img
                            src={rel.cover_url || FALLBACK_COVER}
                            alt={rel.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{rel.artist}</div>
                          <div className="text-[11px] text-white/70 truncate">{rel.title}</div>
                        </div>
                        <div className="text-[9px] text-emerald-300 uppercase tracking-wide">
                          продвинут
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* НИЖНЯЯ СЕТКА */}
            {!loading && (
              <div className="space-y-3">
                <div className="text-sm text-white/60 flex items-center gap-3">
                  <span className="font-semibold text-white">Нижняя сетка</span>
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                    Проигравшие Раунда 1
                  </span>
                </div>

                {lowerRound1.length === 0 && (
                  <div className="text-sm text-white/40">
                    Нижняя сетка заполнится, когда в верхней сетке будут выбраны победители.
                  </div>
                )}

                {lowerRound1.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
                    {/* Раунд 1 нижней сетки */}
                    <div className="space-y-3">
                      {lowerRound1.map((match, index) =>
                        renderMatchCard(match, index, handlePickLower, false),
                      )}
                    </div>

                    {/* Раунд 2 нижней сетки — победители */}
                    <div className="space-y-3">
                      <div className="text-sm text-white/60 mb-1">Раунд 2 (нижняя)</div>
                      {lowerWinners.length === 0 && (
                        <div className="text-sm text-white/40">
                          В нижней сетке ещё нет победителей. Кликни по трекам (как админ), чтобы
                          продвинуть их дальше.
                        </div>
                      )}
                      {lowerWinners.map((rel, idx) => (
                        <div
                          key={rel.id ?? idx}
                          onMouseEnter={() => setSelected(rel)}
                          className="card px-3 py-2 flex items-center gap-3 bg-white/10 border border-sky-400/70 rounded-xl text-sm"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 shrink-0">
                            <img
                              src={rel.cover_url || FALLBACK_COVER}
                              alt={rel.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{rel.artist}</div>
                            <div className="text-[11px] text-white/70 truncate">
                              {rel.title}
                            </div>
                          </div>
                          <div className="text-[9px] text-sky-300 uppercase tracking-wide">
                            нижняя сетка
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Правая панель — инфа о треке */}
          <div className="card bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="text-sm font-semibold">Информация о треке</div>

            {!selected && (
              <div className="text-sm text-white/60">
                Наведи или кликни по треку в верхней или нижней сетке, чтобы увидеть подробности.
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
                    Ты админ: кликом по карточке в верхней или нижней сетке продвигаешь трек в
                    следующий раунд.
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
