// app/consumption/page.tsx - YENİ VERSİYON
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Droplets, 
  Zap, 
  Calendar, 
  ArrowLeft, 
  Save,
  History,
  TrendingUp,
  Building,
  Users,
  AlertCircle,
  PlusCircle,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/app/components/shared/LoadingSpinner";

interface UserSubscription {
  id: number;
  company_id: number;
  subscriber_no: string;
  utility_type: "water" | "electricity";
  is_active: boolean;
  companies: {
    id: number;
    name: string;
    code: string;
    utility_type: string;
    is_contracted?: boolean;
  }[];
}

interface Consumption {
  id: number;
  subscription_id: number;
  water_amount: number | null;
  electricity_amount: number | null;
  month: number;
  year: number;
  created_at: string;
}

export default function ConsumptionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State'ler
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<number | null>(null);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  
  // Form state
  const [form, setForm] = useState({
    subscription_id: "",
    counter_value: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    note: ""
  });

  useEffect(() => {
    checkAuth();
    fetchUserData();
  }, []);

  const checkAuth = () => {
    const userData = localStorage.getItem("ekoakort_user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
  };

  const fetchUserData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("ekoakort_user") || "{}");

      // 1. Kullanıcının aboneliklerini getir
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
        .eq("user_id", userData.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (subscriptions) {
        const formattedSubscriptions: UserSubscription[] = subscriptions.map((sub: any) => ({
          id: sub.id,
          company_id: sub.company_id,
          subscriber_no: sub.subscriber_no,
          utility_type: sub.utility_type,
          is_active: sub.is_active,
          companies: Array.isArray(sub.companies) ? sub.companies : [sub.companies]
        }));

        setUserSubscriptions(formattedSubscriptions);
        
        if (formattedSubscriptions.length > 0) {
          setSelectedSubscription(formattedSubscriptions[0].id);
          setForm(prev => ({ ...prev, subscription_id: formattedSubscriptions[0].id.toString() }));
          
          // 2. Seçilen aboneliğin geçmiş tüketimlerini getir
          await fetchConsumptions(formattedSubscriptions[0].id);
        }
      }
    } catch (error) {
      console.error("Veri yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumptions = async (subscriptionId: number) => {
    try {
      const { data } = await supabase
        .from("consumptions")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setConsumptions(data as Consumption[]);
      }
    } catch (error) {
      console.error("Tüketim kayıtları yüklenemedi:", error);
    }
  };

  const handleSubscriptionChange = (subscriptionId: number) => {
    setSelectedSubscription(subscriptionId);
    setForm(prev => ({ ...prev, subscription_id: subscriptionId.toString() }));
    fetchConsumptions(subscriptionId);
  };

  const handleSubmit = async () => {
    if (!form.subscription_id || !form.counter_value) {
      alert("Lütfen abonelik seçin ve sayaç değerini girin");
      return;
    }

    setSaving(true);

    try {
      const userData = JSON.parse(localStorage.getItem("ekoakort_user") || "{}");
      const subscriptionId = parseInt(form.subscription_id);
      const currentCounter = parseFloat(form.counter_value);

      // Seçilen aboneliği bul
      const subscription = userSubscriptions.find(s => s.id === subscriptionId);
      if (!subscription) throw new Error("Abonelik bulunamadı");

      // Önceki kaydı bul
      const { data: previousRecords } = await supabase
        .from("consumptions")
        .select("*")
        .eq("subscription_id", subscriptionId)
        .order("created_at", { ascending: false })
        .limit(1);

      let consumptionAmount = 0;
      let waterAmount = null;
      let electricityAmount = null;

      if (previousRecords?.[0]) {
        const prev = previousRecords[0];
        const prevAmount = subscription.utility_type === "water" 
          ? prev.water_amount 
          : prev.electricity_amount;
        
        consumptionAmount = currentCounter - (prevAmount || 0);
        
        if (consumptionAmount < 0) {
          consumptionAmount = currentCounter; // Negatif olmasın
        }
      } else {
        consumptionAmount = currentCounter; // İlk kayıt
      }

      // Utility tipine göre doğru alana kaydet
      if (subscription.utility_type === "water") {
        waterAmount = consumptionAmount;
      } else {
        electricityAmount = consumptionAmount;
      }

      const now = new Date();
      const newRecord = {
        user_id: userData.id,
        subscription_id: subscriptionId,
        water_amount: waterAmount,
        electricity_amount: electricityAmount,
        month: form.month,
        year: form.year,
        created_at: now.toISOString(),
        note: form.note || null,
        monthly_points: 10 // Temel kayıt puanı
      };

      const { error } = await supabase.from("consumptions").insert([newRecord]);

      if (error) throw error;

      // Başarı mesajı
      const company = subscription.companies?.[0];
      const utilityType = subscription.utility_type === "water" ? "Su" : "Elektrik";
      const unit = subscription.utility_type === "water" ? "m³" : "kWh";

      let message = `✅ ${utilityType} sayacı kaydedildi!\n`;
      message += `Şirket: ${company?.name || "Bilinmeyen"}\n`;
      message += `Sayaç: ${currentCounter} ${unit}\n`;
      
      if (previousRecords?.[0]) {
        message += `Son kayıttan bu yana: ${consumptionAmount.toFixed(2)} ${unit}\n`;
      }
      
      message += `Kazanılan puan: 10\n`;
      
      if (company?.is_contracted) {
        message += `\n🤝 ${company.name} sözleşmeli firma olduğu için veriler otomatik senkronize edildi.`;
      }

      alert(message);

      // Formu temizle
      setForm(prev => ({
        ...prev,
        counter_value: "",
        note: ""
      }));

      // Tüketim kayıtlarını yenile
      await fetchConsumptions(subscriptionId);

    } catch (error: any) {
      console.error("Kayıt hatası:", error);
      alert("Kayıt eklenirken hata: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  const getCurrentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => getCurrentYear - 1 + i);

  if (loading) {
    return <LoadingSpinner message="Veriler yükleniyor..." />;
  }

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
            <h1 className="text-2xl font-bold text-gray-800">
              Detaylı Tüketim Kaydı
            </h1>
            <p className="text-gray-600">
              <Building className="w-4 h-4 inline mr-1" />
              {user?.apartment?.building?.name || "Apartmanınız"}, Daire {user?.apartment?.number}
              <span className="mx-2">•</span>
              <Users className="w-4 h-4 inline mr-1" />
              {user?.family_size || 1} kişilik aile
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SOL KOLON: ABONELİK SEÇİMİ ve FORM */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <PlusCircle className="w-5 h-5 mr-2 text-green-600" />
              Yeni Sayaç Kaydı Ekle
            </h2>

            {userSubscriptions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-700 mb-3">Henüz aboneliğiniz bulunmuyor.</p>
                <button
                  onClick={() => router.push("/profile")}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 transition"
                >
                  📝 Profile Git ve Abonelik Ekle
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ABONELİK SEÇİMİ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Hangi Abonelik için Kayıt Yapıyorsunuz? *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {userSubscriptions.map((subscription) => {
                      const company = subscription.companies?.[0];
                      const isSelected = selectedSubscription === subscription.id;
                      
                      return (
                        <button
                          key={subscription.id}
                          onClick={() => handleSubscriptionChange(subscription.id)}
                          className={`p-4 rounded-lg border-2 text-left transition ${
                            isSelected
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-3 ${
                              subscription.utility_type === "water"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-yellow-100 text-yellow-600"
                            }`}>
                              {subscription.utility_type === "water" ? (
                                <Droplets className="w-5 h-5" />
                              ) : (
                                <Zap className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1">
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
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TARİH SEÇİMİ */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ay *
                    </label>
                    <select
                      value={form.month}
                      onChange={(e) =>
                        setForm({ ...form, month: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yıl *
                    </label>
                    <select
                      value={form.year}
                      onChange={(e) =>
                        setForm({ ...form, year: parseInt(e.target.value) })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SAYAÇ DEĞERİ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sayaç Değeri *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={form.counter_value}
                      onChange={(e) =>
                        setForm({ ...form, counter_value: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pl-12"
                      placeholder={
                        selectedSubscription 
                          ? userSubscriptions.find(s => s.id === selectedSubscription)?.utility_type === "water"
                            ? "Örn: 1250.50 (m³)"
                            : "Örn: 4500.75 (kWh)"
                          : "Sayaç değeri"
                      }
                      required
                    />
                    <div className="absolute left-3 top-3.5">
                      {selectedSubscription ? (
                        userSubscriptions.find(s => s.id === selectedSubscription)?.utility_type === "water" ? (
                          <Droplets className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Zap className="w-5 h-5 text-yellow-500" />
                        )
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Faturanızda yazan veya sayaç üzerinde okuduğunuz değeri girin
                  </p>
                </div>

                {/* NOT (OPSİYONEL) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Not (Opsiyonel)
                  </label>
                  <textarea
                    value={form.note}
                    onChange={(e) =>
                      setForm({ ...form, note: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Örn: Bu ay tatildeydik, tüketim düşük"
                    rows={3}
                  />
                </div>

                {/* KAYDET BUTONU */}
                <button
                  onClick={handleSubmit}
                  disabled={saving || !form.subscription_id || !form.counter_value}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Kaydı Ekle (+10 puan)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* SON KAYITLAR */}
          {consumptions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <History className="w-5 h-5 mr-2 text-blue-600" />
                Son Kayıtlar
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Tarih</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Değer</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Tüketim</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Ay/Yıl</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">Puan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumptions.map((record) => {
                      const subscription = userSubscriptions.find(s => s.id === record.subscription_id);
                      const company = subscription?.companies?.[0];
                      const utilityType = subscription?.utility_type;
                      
                      return (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            {new Date(record.created_at).toLocaleDateString("tr-TR")}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {utilityType === "water" ? (
                                <Droplets className="w-4 h-4 text-blue-500 mr-2" />
                              ) : (
                                <Zap className="w-4 h-4 text-yellow-500 mr-2" />
                              )}
                              <span className="font-medium">
                                {utilityType === "water" 
                                  ? `${record.water_amount?.toFixed(2)} m³`
                                  : `${record.electricity_amount?.toFixed(2)} kWh`
                                }
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {company?.name}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {months[record.month - 1]} {record.year}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                              +10
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* SAĞ KOLON: BİLGİ ve İSTATİSTİKLER */}
        <div className="space-y-6">
          {/* İSTATİSTİK KARTI */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              İstatistikleriniz
            </h3>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-blue-100">
                <div className="text-sm text-gray-500 mb-1">Toplam Kayıt</div>
                <div className="text-2xl font-bold text-blue-600">
                  {consumptions.length}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-100">
                <div className="text-sm text-gray-500 mb-1">Kazanılan Puan</div>
                <div className="text-2xl font-bold text-green-600">
                  {consumptions.length * 10}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-yellow-100">
                <div className="text-sm text-gray-500 mb-1">Aktif Abonelikler</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {userSubscriptions.length}
                </div>
              </div>
            </div>
          </div>

          {/* NASIL ÇALIŞIR? */}
          <div className="bg-white rounded-2xl shadow border p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Nasıl Çalışır?
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  1
                </div>
                <div>
                  <div className="font-medium text-gray-800">Aboneliğinizi seçin</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Hangi şirket için kayıt yapacağınızı seçin
                  </div>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  2
                </div>
                <div>
                  <div className="font-medium text-gray-800">Sayaç değerini girin</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Faturanızdaki veya sayaçtaki değeri girin
                  </div>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  3
                </div>
                <div>
                  <div className="font-medium text-gray-800">Puan kazanın</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Her kayıt 10 puan kazandırır
                  </div>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-green-100 text-green-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  4
                </div>
                <div>
                  <div className="font-medium text-gray-800">Tasarrufunuzu takip edin</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Dashboard'da geçen aya göre tasarrufunuzu görün
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* İPUCU KARTI */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
              📅 Önemli İpuçları
            </h3>
            
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Her ay <strong>aynı gün</strong> sayaç okumanızı yapın</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Değeri faturanızdan veya sayaçtan alın</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Sözleşmeli firmalar otomatik veri aktarır</span>
              </li>
              <li className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <span>Düzenli kayıt yapın, daha çok puan kazanın</span>
              </li>
            </ul>
            
            <div className="mt-6 pt-4 border-t border-yellow-200">
              <div className="text-center">
                <div className="text-sm text-gray-500">Aylık Hedefiniz:</div>
                <div className="text-lg font-bold text-green-600 mt-1">
                  Her abonelik için 1 kayıt
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}