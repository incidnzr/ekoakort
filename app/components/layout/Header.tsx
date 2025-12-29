"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, User, BarChart3, LogOut, Menu, X } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("ekoakort_user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("ekoakort_user");
    window.location.href = "login";
  };

  // Login sayfasında header gösterme
  if (pathname === "/login") {
    return null;
  }

  const isActive = (path: string) => pathname === path;

  const navItems = [
    {
      path: "/dashboard",
      label: "Ana Sayfa",
      icon: <Home className="w-4 h-4" />,
    },
    {
      path: "/consumption",
      label: "Tüketim Gir",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    { path: "/tips", label: "Öneriler", icon: <Trophy className="w-4 h-4" /> },
    { path: "/profile", label: "Profil", icon: <User className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Eko-Akort</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Yeşil Apartmanı
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  isActive(item.path)
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}

            {user && (
              <div className="ml-4 pl-4 border-l border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <div className="font-medium text-gray-800">
                      {user.apartment_no?.replace("Yeşil Apt. ", "")}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {user.name || "Kullanıcı"}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Çıkış Yap"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                    isActive(item.path)
                      ? "bg-green-100 text-green-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}

              {user && (
                <>
                  <div className="px-4 py-3 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800">
                          {user.apartment_no?.replace("Yeşil Apt. ", "")}
                        </div>
                        <div className="text-gray-500 text-sm">
                          {user.name || "Kullanıcı"}
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
