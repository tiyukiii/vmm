
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { addRelease, uploadCover } from '../api'

export default function AdminPage() {
  const n = useNavigate()
  const [artist, setArtist] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [type, setType] = React.useState<'Трек'|'Альбом'>('Трек')
  const [slug, setSlug] = React.useState('')
  const [adminTotal, setAdminTotal] = React.useState<number | ''>('')
  const [coverFile, setCoverFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!artist || !title || !slug) {
      alert('Укажи исполнитель, название и slug'); return
    }
    setBusy(true)
    try {
      let cover_url: string | null = null
      if (coverFile) {
        cover_url = await uploadCover(coverFile)
      }
      await addRelease({
        slug, artist, title, type, cover_url, admin_total: (adminTotal === '' ? null : Number(adminTotal))
      } as any)
      alert('Релиз добавлен!')
      setArtist(''); setTitle(''); setSlug(''); setType('Трек'); setAdminTotal(''); setCoverFile(null)
    } catch (e:any) {
      alert('Ошибка: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Админ-панель</h1>
          <button className="btn" onClick={()=>n('/')}>← На главную</button>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <div className="text-white/70 text-sm">Исполнитель</div>
              <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10"
                value={artist} onChange={e=>setArtist(e.target.value)} />
            </label>
            <label className="space-y-1">
              <div className="text-white/70 text-sm">Название</div>
              <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10"
                value={title} onChange={e=>setTitle(e.target.value)} />
            </label>
            <label className="space-y-1">
              <div className="text-white/70 text-sm">Тип</div>
              <select className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10"
                value={type} onChange={e=>setType(e.target.value as any)}>
                <option value="Трек">Трек</option>
                <option value="Альбом">Альбом</option>
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-white/70 text-sm">Slug (латиницей, уникальный)</div>
              <input className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10"
                value={slug} onChange={e=>setSlug(e.target.value)} />
            </label>
            <label className="space-y-1">
              <div className="text-white/70 text-sm">Офиц. балл (0–88, опционально)</div>
              <input type="number" min={0} max={88} className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10"
                value={adminTotal} onChange={e=>setAdminTotal(e.target.value === '' ? '' : Number(e.target.value))} />
            </label>
            <label className="space-y-1">
              <div className="text-white/70 text-sm">Обложка (jpg/png)</div>
              <input type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <button className="btn-primary" disabled={busy}>{busy ? 'Сохраняю...' : 'Добавить релиз'}</button>
        </form>

        <div className="text-white/50 text-sm">
          Обложки загружаются в хранилище Supabase (bucket <span className="font-mono">covers</span>) и сохраняется публичная ссылка.
        </div>
      </div>
    </div>
  )
}
