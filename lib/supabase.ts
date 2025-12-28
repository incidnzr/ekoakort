import { createClient } from '@supabase/supabase-js'

// DEVELOPMENT için dummy values
const dummyUrl = 'https://dummy.supabase.co'
const dummyKey = 'dummy-key'

// Client-side ve server-side ayrımı
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || dummyUrl
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || dummyKey

// Build zamanında dummy client kullan
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})