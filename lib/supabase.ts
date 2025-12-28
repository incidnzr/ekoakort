import { createClient } from '@supabase/supabase-js'

// ESKİ KOD:
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// YENİ KOD (daha güvenli):
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Eğer environment variables yoksa hata ver
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing!')
  // Development'da dummy client döndür
  if (process.env.NODE_ENV === 'development') {
    console.warn('Running with dummy Supabase client in development')
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)