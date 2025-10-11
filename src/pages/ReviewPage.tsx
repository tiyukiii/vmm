// src/pages/ReviewPage.tsx
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { getUserId } from '../session'

type Scores = {
  text: number
  vibe: number
  charisma: number
  integrity: number
  boom: number
  extra: number
}

const clamp16 = (n: number) =>
  Math.max(0, Math.min(16, Number.isFinite(n) ? (n | 0) : 0))

export default function ReviewPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()

  // значения слайдеров
  const [vals, setVals] = React.useState<Scores>({
    text: 0,
    vibe: 0,
    charisma: 0,
    integrity: 0,
    boom: 0,
    extra: 0,
  })

  // пересчёты
  const total =
    vals.text + vals.vibe + vals.charisma + vals.integrity + vals.boom + vals.extra
  const total88 = Math.min(88, total)

  const save = async () => {
    try {
      // 0) базовая валидация ссылки
      if (!slug) {
        alert('Неверная ссылка (slug отсутствует)')
        return
      }

      // 1) ищем релиз по slug, чтобы узнать id
      const { data: rel, error: findErr } = await supabase
        .from('releases')
        .select('id')
        .eq('slug', slug)
        .single()

      if (findErr || !rel?.id) {
        console.error('release find error:', findErr)
        alert('Релиз не найден')
        return
      }

      // 2) проверяем, что пользователь залогинен
      const uid = await getUserId()
      if (!uid) {
        alert('Нужно войти, чтобы поставить оценку :)')
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        navigate(`/auth?next=${next}`)
        return
      }

      // 3) вставляем отзыв
      const { error: insertErr } = await supabase.from('reviews').insert({
        release_id: rel.id,
        user_id: uid, // важно сохранять uid
        scores: vals,
        total: total88,
      })

      // мягкая обработка повторной оценки
      if ((insertErr as any)?.code === '23505') {
        alert('Вы уже поставили оценку этому релизу.')
        return
      }
      if (insertErr) throw insertErr

      alert('Оценка сохранена!')
      navigate(`/track/${slug}`)
    } catch (err: any) {
      console.error('save error:', err)
      alert(`Ошибка: ${err?.message ?? String(err)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-white/60 hover:text-white"
          >
            ← Назад
          </button>
          <h1 className="text-xl font-semibold">Поставить оценку</h1>
        </div>

        <div className="card p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-6">
            {([
              ['Текст', 'text'],
              ['Харизма', 'charisma'],
              ['Атмосфера', 'vibe'],
              ['Целостность', 'integrity'],
            ] as const).map(([label, key]) => (
              <label key={key} className="flex items-center gap-4">
                <span className="w-32">{label}</span>
                <input
                  type="range"
                  min={0}
                  max={16}
                  value={vals[key]}
                  onChange={(e) =>
                    setVals((v) => ({ ...v, [key]: clamp16(Number(e.target.value)) }))
                  }
                  className="flex-1"
                />
                <span className="w-12 text-right tabular-nums">{vals[key]}/16</span>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-4">
            <span className="w-32">Разъёб</span>
            <input
              type="range"
              min={0}
              max={16}
              value={vals.boom}
              onChange={(e) =>
                setVals((v) => ({ ...v, boom: clamp16(parseInt(e.target.value)) }))
              }
              className="flex-1"
            />
            <span className="w-12 text-right tabular-nums">{vals.boom}/16</span>
          </label>

          <div className="flex items-center gap-4">
            <span className="w-32">Extra Points</span>
            <input
              type="number"
              min={0}
              value={vals.extra}
              onChange={(e) =>
                setVals((v) => ({
                  ...v,
                  extra: Math.max(0, parseInt(e.target.value) || 0),
                }))
              }
              className="text-black px-2 py-1 rounded w-20"
            />
            <span className="text-white/60">(+2 за каждый)</span>
          </div>

          <div className="text-white/80">
            Итого:{' '}
            <span className="tabular-nums font-semibold">{total88}</span> / 88{' '}
            {vals.extra > 0 && <span className="ml-2 text-white/60">(с учётом extra)</span>}
          </div>

          <div className="flex justify-end gap-3">
            <div className="space-x-2">
              <button
                className="btn"
                onClick={() => navigate(`/track/${slug}`)}
              >
                Отмена
              </button>
              <button className="btn-primary" onClick={save}>
                Сохранить оценку
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
