import { supabase } from './supabase'
import { api } from '@/services/api'

let authenticated = false
let inFlight: Promise<boolean> | null = null

/**
 * Fetch a Supabase-compatible JWT from our backend and hand it to the
 * realtime client. Without this, RLS silently drops all realtime events.
 * Safe to call repeatedly — no-op if already authenticated.
 */
export async function authenticateSupabaseClient(
  force = false
): Promise<boolean> {
  if (authenticated && !force) return true
  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const res = await api.post('/api/supabase/token')
      const token: string | undefined = res.data?.token
      if (!token) {
        console.warn('[SupabaseAuth] No token returned')
        return false
      }

      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: 'rt-cookie-managed',
      })

      if (error) {
        console.warn('[SupabaseAuth] setSession failed:', error.message)
        return false
      }

      authenticated = true
      console.log('[SupabaseAuth] Realtime client authenticated')
      return true
    } catch (err) {
      console.warn('[SupabaseAuth] Failed:', err)
      return false
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

export function resetSupabaseAuth() {
  authenticated = false
}