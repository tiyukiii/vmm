import React from 'react'
import { supabase } from './supabase'

export type Sess = {
  email: string | null
}

export function useSession() {
  const [user, setUser] = React.useState<Sess>({ email: null })

  React.useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUser({ email: data.user?.email ?? null })
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUser({ email: data.user?.email ?? null })
    })
    return () => {
      mounted = false
      sub?.subscription.unsubscribe()
    }
  }, [])

  return user
}

export async function getUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? null
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

