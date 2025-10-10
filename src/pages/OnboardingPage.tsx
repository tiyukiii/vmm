import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { getUserId } from '../session';

export default function OnboardingPage() {
  const [username, setUsername] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const navigate = useNavigate();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const id = await getUserId();
      if (!id) throw new Error('Нет сессии');

      // пробуем вставить, если уже есть строка — обновим
      const { error: insErr } = await supabase
        .from('profiles')
        .insert({ id, username })
        .select()
        .single();

      if (insErr && insErr.code === '23505') {
        // username уже занят
        throw new Error('Такой ник уже занят');
      } else if (insErr && insErr.code !== '23505') {
        // если строка существует (conflict по PK), обновим
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ username })
          .eq('id', id);
        if (updErr) throw updErr;
      }

      navigate('/'); // куда дальше вести
    } catch (e: any) {
      setErr(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 card">
      <h1 className="text-xl font-semibold mb-4">Выберите никнейм</h1>
      <form onSubmit={save} className="space-y-4">
        <input
          className="w-full rounded-xl bg-white/10 border border-white/10 p-3 outline-none"
          placeholder="Ник (не короче 3 символов)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          required
        />
        {err && <div className="text-red-400 text-sm">{err}</div>}
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
