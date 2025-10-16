import { supabase } from './supabase';

export type Release = {
  id: string;
  slug: string;
  artist: string;
  title: string;
  type: string; // ← добавлено: нужно для TrackPage и других
  cover_url: string | null;
  created_at: string | null;
  score: number | null; // средняя пользовательская
  votes: number;        // кол-во пользовательских отзывов
  admin_total: number | null; // средняя официальная (админская)
};

// Получить список всех релизов
export async function fetchReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from('releases')
    .select('id, slug, artist, title, type, cover_url, created_at');

  if (error) {
    console.error('fetchReleases error', error);
    return [];
  }

  return (data ?? []).map(r => ({
    ...r,
    score: null,       // по списку мы не знаем средние — ставим дефолт
    votes: 0,          // дефолт
    admin_total: null, // дефолт
  })) as Release[];
}

// Получить релиз по slug (с агрегацией)
export async function fetchReleaseBySlug(slug: string): Promise<Release | null> {
  const { data: rel, error: relErr } = await supabase
    .from('releases')
    .select('id, slug, artist, title, type, cover_url, created_at')
    .eq('slug', slug)
    .single();

  if (relErr || !rel) return null;

  const { data: reviews, error: revErr } = await supabase
    .from('reviews')
    .select('total, is_admin')
    .eq('release_id', rel.id);

  if (revErr) {
    console.error('fetchReleaseBySlug error', revErr);
    return { ...rel, score: null, votes: 0, admin_total: null };
  }

  const userTotals = (reviews ?? [])
    .filter(r => r.is_admin !== true)
    .map(r => Number(r.total))
    .filter(n => Number.isFinite(n));

  const adminTotals = (reviews ?? [])
    .filter(r => r.is_admin === true)
    .map(r => Number(r.total))
    .filter(n => Number.isFinite(n));

  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length * 10) / 10 : null;

  const score = avg(userTotals);
  const admin_total = avg(adminTotals);
  const votes = userTotals.length;

  return { ...rel, score, votes, admin_total };
}

// Добавить релиз (используется в админке)
export async function addRelease(data: {
  slug: string;
  artist: string;
  title: string;
  type: string;
  cover_url?: string | null;
}) {
  const { error } = await supabase.from('releases').insert(data);
  if (error) throw error;
}

// Загрузка обложки
export async function uploadCover(file: File): Promise<string | null> {
  const filePath = `covers/${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from('public').upload(filePath, file);
  if (error) {
    console.error('uploadCover error', error);
    return null;
  }
  return filePath;
}
