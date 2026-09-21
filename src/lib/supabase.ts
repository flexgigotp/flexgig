import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Add them to .env.local and restart the dev server.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: false,
    // Must be true — the realtime client reads the JWT from here
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'flexgig_supabase_session_v1',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})