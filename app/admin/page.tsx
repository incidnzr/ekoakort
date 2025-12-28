// app/admin/page.tsx - ŞİFRE İLE GİRİŞLİ
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminPanel from "@/app/components/admin/AdminPanel";
import LoadingSpinner from "@/app/components/shared/LoadingSpinner";

// Admin şifresi - Gerçek uygulamada bu veritabanında olmalı
const ADMIN_PASSWORD = "ekoakort2024";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);

  useEffect(() => {
    // Sayfa yüklendiğinde localStorage'dan auth kontrolü
    const adminAuth = localStorage.getItem("ekoakort_admin_auth");
    if (adminAuth) {
      const { timestamp, expires } = JSON.parse(adminAuth);
      const now = Date.now();
      
      // 24 saat geçerli session
      if (now - timestamp < expires) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("ekoakort_admin_auth");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Kilit kontrolü
    if (isLocked && lockTime > 0) {
      const timer = setInterval(() => {
        setLockTime(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLocked, lockTime]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      setError(`Lütfen ${lockTime} saniye bekleyin`);
      return;
    }

    if (!password.trim()) {
      setError("Lütfen şifre girin");
      return;
    }

    try {
      // Şifreyi veritabanından kontrol et
      const { data, error } = await supabase
        .from("admin_settings")
        .select("*")
        .eq("key", "admin_password")
        .single();

      let isValid = false;

      if (error || !data) {
        // Tablo yoksa veya kayıt yoksa, default şifre ile kontrol et
        isValid = password === ADMIN_PASSWORD;
        
        // İlk kez kullanılıyorsa, şifreyi veritabanına kaydet
        if (isValid) {
          await supabase
            .from("admin_settings")
            .insert([
              {
                key: "admin_password",
                value: ADMIN_PASSWORD,
                description: "Admin panel şifresi",
                created_at: new Date().toISOString()
              }
            ]);
        }
      } else {
        // Veritabanındaki şifre ile kontrol et
        isValid = password === data.value;
      }

      if (isValid) {
        // Başarılı giriş
        const authData = {
          timestamp: Date.now(),
          expires: 24 * 60 * 60 * 1000, // 24 saat
          ip: await getClientIP()
        };
        
        localStorage.setItem("ekoakort_admin_auth", JSON.stringify(authData));
        setIsAuthenticated(true);
        setError("");
        setAttempts(0);
      } else {
        // Yanlış şifre
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTime(60); // 60 saniye kilit
          setError("Çok fazla deneme yaptınız. 60 saniye bekleyin.");
        } else {
          setError(`Yanlış şifre! Kalan deneme: ${3 - newAttempts}`);
        }
        
        setPassword("");
      }
    } catch (err) {
      console.error("Giriş hatası:", err);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ekoakort_admin_auth");
    setIsAuthenticated(false);
    setPassword("");
    setError("");
    setAttempts(0);
  };

  if (loading) {
    return <LoadingSpinner message="Admin paneli yükleniyor..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Eko-Akort Admin</h1>
              <p className="text-gray-300">Yönetici Paneli Girişi</p>
            </div>

            {/* Login Form */}
            <div className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Şifresi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      disabled={isLocked}
                      className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent transition ${
                        error ? "border-red-300" : "border-gray-300"
                      } ${isLocked ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      placeholder="Admin şifresini girin"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                {isLocked && (
                  <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-lg font-bold text-yellow-700 mb-1">
                      ⏳ {lockTime} saniye
                    </div>
                    <div className="text-sm text-yellow-600">
                      Çok fazla deneme yaptınız. Lütfen bekleyin.
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLocked || !password.trim()}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
                    isLocked || !password.trim()
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {isLocked ? "Kilitli" : "Giriş Yap"}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Demo şifresi: <code className="bg-gray-100 px-2 py-1 rounded">ekoakort2024</code>
                  </p>
                </div>
              </form>

              {/* Security Info */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Shield className="w-4 h-4 text-green-500 mr-2" />
                    <span>Giriş 24 saat geçerlidir</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                    <span>3 yanlış deneme sonrası 60 saniye kilit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-600 hover:text-gray-800 transition"
            >
              ← Kullanıcı paneline dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated ise AdminPanel component'ini göster
  return <AdminPanel onLogout={handleLogout} />;
}