// app/profile/page.tsx - YENİDEN DÜZENLENMİŞ
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Home,
  Users as UsersIcon,
  Mail,
  Key,
  Save,
  Shield,
  Bell,
  Trash2,
  ArrowLeft,
  Plus,
  Building,
  Droplets,
  Zap,
  Edit2,
  Power,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/app/components/shared/LoadingSpinner";

// ==================== TİPLER ====================
interface Company {
  id: number;
  name: string;
  code: string;
  utility_type: string;
  is_contracted?: boolean;
}

interface UserSubscription {
  id: number;
  company_id: number;
  subscriber_no: string;
  utility_type: "water" | "electricity";
  is_active: boolean;
  companies: Company[];
}

interface UserStats {
  totalConsumptions: number;
  totalPoints: number;
  joinedDate: string;
  lastLogin: string;
  activeSubscriptions: number;
}

// ==================== ANA KOMPONENT ====================
export default function ProfilePage() {
  const router = useRouter();
  
  // ==================== STATE'LER ====================
  // Kullanıcı ve Yükleme State'leri
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profil Form State'i
  const [form, setForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    notifications: true,
    marketingEmails: false,
  });
  
  // Abonelik Form State'i
  const [subscriptionForm, setSubscriptionForm] = useState({
    company_id: "",
    subscriber_no: "",
    utility_type: "water" as "water" | "electricity",
  });
  
  // Veri State'leri
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalConsumptions: 0,
    totalPoints: 0,
    joinedDate: "",
    lastLogin: "",
    activeSubscriptions: 0,
  });
  
  // UI State'leri
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<number | null>(null);
  const [showContractInfo, setShowContractInfo] = useState(false);

  // ==================== LIFECYCLE ====================
  useEffect(() => {
    checkAuth();
    fetchUserData();
  }, []);

  useEffect(() => {
    if (userSubscriptions.length > 0) {
      const activeSubs = userSubscriptions.filter((sub) => sub.is_active).length;
      setUserStats((prev) => ({
        ...prev,
        activeSubscriptions: activeSubs,
      }));
    }
  }, [userSubscriptions]);

  // ==================== YARDIMCI FONKSİYONLAR ====================
  const checkAuth = () => {
    const userData = localStorage.getItem("ekoakort_user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
  };

  // ==================== VERİ ÇEKME FONKSİYONLARI ====================
  const fetchUserData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("ekoakort_user") || "{}");
      
      // 1. Kullanıcı bilgilerini getir
      const { data: userFromDb } = await supabase
        .from("users")
        .select("*")
        .eq("id", userData.id)
        .single();

      if (userFromDb) {
        setForm({
          name: userFromDb.name || "",
          email: userFromDb.email || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          notifications: true,
          marketingEmails: false,
        });

        // 2. Abonelikleri getir
        await fetchUserSubscriptions(userData.id);

        // 3. Tüm şirketleri getir
        await fetchAllCompanies();

        // 4. Tüketim istatistiklerini getir
        const { count: consumptionCount } = await supabase
          .from("consumptions")
          .select("*", { count: "exact" })
          .eq("user_id", userData.id);

        setUserStats((prev) => ({
          ...prev,
          totalConsumptions: consumptionCount || 0,
          totalPoints: userFromDb.total_points || 0,
          joinedDate: new Date(userFromDb.created_at).toLocaleDateString("tr-TR"),
          lastLogin: new Date(userFromDb.last_login || userFromDb.created_at).toLocaleDateString("tr-TR"),
        }));
      }
    } catch (error) {
      console.error("Kullanıcı verisi alınamadı:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubscriptions = async (userId: number) => {
    try {
      const { data: subscriptions } = await supabase
        .from("user_subscriptions")
        .select(`
          id,
          company_id,
          subscriber_no,
          utility_type,
          is_active,
          companies!inner (
            id,
            name,
            code,
            utility_type,
            is_contracted
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (subscriptions) {
        const formattedSubscriptions: UserSubscription[] = subscriptions.map((sub: any) => ({
          id: sub.id,
          company_id: sub.company_id,
          subscriber_no: sub.subscriber_no,
          utility_type: sub.utility_type,
          is_active: sub.is_active,
          companies: Array.isArray(sub.companies) ? sub.companies : [sub.companies],
        }));

        setUserSubscriptions(formattedSubscriptions);
      }
    } catch (error) {
      console.error("Abonelikler yüklenemedi:", error);
    }
  };

  const fetchAllCompanies = async () => {
    try {
      const { data: companies } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      setAllCompanies(companies || []);
    } catch (error) {
      console.error("Şirketler yüklenemedi:", error);
    }
  };

  // ==================== GEÇMİŞ VERİ YÜKLEME ====================
  const loadHistoricalData = async (
    userId: number,
    companyId: number,
    subscription: typeof subscriptionForm
  ) => {
    try {
      const today = new Date();
      const historicalData = [];

      // Son 3 ay için demo veri oluştur
      for (let i = 3; i >= 1; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 15);

        let waterAmount = null;
        let electricityAmount = null;

        if (subscription.utility_type === "water") {
          waterAmount = 25 + Math.random() * 15 - 7.5;
          waterAmount = waterAmount * (1 - i * 0.05);
        } else {
          electricityAmount = 250 + Math.random() * 200 - 100;
          electricityAmount = electricityAmount * (1 - i * 0.04);
        }

        historicalData.push({
          user_id: userId,
          subscription_id: 0,
          water_amount: subscription.utility_type === "water" ? Number(waterAmount?.toFixed(2)) : null,
          electricity_amount: subscription.utility_type === "electricity" ? Number(electricityAmount?.toFixed(2)) : null,
          month: monthDate.getMonth() + 1,
          year: monthDate.getFullYear(),
          created_at: monthDate.toISOString(),
          monthly_points: Math.floor(80 + Math.random() * 40),
        });
      }

      // Önce abonelik ID'sini al
      const { data: newSubscription } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .eq("subscriber_no", subscription.subscriber_no)
        .single();

      if (!newSubscription) return;

      // Historical data'ya subscription_id ekle
      const finalData = historicalData.map((data) => ({
        ...data,
        subscription_id: newSubscription.id,
      }));

      // Veritabanına kaydet
      const { error } = await supabase.from("consumptions").insert(finalData);

      if (error) throw error;

      console.log(`✅ ${finalData.length} ay geçmiş veri yüklendi`);
    } catch (error: any) {
      console.error("Geçmiş veri yükleme hatası:", error);
    }
  };

  // ==================== PROFİL İŞLEMLERİ ====================
  const handleSaveProfile = async () => {
    setSaving(true);

    try {
      const userData = JSON.parse(localStorage.getItem("ekoakort_user") || "{}");

      const updates: any = {};
      if (form.name) updates.name = form.name;
      if (form.email) updates.email = form.email;

      // Şifre değişikliği
      if (form.newPassword) {
        if (form.newPassword !== form.confirmPassword) {
          alert("Yeni şifreler eşleşmiyor!");
          setSaving(false);
          return;
        }
        if (form.newPassword.length < 6) {
          alert("Şifre en az 6 karakter olmalıdır!");
          setSaving(false);
          return;
        }
        updates.password = form.newPassword;
      }

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userData.id);

      if (error) throw error;

      // localStorage'ı güncelle
      const updatedUser = {
        ...userData,
        name: form.name || userData.name,
      };
      localStorage.setItem("ekoakort_user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      alert("Profil bilgileriniz başarıyla güncellendi!");

      // Şifre alanlarını temizle
      if (form.newPassword) {
        setForm({
          ...form,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error: any) {
      console.error("Güncelleme hatası:", error);
      alert("Güncelleme sırasında hata: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ==================== ABONELİK İŞLEMLERİ ====================
  const handleAddSubscription = async () => {
    if (!subscriptionForm.company_id || !subscriptionForm.subscriber_no) {
      alert("Lütfen tüm alanları doldurun");
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem("ekoakort_user") || "{}");
      const companyId = parseInt(subscriptionForm.company_id);

      // Şirketin sözleşmeli olup olmadığını kontrol et
      const { data: company } = await supabase
        .from("companies")
        .select("is_contracted, name")
        .eq("id", companyId)
        .single();

      // Aboneliği kaydet
      const { error: subError } = await supabase
        .from("user_subscriptions")
        .insert([
          {
            user_id: userData.id,
            company_id: companyId,
            subscriber_no: subscriptionForm.subscriber_no,
            utility_type: subscriptionForm.utility_type,
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ]);

      if (subError) throw subError;

      // EĞER SÖZLEŞMELİ FİRMA İSE → GEÇMİŞ VERİ YÜKLE
      if (company?.is_contracted) {
        await loadHistoricalData(userData.id, companyId, subscriptionForm);
        alert(
          `✅ ${company.name} aboneliği eklendi!\n\n🎉 Sözleşmeli firma olduğu için son 3 ayın demo verileri otomatik yüklendi!`
        );
      } else {
        alert(
          `✅ Abonelik başarıyla eklendi!\n\nℹ️ Bu firma sözleşmeli değil, verilerinizi manuel girmeniz gerekecek.`
        );
      }

      // Formu temizle ve kapat
      setSubscriptionForm({
        company_id: "",
        subscriber_no: "",
        utility_type: "water",
      });
      setShowAddSubscription(false);
      setShowContractInfo(false);

      // Abonelikleri yenile
      await fetchUserSubscriptions(userData.id);
    } catch (error: any) {
      console.error("Abonelik ekleme hatası:", error);
      alert("Abonelik eklenirken hata: " + error.message);
    }
  };

  const handleToggleSubscription = async (subscriptionId: number, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ is_active: !isActive })
        .eq("id", subscriptionId);

      if (error) throw error;

      alert(`Abonelik ${!isActive ? "aktif" : "pasif"} edildi!`);
      await fetchUserSubscriptions(user.id);
    } catch (error: any) {
      console.error("Abonelik güncelleme hatası:", error);
      alert("Güncelleme sırasında hata: " + error.message);
    }
  };

  const handleDeleteSubscription = async (subscriptionId: number) => {
    if (!confirm("Bu aboneliği silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .delete()
        .eq("id", subscriptionId);

      if (error) throw error;

      alert("Abonelik silindi!");
      await fetchUserSubscriptions(user.id);
    } catch (error: any) {
      console.error("Abonelik silme hatası:", error);
      alert("Silme sırasında hata: " + error.message);
    }
  };

  const handleEditSubscription = (subscription: UserSubscription) => {
    setSubscriptionForm({
      company_id: subscription.company_id.toString(),
      subscriber_no: subscription.subscriber_no,
      utility_type: subscription.utility_type,
    });
    setEditingSubscriptionId(subscription.id);
    setShowAddSubscription(true);
    
    // Sözleşme bilgisi göster/gizle
    const company = subscription.companies?.[0];
    if (company?.is_contracted) {
      setShowContractInfo(true);
    } else {
      setShowContractInfo(false);
    }
  };

  // ==================== HESAP İŞLEMLERİ ====================
  const handleDeleteAccount = () => {
    if (
      confirm(
        "Hesabınızı silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz. Tüm verileriniz (abonelikler, tüketim kayıtları, puanlar) kalıcı olarak silinecektir."
      )
    ) {
      alert(
        "Demo sürümünde hesap silme özelliği devre dışıdır.\n\nGerçek uygulamada hesap silme işlemi yapılacaktır."
      );
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // ==================== YÜKLENİYOR ====================
  if (loading) {
    return <LoadingSpinner message="Profil yükleniyor..." />;
  }

  // ==================== RENDER ====================
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* BAŞLIK */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="mr-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Profil Yönetimi</h1>
            <p className="text-gray-600">Kişisel bilgileriniz ve aboneliklerinizi yönetin</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SOL KOLON - PROFİL ve ABONELİKLER */}
        <div className="lg:col-span-2 space-y-8">
          {/* PROFİL BİLGİLERİ */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <User className="w-5 h-5 mr-2 text-green-600" />
              Kişisel Bilgiler
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adınız</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Adınız"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-posta Adresi</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="ornek@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daire Bilgisi</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <Home className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={`${user?.apartment?.building?.name || "Apartman"}, Daire ${user?.apartment?.number || "?"}`}
                      disabled
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aile Üye Sayısı</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <UsersIcon className="w-4 h-4" />
                    </span>
                    <input
                      type="number"
                      value={user?.family_size || 1}
                      disabled
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ABONELİK YÖNETİMİ */}
          <div className="bg-white rounded-xl shadow border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                Aboneliklerim
              </h2>
              <button
                onClick={() => {
                  setShowAddSubscription(true);
                  setEditingSubscriptionId(null);
                  setSubscriptionForm({
                    company_id: "",
                    subscriber_no: "",
                    utility_type: "water",
                  });
                  setShowContractInfo(false);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Abonelik
              </button>
            </div>

            {userSubscriptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600 mb-4">Henüz aboneliğiniz bulunmuyor.</p>
                <button
                  onClick={() => setShowAddSubscription(true)}
                  className="px-6 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                >
                  İlk Aboneliğinizi Ekleyin
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userSubscriptions.map((subscription) => {
                  const company = subscription.companies?.[0];
                  return (
                    <div
                      key={subscription.id}
                      className={`border rounded-lg p-4 ${
                        subscription.is_active ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div
                            className={`p-2 rounded-lg mr-3 ${
                              subscription.utility_type === "water"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-yellow-100 text-yellow-600"
                            }`}
                          >
                            {subscription.utility_type === "water" ? (
                              <Droplets className="w-5 h-5" />
                            ) : (
                              <Zap className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800">
                              {company?.name || "Bilinmeyen Şirket"}
                              {company?.is_contracted && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  🤝 Sözleşmeli
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {subscription.utility_type === "water" ? "💧 Su" : "⚡ Elektrik"}
                              <span className="mx-2">•</span>
                              Abone No: {subscription.subscriber_no}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditSubscription(subscription)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleSubscription(subscription.id, subscription.is_active)}
                            className={`p-2 rounded-lg ${
                              subscription.is_active
                                ? "text-yellow-600 hover:bg-yellow-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={subscription.is_active ? "Pasif Yap" : "Aktif Yap"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubscription(subscription.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={`px-2 py-1 rounded ${
                            subscription.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {subscription.is_active ? "✅ Aktif" : "⏸️ Pasif"}
                        </span>
                        <span className="text-gray-500">{company?.code || "KOD"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* YENİ ABONELİK FORMU */}
            {showAddSubscription && (
              <div className="mt-6 p-4 border border-green-300 rounded-lg bg-green-50">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-green-600" />
                  {editingSubscriptionId ? "Aboneliği Düzenle" : "Yeni Abonelik Ekle"}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hizmet Tipi</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="water"
                          checked={subscriptionForm.utility_type === "water"}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              utility_type: e.target.value as "water" | "electricity",
                            })
                          }
                          className="mr-2"
                        />
                        <Droplets className="w-4 h-4 text-blue-500 mr-1" />
                        Su
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="electricity"
                          checked={subscriptionForm.utility_type === "electricity"}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              utility_type: e.target.value as "water" | "electricity",
                            })
                          }
                          className="mr-2"
                        />
                        <Zap className="w-4 h-4 text-yellow-500 mr-1" />
                        Elektrik
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Şirket *</label>
                    <select
                      value={subscriptionForm.company_id}
                      onChange={(e) => {
                        const selectedCompany = allCompanies.find((c) => c.id === parseInt(e.target.value));
                        setSubscriptionForm({
                          ...subscriptionForm,
                          company_id: e.target.value,
                        });
                        setShowContractInfo(selectedCompany?.is_contracted || false);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Şirket seçin</option>
                      {allCompanies
                        .filter((company) =>
                          subscriptionForm.utility_type === "water"
                            ? company.utility_type === "water" || company.utility_type === "both"
                            : company.utility_type === "electricity" || company.utility_type === "both"
                        )
                        .map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name} ({company.code})
                            {company.is_contracted ? " ✅ Sözleşmeli" : ""}
                          </option>
                        ))}
                    </select>
                    
                    {/* SÖZLEŞME BİLGİSİ */}
                    {showContractInfo && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start">
                          <div className="bg-green-100 p-2 rounded-lg mr-3">
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              ></path>
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-green-800">Sözleşmeli Firma</p>
                            <p className="text-sm text-green-600 mt-1">
                              Bu firma ile otomatik veri entegrasyonumuz bulunuyor. Aboneliğiniz eklendiğinde{" "}
                              <strong>son 3 aylık tüketim verileriniz otomatik yüklenecektir.</strong>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Abone Numarası *</label>
                    <input
                      type="text"
                      value={subscriptionForm.subscriber_no}
                      onChange={(e) =>
                        setSubscriptionForm({
                          ...subscriptionForm,
                          subscriber_no: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Faturanızda yazan abone numarası"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleAddSubscription}
                      className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      {editingSubscriptionId ? "Güncelle" : "Kaydet"}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSubscription(false);
                        setEditingSubscriptionId(null);
                        setSubscriptionForm({
                          company_id: "",
                          subscriber_no: "",
                          utility_type: "water",
                        });
                        setShowContractInfo(false);
                      }}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ŞİFRE DEĞİŞTİRME */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Key className="w-5 h-5 mr-2 text-purple-600" />
              Şifre Değiştir
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre</label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="En az 6 karakter"
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre (Tekrar)</label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Şifreyi tekrar girin"
                />
              </div>

              <p className="text-sm text-gray-500">Şifreniz en az 6 karakter uzunluğunda olmalıdır.</p>
            </div>
          </div>

          {/* KAYDET BUTONU */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Tüm Değişiklikleri Kaydet
                </>
              )}
            </button>
          </div>
        </div>

        {/* SAĞ KOLON - İSTATİSTİKLER ve AYARLAR */}
        <div className="space-y-8">
          {/* İSTATİSTİKLER */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Building className="w-5 h-5 mr-2 text-blue-600" />
              Hesap Özeti
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Toplam Puan</span>
                <span className="font-bold text-green-600">{userStats.totalPoints}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Kayıt Sayısı</span>
                <span className="font-bold text-gray-800">{userStats.totalConsumptions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Aktif Abonelikler</span>
                <span className="font-bold text-blue-600">{userStats.activeSubscriptions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Katılma Tarihi</span>
                <span className="font-medium text-gray-800">{userStats.joinedDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Son Giriş</span>
                <span className="font-medium text-gray-800">{userStats.lastLogin}</span>
              </div>
            </div>
          </div>

          {/* BİLDİRİM AYARLARI */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-yellow-600" />
              Bildirimler
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">Sayaç Hatırlatmaları</div>
                  <div className="text-sm text-gray-500">Aylık sayaç girişi</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.notifications}
                    onChange={(e) => setForm({ ...form, notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">E-posta Raporları</div>
                  <div className="text-sm text-gray-500">Haftalık özet</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.marketingEmails}
                    onChange={(e) => setForm({ ...form, marketingEmails: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* HESAP İŞLEMLERİ */}
          <div className="bg-white rounded-xl shadow border p-6 border-red-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-600" />
              Hesap Güvenliği
            </h2>

            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 border-2 border-red-500 text-red-600 font-semibold rounded-lg hover:bg-red-50 transition"
              >
                Çıkış Yap
              </button>

              <button
                onClick={handleDeleteAccount}
                className="w-full px-4 py-3 bg-red-50 text-red-700 font-semibold rounded-lg hover:bg-red-100 transition flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hesabı Sil
              </button>

              <p className="text-xs text-gray-500 text-center">
                Hesap silme tüm verilerinizi kalıcı olarak silecektir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}