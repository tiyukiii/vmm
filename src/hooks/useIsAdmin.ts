import React from 'react';
import { supabase } from '../supabase';
import { getUserId } from '../session';

// Возвращает: true — админ, false — не админ, 'loading' — проверяем
export function useIsAdmin(): true | false | 'loading' {
  const [isAdmin, setIsAdmin] = React.useState<true | false | 'loading'>('loading');

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const userId = await getUserId();
        if (!mounted) return;

        if (!userId) {
          setIsAdmin(false);
          return;
        }

        const { data, error } = await supabase
          .from('admins')
          .select('user_id')
          .eq('user_id', userId)
          .limit(1);

        if (!mounted) return;

        if (error) {
          console.error('useIsAdmin error:', error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(!!data && data.length > 0);
      } catch (e) {
        console.error(e);
        if (mounted) setIsAdmin(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return isAdmin;
}
