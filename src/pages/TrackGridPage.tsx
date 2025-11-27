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

function getWinner(match?: Match): Release | undefined {
  if (!match || !match.winnerSide) return undefined
  return match.winnerSide === 'left' ? match.left : match.right
}

function getLoser(match?: Match): Release | undefined {
  if (!match || !match.winnerSide || !match.left || !match.right) return undefined
  return match.winnerSide === 'left' ? match.right : match.left
}

export default function TrackGridPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const isAdmin = useIsAdmin()

  const [loading, setLoading] = React.useState(true)

  // Многораундовая верхняя и нижняя сетки
  const [upperRounds, setUpperRounds] = React.useState<Round[]>([])
  const [lowerRounds, setLowerRounds] = React.useState<Round[]>([])

  // Гранд-финал: победитель верхней vs победитель нижней
  const [grandFinal, setGrandFinal] = React.useState<Match | null>(null)

  const [selected, setSelected] = React.useState<Release | null>(null)

  // =================== Построение верхнего брэкета ===================

  function createInitialRound(players: Release[]): Round {
    const matches: Match[] = []
    for (let i = 0; i < players.length; i += 2) {
      matches.push({
        id: i / 2,
        left: players[i],
        right: players[i + 1],
        winnerSide: players[i + 1] ? undefined : 'left', // авто-проход, если нет соперника
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

        // 5) создаём пустые раунды нижней сетки (по количеству раундов верхней)
        const lower: Round[] = []
        for (let i = 0; i < bracket.length; i++) {
          lower.push([])
        }
        setLowerRounds(lower)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // =================== Помощник: отправить игрока в нужный раунд нижней ===================

  const placeInLower = React.useCallback((roundIndex: number, player: Release) => {
    setLowerRounds(prev => {
      const rounds = prev.map(round => round.map(m => ({ ...m })))

      if (!rounds[roundIndex]) {
        rounds[roundIndex] = []
      }

      const round = rounds[roundIndex]

      // ищем матч, где есть свободное место
      let match = round.find(m => !m.left || !m.right)
      if (!match) {
        match = { id: round.length }
        round.push(match)
      }

      if (!match.left) {
        match.left = player
      } else if (!match.right) {
        match.right = player
      }

      return rounds
    })
  }, [])

  // =================== Логика кликов в верхней сетке ===================

  function handlePickUpper(
    roundIndex: number,
    matchIndex: number,
    side: 'left' | 'right',
    rel?: Release,
  ) {
    if (!isAdmin || !rel) return

    setUpperRounds(prev => {
      const rounds = prev.map(round => round.map(m => ({ ...m })))
      const round = rounds[roundIndex]
      if (!round) return prev

      const match = round[matchIndex]
      if (!match) return prev

      match.winnerSide = side

      const winner = side === 'left' ? match.left : match.right
      const loser = side === 'left' ? match.right : match.left

      // победитель идёт в следующий раунд верхней
      const nextRoundIndex = roundIndex + 1
      if (winner && nextRoundIndex < rounds.length) {
        const nextRound = rounds[nextRoundIndex]
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

      // проигравший летит в нижнюю сетку в раунд с тем же индексом
      if (loser) {
        placeInLower(roundIndex, loser)
      }

      return rounds
    })

    setSelected(rel)
  }

  // =================== Логика кликов в нижней сетке ===================

  function handlePickLower(
    roundIndex: number,
    matchIndex: number,
    side: 'left' | 'right',
    rel?: Release,
  ) {
    if (!isAdmin || !rel) return

    setLowerRounds(prev => {
      const rounds = prev.map(round => round.map(m => ({ ...m })))
      const round = rounds[roundIndex]
      if (!round) return prev

      const match = round[matchIndex]
      if (!match) return prev

      match.winnerSide = side

      const winner = side === 'left' ? match.left : match.right

      // победитель идёт в следующий раунд нижней
      const nextRoundIndex = roundIndex + 1
      if (winner && nextRoundIndex < rounds.length) {
        if (!rounds[nextRoundIndex]) {
          rounds[nextRoundIndex] = []
        }
        const nextRound = rounds[nextRoundIndex]

        const targetMatchIndex = Math.floor(matchIndex / 2)
        let targetMatch = nextRound[targetMatchIndex]
        if (!targetMatch) {
          targetMatch = { id: targetMatchIndex }
          nextRound[targetMatchIndex] = targetMatch
        }

        const targetSide: 'left' | 'right' =
          matchIndex % 2 === 0 ? 'left' : 'right'

        if (targetSide === 'left') {
          targetMatch.left = winner
        } else {
          targetMatch.right = winner
        }
      }

      return rounds
    })

    setSelected(rel)
  }

  // =================== Гранд-финал ===================

  const upperFinalMatch = upperRounds.length
    ? upperRounds[upperRounds.length - 1]?.[0]
    : undefined
  const upperWinner = getWinner(upperFinalMatch)

  const nonEmptyLowerRounds = lowerRounds.filter(r =>
    r.some(m => m.left || m.right),
  )
  const lowerFinalRound =
    nonEmptyLowerRounds.length > 0
      ? nonEmptyLowerRounds[nonEmptyLowerRounds.length - 1]
      : undefined
  const lowerFinalMatch = lowerFinalRound?.[0]
  const lowerWinner = getWinner(lowerFinalMatch)
  const lowerLoser = getLoser(lowerFinalMatch)

  React.useEffect(() => {
    if (upperWinner && lowerWinner) {
      setGrandFinal(prev => {
        // если уже есть такой же финал — не пересоздаём
        if (
          prev &&
          prev.left?.id === upperWinner.id &&
          prev.right?.id === lowerWinner.id
        ) {
          return prev
        }
        return {
          id: 0,
          left: upperWinner,
          right: lowerWinner,
          winnerSide: prev?.winnerSide,
        }
      })
    }
  }, [upperWinner, lowerWinner])

  function handlePickGrand(side: 'left' | 'right', rel?: Release) {
    if (!isAdmin || !grandFinal || !rel) return
    setGrandFinal(prev => (prev ? { ...prev, winnerSide: side } : prev))
    setSelected(rel)
  }

  // =================== Подсчёт топ-1…5 ===================

  const top1 = grandFinal ? getWinner(grandFinal) : undefined
  const top2 =
    grandFinal && grandFinal.left && grandFinal.right && grandFinal.winnerSide
      ? grandFinal.winnerSide === 'left'
        ? grandFinal.right
        : grandFinal.left
      : undefined

  const top3 = lowerLoser

  // Предпоследний раунд нижней — оттуда берём ещё 2 места
  const penultimateLowerRound =
    nonEmptyLowerRounds.length >= 2
      ? nonEmptyLowerRounds[nonEmptyLowerRounds.length - 2]
      : undefined

  const penultimateLosers: Release[] = []
  if (penultimateLowerRound) {
    penultimateLowerRound.forEach(m => {
      const w = getWinner(m)
      const l = getLoser(m)
      if (w && l) penultimateLosers.push(l)
    })
  }

  penultimateLosers.sort(
    (a, b) =>
      ((b as any).admin_total ?? 0) - ((a as any).admin_total ?? 0),
  )

  const top4 = penultimateLosers[0]
  const top5 = penultimateLosers[1]

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

  function getLowerRoundTitle(index: number): string {
    return `Нижняя R${index + 1}`
  }

  function renderPlacementCard(
    place: number,
    label: string,
    rel?: Release,
    placeholderText?: string,
  ) {
    const sizeClasses =
      place === 1
        ? 'h-32'
        : place === 2
        ? 'h-24'
        : place === 3
        ? 'h-20'
        : 'h-16'

    return (
      <div
        className={`card bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-4 ${sizeClasses}`}
      >
        <div className="text-2xl w-8 text-center">{label}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/50 mb-1">
            {place} место
          </div>
          {rel ? (
            <>
              <div className="text-sm font-semibold truncate">
                {rel.artist}
              </div>
              <div className="text-xs text-white/70 truncate">
                {rel.title}
              </div>
            </>
          ) : (
            <div className="text-xs text-white/40">
              {placeholderText || 'Пока неизвестно'}
            </div>
          )}
        </div>
      </div>
    )
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
            продвигаются по раундам верхней сетки, проигравшие разных раундов
            попадают в нижнюю сетку и там продолжают борьбу. Победитель
            верхней и победитель нижней встречаются в гранд-финале.
          </div>
          {!isAdmin && (
            <div className="text-xs text-white/50">
              Ты не админ — клик по трекам отключён, но треки можно оценивать
              на их страницах.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-6 items-start">
          {/* Левая часть: верхняя + нижняя + топ-5 */}
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

            {/* НИЖНЯЯ СЕТКА */}
            {!loading && lowerRounds.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm text-white/60 font-semibold">
                  Нижняя сетка
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-6 min-w-max">
                    {lowerRounds.map((round, roundIndex) => (
                      <div
                        key={roundIndex}
                        className="flex flex-col items-stretch gap-3"
                      >
                        <div className="text-xs text-white/60 px-2">
                          {getLowerRoundTitle(roundIndex)}
                        </div>

                        <div className="flex flex-col gap-3">
                          {round.length === 0 && (
                            <div className="text-xs text-white/40 px-2">
                              Ожидаются участники
                            </div>
                          )}

                          {round.map((match, matchIndex) =>
                            renderMatchCard(
                              match,
                              roundIndex,
                              matchIndex,
                              false,
                              handlePickLower,
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Гранд-финал */}
            {grandFinal && (
              <div className="space-y-3">
                <div className="text-sm text-white/60 font-semibold">
                  Гранд-финал (верхняя vs нижняя)
                </div>
                {renderMatchCard(
                  grandFinal,
                  0,
                  0,
                  true,
                  (_r, _m, side, rel) => handlePickGrand(side, rel),
                )}
              </div>
            )}

            {/* Черновой итоговый топ-5 */}
            <div className="space-y-3">
              <div className="text-sm text-white/60 font-semibold">
                Черновой результат — Топ 5 (по текущему состоянию сетки)
              </div>
              <div className="space-y-2">
                {renderPlacementCard(
                  1,
                  '🏆',
                  top1,
                  '1 место появится, когда в гранд-финале будет выбран победитель.',
                )}
                {renderPlacementCard(
                  2,
                  '🥈',
                  top2,
                  '2 место появится, когда в гранд-финале будет выбран победитель.',
                )}
                {renderPlacementCard(
                  3,
                  '🥉',
                  top3,
                  '3 место появится, когда будет определён финал нижней сетки.',
                )}
                {renderPlacementCard(
                  4,
                  '4',
                  top4,
                  '4 место появится после завершения предпоследнего раунда нижней сетки.',
                )}
                {renderPlacementCard(
                  5,
                  '5',
                  top5,
                  '5 место появится после завершения предпоследнего раунда нижней сетки.',
                )}
              </div>
            </div>
          </div>

          {/* Правая панель: инфо о треке */}
          <div className="card bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="text-sm font-semibold">
              Информация о треке
            </div>

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
                    Ты админ: кликом по карточке в верхней, нижней сетке
                    или гранд-финале продвигаешь трек и формируешь итоговый
                    топ-5.
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
