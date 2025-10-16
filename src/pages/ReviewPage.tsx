import React from 'react'
import { supabase } from '../supabase'
import { useParams, useNavigate } from 'react-router-dom'
import { useSession } from '../session';
import { useIsAdmin } from '../hooks/useIsAdmin';





export default function ReviewPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useSession();
  const [vals, setVals] = React.useState({ text:0, vibe:0, charisma:0, integrity:0, boom:0, extra:0 })
  const clamp16 = (n:number)=> Math.max(0, Math.min(16, n|0))
  const base = vals.text + vals.vibe + vals.charisma + vals.integrity + vals.boom
  const total88 = Math.min(88, base + vals.extra * 2);
  const isAdmin = useIsAdmin(); // true | false | 'loading'


  const save = async () => {
    try {
      // 1) считаем итоговый балл
      const total =
        vals.text + vals.charisma + vals.vibe + vals.integrity + vals.boom + vals.extra;
    
      // 2) находим релиз по slug, чтобы узнать его id
      const { data: rel, error: findErr } = await supabase
        .from('releases')
        .select('id')
        .eq('slug', slug)
        .single();
      if (findErr || !rel) throw findErr || new Error('Релиз не найден');
    
      // 3) проверяем, что юзер залогинен
      const uid = user?.id ?? null;
      if (!uid) {
        alert('Нужно войти, чтобы поставить оценку');
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        navigate(`/auth?next=${next}`);
        return;
      }
    
      // 4) вставляем отзыв (user_id — обязательный)
      const { error: insertErr } = await supabase
      .from('reviews')
      .insert([
        {
          release_id: rel.id,
          user_id: uid, // <-- важно: сохраняем uid
          scores: vals,
          total: total88,
          is_admin: isAdmin === true,
        },
      ]);
    
      // "мягкая" обработка уникальности — второй голос
      if (insertErr) {
        if ((insertErr as any).code === '23505') {
          alert('Вы уже поставили оценку этому релизу.');
          return; // просто выходим без падения
        }
        throw insertErr; // остальные ошибки — обычным catch
      }
    
      alert('Оценка сохранена!');
      navigate(`/track/${slug}`);
    } catch (err: any) {
      console.error(err);
      alert(`Ошибка: ${err?.message || err}`);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={()=>navigate(-1)} className="text-white/60 hover:text-white">← Назад</button>
          <h1 className="text-xl font-semibold">Поставить оценку</h1>
        </div>

        <div className="card p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-6">
            {(
              [
                ['Текст', 'text'],
                ['Харизма', 'charisma'],
                ['Атмосфера', 'vibe'],
                ['Целостность', 'integrity'],
              ] as const
            ).map(([label, key]) => (
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

          <label className="flex items-center gap-4"><span className="w-32">Разъеб</span>
            <input type="range" min={0} max={16} value={vals.boom} onChange={e=>setVals(v=>({...v, boom:clamp16(parseInt(e.target.value))}))} className="flex-1"/>
            <span className="w-12 text-right tabular-nums">{vals.boom}/16</span>
          </label>

          <div className="flex items-center gap-4">
            <span className="w-32">Extra Points</span>
            <input type="number" min={0} step={2} value={vals.extra} onChange={e=>setVals(v=>({...v, extra:Math.max(0, Number(e.target.value)||0)}))} className="w-24 bg-white/10 border border-white/10 rounded px-2 py-1"/>

            <span className="text-white/60">(+2 за каждый)</span>
          </div>

          <div className="text-white/80">Итог: <span className="tabular-nums font-semibold">{total88} / 88</span> {vals.extra>0 && <span className="ml-2">+ {vals.extra*2} extra</span>}</div>

          <div className="flex justify-end gap-3">
            <button onClick={()=>navigate(`/track/${slug}`)} className="btn">Отмена</button>
            <button onClick={save} className="btn-primary">Сохранить оценку</button>
          </div>
        </div>
      </div>
    </div>
  )
}
