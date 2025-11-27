// src/pages/AwardPage.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession, signOut } from '../session'
import { useIsAdmin } from '../hooks/useIsAdmin'

export default function AwardPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const isAdmin = useIsAdmin()

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Шапка как на главной */}
        <div className="flex items-center justify-between">
          <div className="text-2xl font-extrabold">Музыкальные Оценки</div>

          <div className="flex gap-3 items-center">
            {isAdmin === true && (
              <button className="btn" onClick={() => navigate('/admin')}>
                Админ
              </button>
            )}

            <button className="btn-primary" onClick={() => navigate('/top100')}>
              Топ 100
            </button>

            {user?.email ? (
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">{user.email}</span>
                <button className="btn" onClick={signOut}>
                  Выйти
                </button>
              </div>
            ) : (
              <button
                className="btn"
                onClick={() => {
                  const next = encodeURIComponent('/award2025')
                  navigate(`/auth?next=${next}`)
                }}
              >
                Войти
              </button>
            )}
          </div>
        </div>

        {/* Назад на главную */}
        <button
          className="text-sm text-emerald-300 flex items-center gap-1"
          onClick={() => navigate('/')}
        >
          ← Вернуться на главную
        </button>

        {/* Hero-блок премии */}
        <div className="card p-6 flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🏆</div>
            <div>
              <div className="text-2xl font-bold">Премия Музыкальных Оценок 2025</div>
              <div className="text-sm text-white/70 mt-2">
                Все треки, добавленные на сайт в 2025 году, участвуют в премии. Победителей в
                турнирной сетке выбирают админы.
              </div>
            </div>
          </div>

          <div className="px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-300 text-sm">
            Голосование: только админы
          </div>
        </div>

        {/* Табы номинаций (пока только визуально, без логики) */}
        <div className="flex flex-wrap gap-3 text-sm">
          <button className="px-4 py-2 rounded-full bg-white/10 border border-white/30">
            Трек года
          </button>
          <button className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60">
            Альбом года
          </button>
          <button className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60">
            Артист года
          </button>
          <button className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/60">
            Прорыв года
          </button>
        </div>

        {/* Номинанты — Трек года */}
        <div className="space-y-4">
          <div className="text-xl font-semibold">Номинанты — Трек года</div>
          <div className="text-sm text-white/60">
            Все треки, добавленные на сайт в 2025 году. Полная турнирная сетка доступна только
            администраторам.
          </div>

          {/* Карточка результатов номинации Трек года */}
          <div className="card bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            {/* 1 место */}
            <div className="flex gap-6 items-start">
              {/* Большой квадрат 1 места */}
              <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-6xl text-white/25">
                ?
              </div>
                    
              {/* Текст справа */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <span>🏆</span>
                  <span>Пока неизвестно</span>
                </div>
                    
                <div className="text-sm text-white/70">
                  Трек года — по версии премии 2025
                </div>
                    
                <div className="text-sm text-white/50">
                  1 место появится здесь, когда админы выберут победителя в турнирной сетке.
                </div>
              </div>
            </div>
                    
            {/* 2 место */}
            <div className="flex items-center gap-4 mt-6">
              <div className="w-28 h-28 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl text-white/25">
                ?
              </div>
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <span>🥈</span>
                  <span>Пока неизвестно</span>
                </div>
                <div className="text-sm text-white/60">2 место</div>
              </div>
            </div>
                    
            {/* 3 место */}
            <div className="flex items-center gap-4 mt-4">
              <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl text-white/25">
                ?
              </div>
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <span>🥉</span>
                  <span>Пока неизвестно</span>
                </div>
                <div className="text-sm text-white/60">3 место</div>
              </div>
            </div>
                    
            {/* 4–5 места */}
            <div className="space-y-1 text-sm mt-4">
              <div>
                <span className="font-semibold">4 место</span> —{' '}
                <span className="text-white/70">Пока неизвестно</span>
              </div>
              <div>
                <span className="font-semibold">5 место</span> —{' '}
                <span className="text-white/70">Пока неизвестно</span>
              </div>
            </div>
                    
            {/* Кнопка голосования */}
            {isAdmin && (
              <button
                className="btn-primary w-full mt-6"
                onClick={() => navigate('/award2025/track-grid')}
              >
                Голосовать
              </button>
            )}

            {/* Кнопка голосования — только для админа */}
            {isAdmin && (
              <button
                className="btn-primary w-full mt-4"
                onClick={() => navigate('/award2025/track-grid')}
              >
                Голосовать
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
