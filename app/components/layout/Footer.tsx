"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Login sayfasında footer gösterme
  if (pathname === "/login") {
    return null;
  }

  return (
    <footer className="bg-white border-t mt-12">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-gray-600">
          <p className="text-sm">🚀 Hackathon Projesi | Eko-Akort © 2025</p>
          <p className="text-xs mt-1 text-gray-500">
            Su ve enerji tasarrufu için akıllı çözümler
          </p>
          <div className="mt-4 flex justify-center space-x-6 text-xs">
            <span className="text-gray-400">Gizlilik Politikası</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">Kullanım Şartları</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">İletişim</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
