/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // BU MUTLAKA OLMALI
  
  // Netlify/GitHub Pages için image optimization'ı kapat
  images: {
    unoptimized: true,
  },
  
  // GitHub Pages için trailing slash önemli
  trailingSlash: true,
  
  // BU SATIRI SİLİN veya yorum satırı yapın:
  // basePath: process.env.NODE_ENV === 'production' ? '/eko-akort' : '',
  
  // VEYA sadece bu şekilde bırakın:
  basePath: '',
  
  // Environment variables (build için önemli)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }
}

module.exports = nextConfig