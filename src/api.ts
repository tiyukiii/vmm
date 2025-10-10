
import { supabase, BUCKET } from './supabase'

export type Release = {
  id: string
  slug: string
  artist: string
  title: string
  type: 'Трек' | 'Альбом'
  cover_url: string | null
  admin_total?: number | null
  score?: number | null
  votes?: number | null
  created_at?: string
}

export async function fetchReleases(): Promise<Release[]> {
  const { data, error } = await supabase
    .from('releases_with_score')
    .select('id, slug, artist, title, type, cover_url, score, votes, created_at')
    .order('score', { ascending: false })
    .limit(200)
  if (error) throw error
  return data ?? []
}

export async function fetchReleaseBySlug(slug: string): Promise<Release | null> {
  const { data, error } = await supabase
    .from('releases_with_score')
    .select('id, slug, artist, title, type, cover_url, score, votes, created_at')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
}

export async function addRelease(input: Omit<Release, 'id'>) {
  const { error } = await supabase.from('releases').insert({
    slug: input.slug,
    artist: input.artist,
    title: input.title,
    type: input.type,
    cover_url: input.cover_url,
    admin_total: input.admin_total ?? null,
  })
  if (error) throw error
}

export async function uploadCover(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
