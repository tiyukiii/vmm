import React from 'react'
import { supabase } from '../supabase'
import { useSession } from '../session'

// Возвращает: true — админ, false — не админ, 'loading' — проверяем
export function useIsAdmin(): true | false | 'loading' {
  const { user, loading } = useSession()
  const [isAdmin, setIsAdmin] =
    React.useState<true | false | 'loading'>('loading')

  React.useEffect(() => {
    let cancelled = false

    async function check() {
      // Пока сессия грузится — ничего не делаем
      if (loading) return

      // Нет юзера => точно не админ
      if (!user?.id) {
        if (!cancelled) setIsAdmin(false)
        return
      }

      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .limit(1)

      if (cancelled) return

      if (error) {
        console.error('useIsAdmin error:', error)
        setIsAdmin(false)
        return
      }

      setIsAdmin(!!data && data.length > 0)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [user?.id, loading])

  return isAdmin
}
