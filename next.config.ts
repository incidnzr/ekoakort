/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // BU ÇOK ÖNEMLİ!
  images: {
    unoptimized: true, // GitHub Pages için gerekli
  },
  trailingSlash: true,
  // Base path ayarı (repo adına göre)
  basePath: process.env.NODE_ENV === 'production' ? '/eko-akort' : '',
}

module.exports = nextConfig