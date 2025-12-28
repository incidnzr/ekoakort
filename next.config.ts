/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // BU SATIRI SİLİN veya DEĞİŞTİRİN:
  // basePath: process.env.NODE_ENV === 'production' ? '/eko-akort' : '',
  basePath: '', // VEYA tamamen kaldırın
  env: {
    // BU SATIRLARI EKLEYİN:
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

module.exports = nextConfig