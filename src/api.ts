// src/api.ts
import { supabase } from './supabase';

export type Release = {
  id: string;
  slug: string;
  artist: string;
  title: string;
  cover_url: string | null;
  created_at: string | null;

  // агрегаты
  score: number | null;       // средняя пользовательская
  votes: number;              // кол-во пользовательских отзывов
  admin_total: number | null; // средняя официальная (админская)
};

export async function fetchReleaseBySlug(slug: string): Promise<Release | null> {
  // 1) Находим релиз
  const { data: rel, error: relErr } = await supabase
    .from('releases')
    .select('id, slug, artist, title, cover_url, created_at')
    .eq('slug', slug)
    .single();

  if (relErr || !rel) return null;

  // 2) Тянем все отзывы по этому релизу (и берём только нужные поля)
  const { data: reviews, error: revErr } = await supabase
    .from('reviews')
    .select('total, is_admin')
    .eq('release_id', rel.id);

  if (revErr) {
    // если что-то пошло не так — вернём релиз без агрегатов
    return {
      ...rel,
      score: null,
      votes: 0,
      admin_total: null,
    };
  }

  // 3) Разделяем отзывы на админские и пользовательские
  const userTotals = (reviews ?? [])
    .filter(r => r.is_admin !== true)          // false или null → пользователь
    .map(r => Number(r.total))
    .filter(n => Number.isFinite(n));

  const adminTotals = (reviews ?? [])
    .filter(r => r.is_admin === true)          // true → админ
    .map(r => Number(r.total))
    .filter(n => Number.isFinite(n));

  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null;

  const score = avg(userTotals);       // средняя пользовательская
  const admin_total = avg(adminTotals); // средняя админская
  const votes = userTotals.length;     // количество пользовательских голосов

  return {
    ...rel,
    score,
    votes,
    admin_total,
  };
}
