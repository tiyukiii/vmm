// src/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anon) {
  console.error('Missing Supabase env: проверь .env.local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

export const supabase = createClient(url!, anon!)
export const BUCKET = 'covers'
