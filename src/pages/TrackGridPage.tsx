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
  winnerSide?: 'left' | 'right'
}

type Round = Match[]

export default function TrackGridPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const isAdmin = useIsAdmin()

  const [loading, setLoading] = React.useState(true)

  // Многораундовая верхняя сетка
  const [upperRounds, setUpperRounds] = React.useState<Round[]>([])

  // Нижняя сетка (пока только проигравшие 1-го раунда)
  const [lowerRound1, setLowerRound1] = React.useState<Match[]>([])
  const [selected, setSelected] = React.useState<Release | null>(null)

  // =================== Построение верхнего брэкета ===================

  function createInitialRound(players: Release[]): Round {
    const matches: Match[] = []
    for (let i = 0; i < players.length; i += 2) {
      matches.push({
        id: i / 2,
        left: players[i],
        right: players[i + 1],
        // если нет соперника — авто-проход
        winnerSide: players[i + 1] ? undefined : 'left',
      })
    }
    return matches
  }

  function buildUpperBracket(players: Release[]): Round[] {
    const rounds: Round[] = []
    const firstRound = createInitialRound(players)
    rounds.push(firstRound)

    let matchCount = firstRound.length
    while (matchCount > 1) {
      const nextCount = Math.ceil(matchCount / 2)
      const round: Round = []
      for (let i = 0; i < nextCount; i++) {
        round.push({ id: i })
      }
      rounds.push(round)
      matchCount = nextCount
    }

    return rounds
  }

  // инициализация: берём топ-32 треков
  React.useEffect(() => {
    ;(async () => {
      try {
        const rows = await fetchReleases()

        // 1) фильтруем треки без учёта регистра
        const onlyTracks = rows.filter(r => {
          const t = (r as any).type
          if (!t) return false
          return String(t).toLowerCase() === 'трек'
        })

        // 2) если после фильтрации пусто — берём всё, чтобы не было пустой сетки
        const source = onlyTracks.length > 0 ? onlyTracks : rows

        // 3) сортируем по admin_total
        const sorted = [...source].sort(
          (a, b) =>
            ((b as any).admin_total ?? 0) - ((a as any).admin_total ?? 0),
        )

        // 4) топ-32
        const top32 = sorted.slice(0, 32)

        const bracket = buildUpperBracket(top32)
        setUpperRounds(bracket)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // =================== Победители/проигравшие 1-го раунда ===================

  const firstRound = upperRounds[0] ?? []

  const upperRound1Losers = React.useMemo(() => {
    const losers: Release[] = []
    firstRound.forEach(m => {
      if (m.winnerSide === 'left' && m.right) losers.push(m.right)
      if (m.winnerSide === 'right' && m.left) losers.push(m.left)
    })
    return losers
  }, [firstRound])

  // Нижняя сетка — проигравшие Раунда 1
  React.useEffect(() => {
    const matches: Match[] = []
    for (let i = 0; i < upperRound1Losers.length; i += 2) {
      matches.push({
        id: i / 2,
        left: upperRound1Losers[i],
        right: upperRound1Losers[i + 1],
        winnerSide: upperRound1Losers[i + 1] ? undefined : 'left',
      })
    }
    setLowerRound1(matches)
  }, [upperRound1Losers])

  const lowerWinners = React.useMemo(() => {
    const winners: Release[] = []
    lowerRound1.forEach(m => {
      if (m.winnerSide === 'left' && m.left) winners.push(m.left)
      if (m.winnerSide === 'right' && m.right) winners.push(m.right)
    })
    return winners
  }, [lowerRound1])

  // =================== Логика кликов в верхней сетке ===================

  function handlePickUpper(
    roundIndex: number,
    matchIndex: number,
    side: 'left' | 'right',
    rel?: Release,
  ) {
    if (!isAdmin || !rel) return

    setUpperRounds(prev => {
      const copy = prev.map(round => round.map(m => ({ ...m })))
      const round = copy[roundIndex]
      if (!round) return prev

      const match = round[matchIndex]
      if (!match) return prev

      match.winnerSide = side

      const winner =
        side === 'left' ? match.left : match.right
      const loser =
        side === 'left' ? match.right : match.left

      // продвигаем победителя в следующий раунд
      const nextRoundIndex = roundIndex + 1
      if (winner && nextRoundIndex < copy.length) {
        const nextRound = copy[nextRoundIndex]
        const targetMatchIndex = Math.floor(matchIndex / 2)
        const targetMatch = nextRound[targetMatchIndex]
        if (targetMatch) {
          const targetSide: 'left' | 'right' =
            matchIndex % 2 === 0 ? 'left' : 'right'
          if (targetSide === 'left') {
            targetMatch.left = winner
          } else {
            targetMatch.right = winner
          }
        }
      }

      // (позже сюда можно будет подвесить отправку loser'а в нужный раунд нижней сетки)

      return copy
    })

    setSelected(rel)
  }

  // =================== Логика кликов в нижней сетке ===================

  function handlePickLower(
    matchIndex: number,
    side: 'left' | 'right',
    rel?: Release,
  ) {
    if (!isAdmin || !rel) return
    setLowerRound1(prev =>
      prev.map((m, idx) =>
        idx === matchIndex ? { ...m, winnerSide: side } : m,
      ),
    )
    setSelected(rel)
  }

  // =================== Рендер карточки матча ===================

  function renderMatchCard(
    match: Match,
    roundIndex: number,
    matchIndex: number,
    isUpper: boolean,
    onPick: (
      roundIndex: number,
      matchIndex: number,
      side: 'left' | 'right',
      rel?: Release,
    ) => void,
  ) {
    const makeCard = (rel: Release | undefined, side: 'left' | 'right') => {
      if (!rel) {
        return (
          <div className="card px-3 py-2 bg-white/5 border border-white/5 rounded-xl opacity-30 text-xs text-white/40">
            Ожидается участник
          </div>
        )
      }

      const isWinner = match.winnerSide === side
      const clickable = isAdmin

      return (
        <div
          onClick={() => clickable && onPick(roundIndex, matchIndex, side, rel)}
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
            <div className="text-xs font-semibold truncate">
              {rel.artist}
            </div>
            <div className="text-[11px] text-white/70 truncate">
              {rel.title}
            </div>
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

  function getUpperRoundTitle(index: number, total: number): string {
    if (index === total - 1) return 'Финал верхней'
    return `Раунд ${index + 1}`
  }

  // =================== Рендер ===================

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Шапка */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-extrabold">Музыкальные Оценки</div>
          <div className="flex gap-3 items-center">
            <button
              className="btn-primary"
              onClick={() => navigate('/top100')}
            >
              Топ 100
            </button>
            {user?.email && (
              <span className="text-white/60 text-sm">
                {user.email}
              </span>
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

        {/* Описание */}
        <div className="card bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2">
          <div className="text-xl font-semibold">
            Трек года — турнирная сетка
          </div>
          <div className="text-sm text-white/70">
            В сетку попадает топ-32 треков (по admin_total). Победители
            продвигаются по раундам верхней сетки, пока не останется один
            финалист. Проигравшие первого раунда попадают в нижнюю сетку.
          </div>
          {!isAdmin && (
            <div className="text-xs text-white/50">
              Ты не админ — клик по трекам отключён, но треки можно оценивать
              на их страницах.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6 items-start">
          {/* Левая часть: полная верхняя + нижняя */}
          <div className="space-y-8">
            {/* ВЕРХНЯЯ СЕТКА */}
            <div className="space-y-3">
              <div className="text-sm text-white/60 font-semibold">
                Верхняя сетка
              </div>

              {loading && (
                <div className="text-white/60">Загрузка треков…</div>
              )}

              {!loading && upperRounds.length > 0 && (
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-6 min-w-max">
                    {upperRounds.map((round, roundIndex) => (
                      <div
                        key={roundIndex}
                        className="flex flex-col items-stretch gap-3"
                      >
                        <div className="text-xs text-white/60 px-2">
                          {getUpperRoundTitle(
                            roundIndex,
                            upperRounds.length,
                          )}
                        </div>

                        <div className="flex flex-col gap-3">
                          {round.map((match, matchIndex) =>
                            renderMatchCard(
                              match,
                              roundIndex,
                              matchIndex,
                              true,
                              handlePickUpper,
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* НИЖНЯЯ СЕТКА (пока только Раунд 1 + победители) */}
            {!loading && (
              <div className="space-y-3">
                <div className="text-sm text-white/60 font-semibold flex items-center gap-3">
                  <span>Нижняя сетка</span>
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
                    Проигравшие Раунда 1
                  </span>
                </div>

                {lowerRound1.length === 0 && (
                  <div className="text-sm text-white/40">
                    Нижняя сетка заполнится, когда в первом раунде верхней
                    сетки будут выбраны победители.
                  </div>
                )}

                {lowerRound1.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
                    <div className="space-y-3">
                      {lowerRound1.map((match, idx) =>
                        renderMatchCard(
                          match,
                          0,
                          idx,
                          false,
                          (rIdx, mIdx, side, rel) =>
                            handlePickLower(mIdx, side, rel),
                        ),
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm text-white/60 mb-1">
                        Раунд 2 (нижняя)
                      </div>
                      {lowerWinners.length === 0 && (
                        <div className="text-sm text-white/40">
                          В нижней сетке ещё нет победителей. Кликни по
                          трекам (как админ), чтобы продвинуть их дальше.
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
                            <div className="text-xs font-semibold truncate">
                              {rel.artist}
                            </div>
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

          {/* Правая панель: инфо о треке */}
          <div className="card bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="text-sm font-semibold">
              Информация о треке
            </div>

            {!selected && (
              <div className="text-sm text-white/60">
                Наведи или кликни по треку в верхней или нижней сетке, чтобы
                увидеть подробности.
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
                    <div className="text-sm font-semibold truncate">
                      {selected.artist}
                    </div>
                    <div className="text-xs text-white/70 truncate">
                      {selected.title}
                    </div>
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
                    Ты админ: кликом по карточке в верхней или нижней сетке
                    продвигаешь трек в следующий раунд.
                  </div>
                ) : (
                  <div className="text-[11px] text-white/40">
                    Выбор победителей доступен только администраторам, но ты
                    можешь оценивать трек на его странице.
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
