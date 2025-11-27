import { supabase } from './supabase';

// хелпер для расчёта среднего (округляет до 0.1)
const avg = (arr: number[]) =>
  arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null;

export type Scores = {
  r1: number | null; // текст
  r2: number | null; // атмосфера
  r3: number | null; // разъеб
  r4: number | null; // харизма
  r5: number | null; // целостность
};

export type Release = {
  id: string;
  slug: string;
  artist: string;
  title: string;
  type: string;
  created_at: string;

  cover_url: string | null;

  // средняя пользовательская (то, что у тебя уже было)
  score: number | null;
  votes: number;        // число пользовательских голосов
  admin_total: number | null; // средняя официальная

  // НОВОЕ: разложение по критериям
  user_breakdown?: Scores | null;
  admin_breakdown?: Scores | null;
};


// Получить список всех релизов
export async function fetchReleases(): Promise<Release[]> {
  // 1) забираем список релизов
  const { data: rows, error } = await supabase
    .from('releases')
    .select('id, slug, artist, title, type, cover_url, created_at');

  if (error) {
    console.error('fetchReleases error', error);
    return [];
  }

  const ids = rows.map(r => r.id);
  if (ids.length === 0) return [];

  // 2) забираем отзывы админов и пользователей (в пределах этих релизов)
  const { data: adminRv, error: adminErr } = await supabase
    .from('reviews')
    .select('release_id, total, is_admin')
    .in('release_id', ids)
    .eq('is_admin', true);

  const { data: userRv, error: userErr } = await supabase
    .from('reviews')
    .select('release_id, total, is_admin')
    .in('release_id', ids)
    .eq('is_admin', false);

  if (adminErr) console.error('fetchReleases admin reviews error', adminErr);
  if (userErr) console.error('fetchReleases user reviews error', userErr);

  // утилита среднего (округление до 0.1)
  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : null;

  // 3) собираем по release_id
  const adminMap = new Map<number, number[]>(); // release_id -> totals[]
  const userMap = new Map<number, number[]>();  // release_id -> totals[]

  (adminRv ?? []).forEach(r => {
    const list = adminMap.get(r.release_id) ?? [];
    if (Number.isFinite(r.total)) list.push(Number(r.total));
    adminMap.set(r.release_id, list);
  });

  (userRv ?? []).forEach(r => {
    const list = userMap.get(r.release_id) ?? [];
    if (Number.isFinite(r.total)) list.push(Number(r.total));
    userMap.set(r.release_id, list);
  });

  // 4) собираем итоговую структуру Release
  const result: Release[] = rows.map(r => {
    const uTotals = userMap.get(r.id) ?? [];
    const aTotals = adminMap.get(r.id) ?? [];

    return {
      id: r.id,
      slug: r.slug,
      artist: r.artist,
      title: r.title,
      type: r.type,
      cover_url: r.cover_url,
      created_at: r.created_at,

      score: avg(uTotals),             // средняя пользовательская
      votes: uTotals.length,           // кол-во пользовательских голосов
      admin_total: avg(aTotals),       // средняя админская
    } as Release;
  });

  return result;
}


export async function fetchReleaseBySlug(slug: string): Promise<Release | null> {
  const { data: rel, error: relErr } = await supabase
    .from('releases')
    .select('id, slug, artist, title, type, cover_url, created_at')
    .eq('slug', slug)
    .single();

  if (relErr || !rel) return null;

  // Забираем ВСЕ рецензии по этому релизу
  const { data: reviews, error: revErr } = await supabase
    .from('reviews')
    .select('total, is_admin, r1, r2, r3, r4, r5')
    .eq('release_id', rel.id);

  if (revErr) {
    console.error('fetchReleaseBySlug error', revErr);
    return {
      ...rel,
      score: null,
      votes: 0,
      admin_total: null,
      user_breakdown: null,
      admin_breakdown: null,
    };
  }

  const all = reviews ?? [];

  const user = all.filter(r => r.is_admin === false);
  const admins = all.filter(r => r.is_admin === true);

  // итого по баллам
  const userTotals = user
    .map(r => Number(r.total))
    .filter(n => Number.isFinite(n));

  const adminTotals = admins
    .map(r => Number(r.total))
    .filter(n => Number.isFinite(n));

  const score = avg(userTotals);          // средняя пользовательская
  const admin_total = avg(adminTotals);   // средняя админская
  const votes = userTotals.length;        // кол-во пользовательских голосов

  // разбивка по критериям для пользователей
  const user_breakdown: Scores | null = user.length
    ? {
        r1: avg(user.map(r => Number(r.r1)).filter(n => Number.isFinite(n))),
        r2: avg(user.map(r => Number(r.r2)).filter(n => Number.isFinite(n))),
        r3: avg(user.map(r => Number(r.r3)).filter(n => Number.isFinite(n))),
        r4: avg(user.map(r => Number(r.r4)).filter(n => Number.isFinite(n))),
        r5: avg(user.map(r => Number(r.r5)).filter(n => Number.isFinite(n))),
      }
    : null;

  // разбивка по критериям для админов
  const admin_breakdown: Scores | null = admins.length
    ? {
        r1: avg(admins.map(r => Number(r.r1)).filter(n => Number.isFinite(n))),
        r2: avg(admins.map(r => Number(r.r2)).filter(n => Number.isFinite(n))),
        r3: avg(admins.map(r => Number(r.r3)).filter(n => Number.isFinite(n))),
        r4: avg(admins.map(r => Number(r.r4)).filter(n => Number.isFinite(n))),
        r5: avg(admins.map(r => Number(r.r5)).filter(n => Number.isFinite(n))),
      }
    : null;

  return {
    ...rel,
    score,
    votes,
    admin_total,
    user_breakdown,
    admin_breakdown,
  };
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
