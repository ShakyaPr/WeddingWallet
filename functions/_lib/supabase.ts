import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  // Optional Access hardening — see functions/_lib/access.ts
  CF_ACCESS_TEAM_DOMAIN?: string
  CF_ACCESS_AUD?: string
}

// A Supabase client using the SERVICE ROLE key. This bypasses Row Level
// Security and must NEVER be exposed to the browser — it only ever runs
// inside the Cloudflare Pages Function.
export function getSupabase(env: Env): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them in ' +
        'Cloudflare Pages → Settings → Environment variables (and .dev.vars locally).',
    )
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
