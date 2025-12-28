// app/tips/page.tsx - TAMAMEN YENİ
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Droplets,
  Zap,
  Globe,
  Filter,
  Search,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Sparkles,
  Target,
  BarChart3,
  RefreshCw,
  Star,
  Flame,
  Leaf,
  Zap as ZapIcon,
  Droplets as DropletsIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "@/app/components/shared/LoadingSpinner";

// Tip tanımlamaları
interface Tip {
  id: number;
  title: string;
  content: string;
  category: string;
  utility_type: "water" | "electricity" | "general";
  difficulty: "easy" | "medium" | "hard";
  points_reward: number;
  estimated_savings: number;
  created_at: string;
}

interface UserTip {
  id: number;
  tip_id: number;
  applied_at: string;
  earned_points: number;
}

export default function TipsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State'ler
  const [allTips, setAllTips] = useState<Tip[]>([]);
  const [filteredTips, setFilteredTips] = useState<Tip[]>([]);
  const [appliedTips, setAppliedTips] = useState<UserTip[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sekmeler
  const [activeTab, setActiveTab] = useState<
    "all" | "water" | "electricity" | "general" | "applied"
  >("all");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "all" | "easy" | "medium" | "hard"
  >("all");
  const [sortBy, setSortBy] = useState<"newest" | "points" | "savings">(
    "newest"
  );

  // İstatistikler
  const [stats, setStats] = useState({
    totalTips: 0,
    appliedTips: 0,
    totalPointsEarned: 0,
    totalSavings: 0,
    monthlyRemaining: 3,
  });

  useEffect(() => {
    checkAuth();
    fetchTipsData();
  }, []);

  const checkAuth = () => {
    const userData = localStorage.getItem("ekoakort_user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
  };

  const fetchTipsData = async () => {
    try {
      setRefreshing(true);
      const userData = JSON.parse(
        localStorage.getItem("ekoakort_user") || "{}"
      );

      // 1. Tüm önerileri getir
      const { data: tips } = await supabase
        .from("tips")
        .select("*")
        .is("user_id", null) // Genel öneriler
        .order("created_at", { ascending: false });

      if (tips) {
        setAllTips(tips as Tip[]);
        setFilteredTips(tips as Tip[]);
        setStats((prev) => ({ ...prev, totalTips: tips.length }));
      }

      // 2. Kullanıcının uyguladığı önerileri getir
      const { data: userAppliedTips } = await supabase
        .from("user_applied_tips")
        .select("*")
        .eq("user_id", userData.id);

      if (userAppliedTips) {
        setAppliedTips(userAppliedTips);

        // Toplam kazanılan puanı hesapla
        const totalPoints = userAppliedTips.reduce(
          (sum, tip) => sum + tip.earned_points,
          0
        );
        setStats((prev) => ({
          ...prev,
          appliedTips: userAppliedTips.length,
          totalPointsEarned: totalPoints,
          monthlyRemaining: Math.max(0, 3 - (userData.monthly_tips_used || 0)),
        }));
      }

      // 3. Toplam tasarrufu hesapla
      if (tips && userAppliedTips) {
        const appliedTipIds = userAppliedTips.map((t) => t.tip_id);
        const appliedTipDetails = tips.filter((tip) =>
          appliedTipIds.includes(tip.id)
        );
        const totalSavings = appliedTipDetails.reduce(
          (sum, tip) => sum + (tip.estimated_savings || 0),
          0
        );
        setStats((prev) => ({ ...prev, totalSavings }));
      }
    } catch (error) {
      console.error("Öneriler yüklenemedi:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtreleme fonksiyonu
  useEffect(() => {
    let filtered = [...allTips];

    // Sekme filtresi
    if (activeTab !== "all") {
      if (activeTab === "applied") {
        const appliedTipIds = appliedTips.map((t) => t.tip_id);
        filtered = filtered.filter((tip) => appliedTipIds.includes(tip.id));
      } else {
        filtered = filtered.filter((tip) => tip.utility_type === activeTab);
      }
    }

    // Zorluk filtresi
    if (difficultyFilter !== "all") {
      filtered = filtered.filter((tip) => tip.difficulty === difficultyFilter);
    }

    // Arama filtresi
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tip) =>
          tip.title.toLowerCase().includes(query) ||
          tip.content.toLowerCase().includes(query) ||
          tip.utility_type.toLowerCase().includes(query)
      );
    }

    // Sıralama
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "points":
          return (b.points_reward || 0) - (a.points_reward || 0);
        case "savings":
          return (b.estimated_savings || 0) - (a.estimated_savings || 0);
        case "newest":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    setFilteredTips(filtered);
  }, [allTips, activeTab, difficultyFilter, searchQuery, sortBy, appliedTips]);

  const handleApplyTip = async (tipId: number) => {
    try {
      const userData = JSON.parse(
        localStorage.getItem("ekoakort_user") || "{}"
      );

      // 1. Aylık limit kontrolü
      if (userData.monthly_tips_used >= 3) {
        alert(
          "❌ Aylık öneri limitiniz doldu! Her ay en fazla 3 öneri uygulayabilirsiniz."
        );
        return;
      }

      // 2. Bu öneriyi daha önce uygulamış mı?
      const alreadyApplied = appliedTips.find((t) => t.tip_id === tipId);
      if (alreadyApplied) {
        alert("⚠️ Bu öneriyi zaten uygulamışsınız!");
        return;
      }

      // 3. Öneri bilgilerini al
      const tip = allTips.find((t) => t.id === tipId);
      if (!tip) {
        alert("Öneri bulunamadı!");
        return;
      }

      // 4. Kullanıcının aylık öneri sayısını artır
      const newMonthlyTipsUsed = (userData.monthly_tips_used || 0) + 1;

      await supabase
        .from("users")
        .update({
          monthly_tips_used: newMonthlyTipsUsed,
          last_tip_reset: new Date().toISOString().split("T")[0],
        })
        .eq("id", userData.id);

      // 5. user_applied_tips tablosuna kaydet
      const pointsEarned = tip.points_reward || 10;

      const { data: newAppliedTip } = await supabase
        .from("user_applied_tips")
        .insert([
          {
            user_id: userData.id,
            tip_id: tipId,
            earned_points: pointsEarned,
          },
        ])
        .select()
        .single();

      if (newAppliedTip) {
        setAppliedTips((prev) => [...prev, newAppliedTip]);
      }

      // 6. Toplam puanı güncelle
      const newTotalPoints = (userData.total_points || 0) + pointsEarned;
      await supabase
        .from("users")
        .update({ total_points: newTotalPoints })
        .eq("id", userData.id);

      // 7. Local storage'ı güncelle
      localStorage.setItem(
        "ekoakort_user",
        JSON.stringify({
          ...userData,
          monthly_tips_used: newMonthlyTipsUsed,
          total_points: newTotalPoints,
        })
      );

      // 8. İstatistikleri güncelle
      setStats((prev) => ({
        ...prev,
        appliedTips: prev.appliedTips + 1,
        totalPointsEarned: prev.totalPointsEarned + pointsEarned,
        totalSavings: prev.totalSavings + (tip.estimated_savings || 0),
        monthlyRemaining: Math.max(0, 3 - newMonthlyTipsUsed),
      }));

      // 9. Kullanıcıyı güncelle
      setUser((prev : any) => ({
        ...prev,
        monthly_tips_used: newMonthlyTipsUsed,
        total_points: newTotalPoints,
      }));

      alert(
        `✅ "${
          tip.title
        }" önerisi uygulandı!\n🎉 ${pointsEarned} puan kazandınız!\n📊 Aylık kalan öneri hakkınız: ${
          3 - newMonthlyTipsUsed
        }`
      );

      // Verileri yenile
      fetchTipsData();
    } catch (error) {
      console.error("Öneri uygulanamadı:", error);
      alert("Öneri uygulanırken bir hata oluştu.");
    }
  };

  const handleUndoApply = async (tipId: number) => {
    if (
      !confirm(
        "Bu öneriyi uygulanmamış olarak işaretlemek istediğinize emin misiniz? Kazandığınız puan geri alınacaktır."
      )
    ) {
      return;
    }

    try {
      const userData = JSON.parse(
        localStorage.getItem("ekoakort_user") || "{}"
      );

      // 1. Uygulanan öneriyi bul
      const appliedTip = appliedTips.find((t) => t.tip_id === tipId);
      if (!appliedTip) return;

      // 2. user_applied_tips tablosundan sil
      await supabase.from("user_applied_tips").delete().eq("id", appliedTip.id);

      // 3. Kullanıcının aylık öneri sayısını azalt
      const newMonthlyTipsUsed = Math.max(
        0,
        (userData.monthly_tips_used || 0) - 1
      );

      await supabase
        .from("users")
        .update({ monthly_tips_used: newMonthlyTipsUsed })
        .eq("id", userData.id);

      // 4. Toplam puanı güncelle
      const tip = allTips.find((t) => t.id === tipId);
      const pointsLost = appliedTip.earned_points;
      const newTotalPoints = Math.max(
        0,
        (userData.total_points || 0) - pointsLost
      );

      await supabase
        .from("users")
        .update({ total_points: newTotalPoints })
        .eq("id", userData.id);

      // 5. Local storage'ı güncelle
      localStorage.setItem(
        "ekoakort_user",
        JSON.stringify({
          ...userData,
          monthly_tips_used: newMonthlyTipsUsed,
          total_points: newTotalPoints,
        })
      );

      // 6. State'leri güncelle
      setAppliedTips((prev) => prev.filter((t) => t.tip_id !== tipId));
      setStats((prev) => ({
        ...prev,
        appliedTips: prev.appliedTips - 1,
        totalPointsEarned: prev.totalPointsEarned - pointsLost,
        totalSavings: prev.totalSavings - (tip?.estimated_savings || 0),
        monthlyRemaining: prev.monthlyRemaining + 1,
      }));

      setUser((prev :any) => ({
        ...prev,
        monthly_tips_used: newMonthlyTipsUsed,
        total_points: newTotalPoints,
      }));

      alert("✅ Öneri uygulanmamış olarak işaretlendi. Puan geri alındı.");

      // Verileri yenile
      fetchTipsData();
    } catch (error) {
      console.error("Öneri geri alınamadı:", error);
      alert("İşlem sırasında bir hata oluştu.");
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getUtilityColor = (utility: string) => {
    switch (utility) {
      case "water":
        return "bg-blue-100 text-blue-700";
      case "electricity":
        return "bg-yellow-100 text-yellow-700";
      case "general":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getUtilityIcon = (utility: string) => {
    switch (utility) {
      case "water":
        return <DropletsIcon className="w-4 h-4" />;
      case "electricity":
        return <ZapIcon className="w-4 h-4" />;
      case "general":
        return <Globe className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const refreshData = () => {
    fetchTipsData();
  };

  if (loading) {
    return <LoadingSpinner message="Öneriler yükleniyor..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* BAŞLIK BÖLÜMÜ */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push("/dashboard")}
              className="mr-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Tasarruf Önerileri Kütüphanesi
              </h1>
              <p className="text-gray-600">
                Size özel tasarruf ipuçları, uygulayarak puan kazanın
              </p>
            </div>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
            title="Yenile"
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* İSTATİSTİK BANNER */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">
                {stats.totalTips}
              </div>
              <div className="text-gray-600">Toplam Öneri</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.appliedTips}
              </div>
              <div className="text-gray-600">Uygulanan</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {stats.totalPointsEarned}
              </div>
              <div className="text-gray-600">Kazanılan Puan</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.monthlyRemaining}/3
              </div>
              <div className="text-gray-600">Aylık Kalan Hak</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Target className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-gray-800">Hedefiniz:</span>
                <span className="ml-2 text-green-600 font-bold">
                  %{stats.totalSavings} toplam tasarruf
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {stats.monthlyRemaining > 0
                  ? `⚡ ${stats.monthlyRemaining} öneri daha uygulayabilirsiniz!`
                  : "✅ Aylık limitinizi doldurdunuz"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FİLTRE VE ARAMA BÖLÜMÜ */}
      <div className="bg-white rounded-xl shadow border p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Önerilerde ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Tüm Zorluklar</option>
                <option value="easy">Kolay</option>
                <option value="medium">Orta</option>
                <option value="hard">Zor</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="newest">En Yeni</option>
                <option value="points">En Çok Puan</option>
                <option value="savings">En Çok Tasarruf</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEKMELER */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "all"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Lightbulb className="w-4 h-4 inline mr-2" />
            Tümü ({allTips.length})
          </button>

          <button
            onClick={() => setActiveTab("water")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "water"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Droplets className="w-4 h-4 inline mr-2" />
            Su Tasarrufu (
            {allTips.filter((t) => t.utility_type === "water").length})
          </button>

          <button
            onClick={() => setActiveTab("electricity")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "electricity"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Elektrik Tasarrufu (
            {allTips.filter((t) => t.utility_type === "electricity").length})
          </button>

          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "general"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Genel ({allTips.filter((t) => t.utility_type === "general").length})
          </button>

          <button
            onClick={() => setActiveTab("applied")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === "applied"
                ? "bg-purple-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Uygulanan ({stats.appliedTips})
          </button>
        </div>

        {/* AKTİF FİLTRE BİLGİSİ */}
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="text-gray-600">Aktif filtreler:</span>
          {activeTab !== "all" && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilityColor(
                activeTab === "applied" ? "general" : activeTab
              )}`}
            >
              {activeTab === "applied"
                ? "Uygulanan"
                : activeTab === "water"
                ? "Su"
                : activeTab === "electricity"
                ? "Elektrik"
                : "Genel"}
            </span>
          )}
          {difficultyFilter !== "all" && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                difficultyFilter
              )}`}
            >
              {difficultyFilter === "easy"
                ? "Kolay"
                : difficultyFilter === "medium"
                ? "Orta"
                : "Zor"}
            </span>
          )}
          {searchQuery && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              "{searchQuery}"
            </span>
          )}
          <span className="text-gray-500 ml-auto">
            {filteredTips.length} öneri bulundu
          </span>
        </div>
      </div>

      {/* ÖNERİ LİSTESİ */}
      <div className="mb-8">
        {filteredTips.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow border">
            <Lightbulb className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              {activeTab === "applied"
                ? "Henüz öneri uygulamadınız"
                : "Öneri bulunamadı"}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === "applied"
                ? "Önerileri uygulayarak puan kazanmaya başlayın!"
                : "Filtrelerinizi değiştirmeyi deneyin."}
            </p>
            {activeTab === "applied" && (
              <button
                onClick={() => setActiveTab("all")}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                Önerilere Göz At
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTips.map((tip) => {
              const isApplied = appliedTips.some((t) => t.tip_id === tip.id);
              const appliedTip = appliedTips.find((t) => t.tip_id === tip.id);

              return (
                <div
                  key={tip.id}
                  className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
                    isApplied ? "border-green-300" : "border-gray-200"
                  } hover:shadow-xl transition-all duration-300`}
                >
                  {/* Kart Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div
                          className={`p-2 rounded-lg mr-3 ${getUtilityColor(
                            tip.utility_type
                          )}`}
                        >
                          {getUtilityIcon(tip.utility_type)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg line-clamp-2">
                            {tip.title}
                          </h3>
                          <div className="flex items-center mt-1">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(
                                tip.difficulty
                              )}`}
                            >
                              {tip.difficulty === "easy"
                                ? "Kolay"
                                : tip.difficulty === "medium"
                                ? "Orta"
                                : "Zor"}
                            </span>
                            {isApplied && (
                              <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                ✅ Uygulandı
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isApplied ? (
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            +{appliedTip?.earned_points || 10}
                          </div>
                          <div className="text-xs text-gray-500">puan</div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="text-lg font-bold text-yellow-600">
                            +{tip.points_reward || 10}
                          </div>
                          <div className="text-xs text-gray-500">puan</div>
                        </div>
                      )}
                    </div>

                    {/* Öneri İçeriği */}
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {tip.content}
                    </p>

                    {/* İstatistikler */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center text-blue-700 mb-1">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Tasarruf</span>
                        </div>
                        <div className="text-xl font-bold text-blue-800">
                          %{tip.estimated_savings || 5}
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <div className="flex items-center text-yellow-700 mb-1">
                          <Award className="w-4 h-4 mr-2" />
                          <span className="text-sm font-medium">Puan</span>
                        </div>
                        <div className="text-xl font-bold text-yellow-800">
                          {tip.points_reward || 10}
                        </div>
                      </div>
                    </div>

                    {/* Butonlar */}
                    {isApplied ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            Uygulandı:{" "}
                            {new Date(
                              appliedTip?.applied_at || tip.created_at
                            ).toLocaleDateString("tr-TR")}
                          </span>
                          <span className="font-medium text-green-600">
                            {appliedTip?.earned_points || 10} puan kazandınız
                          </span>
                        </div>
                        <button
                          onClick={() => handleUndoApply(tip.id)}
                          className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Geri Al
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyTip(tip.id)}
                        disabled={stats.monthlyRemaining <= 0}
                        className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center ${
                          stats.monthlyRemaining > 0
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {stats.monthlyRemaining > 0 ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Bu Öneriyi Uygula
                          </>
                        ) : (
                          "Aylık Limit Doldu"
                        )}
                      </button>
                    )}
                  </div>

                  {/* Kart Footer */}
                  <div className="px-5 py-3 bg-gray-50 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {tip.utility_type === "water"
                          ? "💧 Su"
                          : tip.utility_type === "electricity"
                          ? "⚡ Elektrik"
                          : "🌍 Genel"}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(tip.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BİLGİLENDİRME BÖLÜMÜ */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 border border-blue-200 rounded-2xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Sparkles className="w-6 h-6 mr-3 text-blue-600" />
              Öneri Sistemi Nasıl Çalışır?
            </h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  1
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Aylık 3 öneri hakkınız var
                  </span>
                  <p className="text-sm mt-1">
                    Her ay en fazla 3 öneri uygulayarak puan kazanabilirsiniz.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  2
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Zorluk derecesine göre puan
                  </span>
                  <p className="text-sm mt-1">
                    Kolay öneriler 8-10 puan, orta 10-12 puan, zor öneriler
                    12-15 puan kazandırır.
                  </p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  3
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Tekrar uygulama yok
                  </span>
                  <p className="text-sm mt-1">
                    Bir öneriyi sadece bir kez uygulayabilirsiniz, tekrar puan
                    kazanamazsınız.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Target className="w-6 h-6 mr-3 text-green-600" />
              Strateji Önerileri
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-green-200">
                <div className="flex items-center mb-2">
                  <Star className="w-5 h-5 text-yellow-500 mr-2" />
                  <span className="font-medium text-gray-800">
                    Öncelikli Öneriler
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Önce <strong>kolay ve orta zorluktaki</strong> önerileri
                  uygulayın. Hızlı puan kazanmak için en etkili yoldur.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <Flame className="w-5 h-5 text-orange-500 mr-2" />
                  <span className="font-medium text-gray-800">
                    Tasarruf Odaklı Yaklaşım
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  En yüksek tasarruf yüzdesine sahip önerileri seçin. Hem puan
                  kazanın hem de faturalarınızı düşürün.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-purple-200">
                <div className="flex items-center mb-2">
                  <Leaf className="w-5 h-5 text-green-500 mr-2" />
                  <span className="font-medium text-gray-800">Süreklilik</span>
                </div>
                <p className="text-sm text-gray-600">
                  Her ay 3 öneriyi de mutlaka uygulayın. Sürekli puan kazanarak
                  liderlikte yükselin ve indirimlerinizi artırın.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-blue-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-800 mb-1">
                🎯 İndirim Kazanma Stratejisi
              </h4>
              <p className="text-gray-600 text-sm">
                Şirketler size <strong>bu ayki puanınıza göre indirim</strong>{" "}
                verir. Öneri uygulayarak aylık puanınızı artırın, daha yüksek
                indirimler kazanın!
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="inline-flex items-center bg-white px-4 py-2 rounded-lg border border-green-300">
                <Award className="w-5 h-5 text-yellow-500 mr-2" />
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Toplam Kazanım
                  </div>
                  <div className="font-bold text-green-600">
                    %{stats.totalSavings} tasarruf • {stats.totalPointsEarned}{" "}
                    puan
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ALT BİLGİ */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>
          Eko-Akort Öneri Sistemi | Her ay yeni öneriler eklenmektedir. Sürekli
          takipte kalın, daha fazla tasarruf edin! 💚
        </p>
      </div>
    </div>
  );
}
