// app/dashboard/page.tsx - YENİDEN DÜZENLENMİŞ
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Droplets,
  Zap,
  Trophy,
  TrendingUp,
  TrendingDown,
  Calendar,
  PlusCircle,
  Award,
  Users,
  Lightbulb,
  ChevronRight,
  CheckCircle,
  Building,
  Home,
  Clock,
  AlertCircle,
  CreditCard,
  Info,
  Sparkles,
  Target,
  Download,
  History,
  TrendingUp as TrendingUpIcon,
  BarChart3,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import LoadingSpinner from "../components/shared/LoadingSpinner";

// ==================== TİPLER ====================
interface DiscountTier {
  min_points: number;
  discount_percent: number;
  tier_name?: string;
}

interface Company {
  id: number;
  name: string;
  code: string;
  utility_type: string;
  discount_tiers: DiscountTier[];
  is_contracted?: boolean;
}

interface UserSubscription {
  id: number;
  company_id: number;
  subscriber_no: string;
  utility_type: "water" | "electricity";
  companies: Company[];
  is_active: boolean;
  created_at: string;
}

interface Consumption {
  id: number;
  subscription_id: number;
  user_id: number;
  water_amount: number | null;
  electricity_amount: number | null;
  month: number;
  year: number;
  created_at: string;
  monthly_points?: number;
}

interface Tip {
  id: number;
  title: string;
  content: string;
  category: string;
  estimated_savings: number;
  difficulty: string;
  utility_type?: "water" | "electricity" | "general";
  points_reward?: number;
  is_applied?: boolean;
}

interface LeaderboardEntry {
  id: number;
  name: string;
  apartment_number: string;
  total_points: number;
  monthly_points: number;
  rank: number;
  is_current_user?: boolean;
}

interface CompanyDiscount {
  company_id: number;
  company_name: string;
  company_code: string;
  utility_type: "water" | "electricity";
  is_contracted: boolean;
  monthly_points: number;
  total_points: number;
  current_discount: number;
  current_tier_name: string;
  next_tier_points: number;
  next_tier_discount: number;
  next_tier_name: string;
  progress_percent: number;
  discount_tiers: DiscountTier[];
}

interface MonthlyComparison {
  currentMonth: string;
  previousMonth: string;
  currentWater: number;
  previousWater: number;
  currentElectricity: number;
  previousElectricity: number;
  waterSavingsPercent: number;
  electricitySavingsPercent: number;
  waterSavedAmount: number;
  electricitySavedAmount: number;
}

// ==================== ANA KOMPONENT ====================
export default function DashboardPage() {
  const router = useRouter();

  // ==================== STATE'LER ====================
  // Kullanıcı ve Yükleme State'leri
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Abonelik ve Tüketim State'leri
  const [userSubscriptions, setUserSubscriptions] = useState<
    UserSubscription[]
  >([]);
  const [
    selectedSubscription,
    setSelectedSubscription,
  ] = useState<UserSubscription | null>(null);
  const [allConsumptions, setAllConsumptions] = useState<Consumption[]>([]);
  const [lastCounterValue, setLastCounterValue] = useState<number | null>(null);
  const [lastCounterDate, setLastCounterDate] = useState<string | null>(null);

  // Hızlı Kayıt State'i
  const [quickRecord, setQuickRecord] = useState({
    subscription_id: "",
    counter_value: "",
  });

  // Dashboard Veri State'leri
  const [personalizedTips, setPersonalizedTips] = useState<Tip[]>([]);
  const [buildingRanking, setBuildingRanking] = useState<LeaderboardEntry[]>(
    []
  );
  const [companyDiscounts, setCompanyDiscounts] = useState<CompanyDiscount[]>(
    []
  );
  const [
    monthlyComparison,
    setMonthlyComparison,
  ] = useState<MonthlyComparison | null>(null);

  // UI State'leri
  const [showInfoModal, setShowInfoModal] = useState<number | null>(null);

  // Dashboard İstatistikleri
  const [stats, setStats] = useState({
    waterSavingsPercent: 0,
    electricitySavingsPercent: 0,
    waterSavedAmount: 0,
    electricitySavedAmount: 0,
    monthlyPoints: 0,
    totalPoints: 0,
    lastMonthPoints: 0,
    buildingRank: 0,
    monthlyRank: 0,
    totalInBuilding: 0,
    currentMonthWater: 0,
    currentMonthElectricity: 0,
    previousMonthWater: 0,
    previousMonthElectricity: 0,
    comparedToAvg: "veri yetersiz",
    currentMonthName: "",
    previousMonthName: "",
  });

  // ==================== YARDIMCI FONKSİYONLAR ====================
  const getCurrentMonthYear = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
  };

  const formatMonthYear = (monthYear: string): string => {
    const [year, month] = monthYear.split("-").map(Number);
    const monthNames = [
      "Ocak",
      "Şubat",
      "Mart",
      "Nisan",
      "Mayıs",
      "Haziran",
      "Temmuz",
      "Ağustos",
      "Eylül",
      "Ekim",
      "Kasım",
      "Aralık",
    ];
    return `${monthNames[month - 1]} ${year}`;
  };

  const getComparisonStatus = (water: number, electricity: number): string => {
    const avg = (water + electricity) / 2;
    if (water === 0 && electricity === 0) return "veri yok";
    if (avg > 15) return "süper tasarruf! 🏆";
    if (avg > 8) return "harika gidiyorsun! ✨";
    if (avg > 3) return "iyi gidiyorsun 👍";
    if (avg > 0) return "küçük tasarruf ✓";
    if (avg > -5) return "neredeyse aynı ↔️";
    if (avg > -10) return "biraz fazla kullanmışsın ⚠️";
    return "dikkat! fazla kullanım var 🔴";
  };

  const getDefaultDiscountTiers = (companyName: string): DiscountTier[] => {
    const defaults: Record<string, DiscountTier[]> = {
      İSKİ: [
        { min_points: 0, discount_percent: 0, tier_name: "Başlangıç" },
        { min_points: 50, discount_percent: 2, tier_name: "Tasarrufçu" },
        { min_points: 120, discount_percent: 5, tier_name: "Su Dostu" },
        { min_points: 250, discount_percent: 8, tier_name: "Eko Elçisi" },
        { min_points: 500, discount_percent: 12, tier_name: "Su Kahramanı" },
      ],
      Aydem: [
        { min_points: 0, discount_percent: 0, tier_name: "Başlangıç" },
        { min_points: 40, discount_percent: 1, tier_name: "Tasarrufçu" },
        { min_points: 100, discount_percent: 3, tier_name: "Enerji Dostu" },
        { min_points: 200, discount_percent: 6, tier_name: "Eko Champion" },
        { min_points: 400, discount_percent: 10, tier_name: "Enerji Lideri" },
      ],
      Enerjisa: [
        { min_points: 0, discount_percent: 0, tier_name: "Başlangıç" },
        { min_points: 60, discount_percent: 2, tier_name: "Tasarrufçu" },
        { min_points: 150, discount_percent: 5, tier_name: "Eko Gönüllü" },
        { min_points: 300, discount_percent: 9, tier_name: "Eko Lider" },
        { min_points: 600, discount_percent: 14, tier_name: "Eko Visioner" },
      ],
      TESKİ: [
        { min_points: 0, discount_percent: 0, tier_name: "Başlangıç" },
        { min_points: 80, discount_percent: 3, tier_name: "Tasarrufçu" },
        { min_points: 200, discount_percent: 6, tier_name: "Su Koruyucusu" },
        { min_points: 400, discount_percent: 10, tier_name: "Eko Champion" },
        { min_points: 800, discount_percent: 15, tier_name: "Su Elçisi" },
      ],
    };

    return (
      defaults[companyName] || [
        { min_points: 0, discount_percent: 0, tier_name: "Başlangıç" },
        { min_points: 100, discount_percent: 3, tier_name: "Tasarrufçu" },
        { min_points: 300, discount_percent: 6, tier_name: "Çevre Dostu" },
        { min_points: 600, discount_percent: 10, tier_name: "Eko Gönüllü" },
        { min_points: 1000, discount_percent: 15, tier_name: "Eko Lider" },
      ]
    );
  };

  // ==================== HESAPLAMA FONKSİYONLARI ====================
  const calculateMonthlyComparison = (
    consumptions: Consumption[],
    subscriptions: UserSubscription[]
  ): MonthlyComparison => {
    const monthlyLastValues: Record<
      string,
      Record<number, { water: number; electricity: number }>
    > = {};

    const sortedConsumptions = [...consumptions].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedConsumptions.forEach((cons) => {
      const date = new Date(cons.created_at);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

      if (!monthlyLastValues[monthYear]) {
        monthlyLastValues[monthYear] = {};
      }

      const subscription = subscriptions.find(
        (s) => s.id === cons.subscription_id
      );
      if (!subscription) return;

      if (!monthlyLastValues[monthYear][cons.subscription_id]) {
        monthlyLastValues[monthYear][cons.subscription_id] = {
          water: 0,
          electricity: 0,
        };
      }

      if (subscription.utility_type === "water") {
        monthlyLastValues[monthYear][cons.subscription_id].water =
          cons.water_amount || 0;
      } else {
        monthlyLastValues[monthYear][cons.subscription_id].electricity =
          cons.electricity_amount || 0;
      }
    });

    const sortedMonths = Object.keys(monthlyLastValues).sort((a, b) =>
      b.localeCompare(a)
    );

    if (sortedMonths.length < 2) {
      const currentMonth = sortedMonths[0] || getCurrentMonthYear();
      const [year, month] = currentMonth.split("-").map(Number);
      const prevMonth =
        month === 1
          ? `${year - 1}-12`
          : `${year}-${(month - 1).toString().padStart(2, "0")}`;

      return {
        currentMonth,
        previousMonth: prevMonth,
        currentWater: 0,
        previousWater: 0,
        currentElectricity: 0,
        previousElectricity: 0,
        waterSavingsPercent: 0,
        electricitySavingsPercent: 0,
        waterSavedAmount: 0,
        electricitySavedAmount: 0,
      };
    }

    const currentMonth = sortedMonths[0];
    const previousMonth = sortedMonths[1];

    let currentWaterConsumption = 0;
    let previousWaterConsumption = 0;
    let currentElectricityConsumption = 0;
    let previousElectricityConsumption = 0;

    // Su tüketimlerini hesapla
    Object.keys(monthlyLastValues[currentMonth] || {}).forEach((subId) => {
      const subscription = subscriptions.find((s) => s.id === parseInt(subId));
      if (subscription?.utility_type === "water") {
        const currentValue =
          monthlyLastValues[currentMonth][parseInt(subId)].water;
        const previousValue =
          monthlyLastValues[previousMonth]?.[parseInt(subId)]?.water || 0;
        if (previousValue > 0) {
          currentWaterConsumption += currentValue - previousValue;
        }
      }
    });

    Object.keys(monthlyLastValues[previousMonth] || {}).forEach((subId) => {
      const subscription = subscriptions.find((s) => s.id === parseInt(subId));
      if (subscription?.utility_type === "water") {
        const previousValue =
          monthlyLastValues[previousMonth][parseInt(subId)].water;
        const twoMonthsAgoValue = sortedMonths[2]
          ? monthlyLastValues[sortedMonths[2]]?.[parseInt(subId)]?.water || 0
          : 0;
        if (twoMonthsAgoValue > 0) {
          previousWaterConsumption += previousValue - twoMonthsAgoValue;
        }
      }
    });

    // Elektrik tüketimlerini hesapla
    Object.keys(monthlyLastValues[currentMonth] || {}).forEach((subId) => {
      const subscription = subscriptions.find((s) => s.id === parseInt(subId));
      if (subscription?.utility_type === "electricity") {
        const currentValue =
          monthlyLastValues[currentMonth][parseInt(subId)].electricity;
        const previousValue =
          monthlyLastValues[previousMonth]?.[parseInt(subId)]?.electricity || 0;
        if (previousValue > 0) {
          currentElectricityConsumption += currentValue - previousValue;
        }
      }
    });

    Object.keys(monthlyLastValues[previousMonth] || {}).forEach((subId) => {
      const subscription = subscriptions.find((s) => s.id === parseInt(subId));
      if (subscription?.utility_type === "electricity") {
        const previousValue =
          monthlyLastValues[previousMonth][parseInt(subId)].electricity;
        const twoMonthsAgoValue = sortedMonths[2]
          ? monthlyLastValues[sortedMonths[2]]?.[parseInt(subId)]
              ?.electricity || 0
          : 0;
        if (twoMonthsAgoValue > 0) {
          previousElectricityConsumption += previousValue - twoMonthsAgoValue;
        }
      }
    });

    let waterSavingsPercent = 0;
    let electricitySavingsPercent = 0;
    let waterSavedAmount = 0;
    let electricitySavedAmount = 0;

    if (previousWaterConsumption > 0 && currentWaterConsumption > 0) {
      waterSavedAmount = previousWaterConsumption - currentWaterConsumption;
      waterSavingsPercent = (waterSavedAmount / previousWaterConsumption) * 100;
    }

    if (
      previousElectricityConsumption > 0 &&
      currentElectricityConsumption > 0
    ) {
      electricitySavedAmount =
        previousElectricityConsumption - currentElectricityConsumption;
      electricitySavingsPercent =
        (electricitySavedAmount / previousElectricityConsumption) * 100;
    }

    waterSavingsPercent = Math.max(
      -100,
      Math.min(80, Math.round(waterSavingsPercent * 10) / 10)
    );
    electricitySavingsPercent = Math.max(
      -100,
      Math.min(80, Math.round(electricitySavingsPercent * 10) / 10)
    );

    return {
      currentMonth,
      previousMonth,
      currentWater: Math.round(currentWaterConsumption * 100) / 100,
      previousWater: Math.round(previousWaterConsumption * 100) / 100,
      currentElectricity: Math.round(currentElectricityConsumption * 100) / 100,
      previousElectricity:
        Math.round(previousElectricityConsumption * 100) / 100,
      waterSavingsPercent,
      electricitySavingsPercent,
      waterSavedAmount: Math.round(waterSavedAmount * 100) / 100,
      electricitySavedAmount: Math.round(electricitySavedAmount * 100) / 100,
    };
  };

  const calculateMonthlyPoints = (
    comparison: MonthlyComparison,
    consumptions: Consumption[]
  ): number => {
    let points = 0;

    if (comparison.waterSavingsPercent > 0) {
      points += comparison.waterSavingsPercent * 5;
    }
    if (comparison.electricitySavingsPercent > 0) {
      points += comparison.electricitySavingsPercent * 5;
    }

    if (comparison.waterSavingsPercent < 0) {
      points += comparison.waterSavingsPercent * 2;
    }
    if (comparison.electricitySavingsPercent < 0) {
      points += comparison.electricitySavingsPercent * 2;
    }

    const currentMonth = comparison.currentMonth;
    const currentMonthRecords = consumptions.filter((cons) => {
      const date = new Date(cons.created_at);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      return monthYear === currentMonth;
    }).length;

    points += currentMonthRecords * 3;

    const sortedConsumptions = [...consumptions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let streak = 0;
    for (let i = 0; i < Math.min(sortedConsumptions.length - 1, 3); i++) {
      const current = new Date(sortedConsumptions[i].created_at);
      const previous = new Date(sortedConsumptions[i + 1].created_at);
      const diffDays = Math.floor(
        (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays <= 35) streak++;
      else break;
    }

    points += streak * 5;
    return Math.max(0, Math.round(points));
  };

  // ==================== VERİ ÇEKME FONKSİYONLARI ====================
  const checkAuth = () => {
    const userData = localStorage.getItem("ekoakort_user");
    if (!userData) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(userData));
  };

  const fetchLastCounterValue = async (subscriptionId: number) => {
  try {
    const subscription = userSubscriptions.find((s) => s.id === subscriptionId);
    if (!subscription) return;

    const utilityType = subscription.utility_type;

    // Tek satırlı sorguyu değiştirin:
    const { data: lastRecord, error } = await supabase
      .from("consumptions")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Son kayıt çekme hatası:", error);
      return;
    }

    if (lastRecord && lastRecord.length > 0) {
      const record = lastRecord[0];
      const lastValue =
        utilityType === "water"
          ? record.water_amount
          : record.electricity_amount;

      if (lastValue !== null && lastValue !== undefined) {
        setLastCounterValue(Number(lastValue));
        setLastCounterDate(
          new Date(record.created_at).toLocaleDateString("tr-TR")
        );
      } else {
        setLastCounterValue(null);
        setLastCounterDate(null);
      }
    } else {
      setLastCounterValue(null);
      setLastCounterDate(null);
    }
  } catch (error) {
    console.error("Son sayaç değeri alınamadı:", error);
    setLastCounterValue(null);
    setLastCounterDate(null);
  }
};

  const fetchPersonalizedTips = async (userId: number) => {
    try {
      const { data: appliedTips } = await supabase
        .from("user_applied_tips")
        .select("tip_id")
        .eq("user_id", userId);

      const appliedTipIds = appliedTips?.map((t: any) => t.tip_id) || [];

      const { data: tips } = await supabase
        .from("tips")
        .select("*")
        .is("user_id", null)
        .not("id", "in", `(${appliedTipIds.join(",") || "0"})`)
        .limit(5);

      if (tips) {
        const tipsWithPoints = tips.map((tip: any) => ({
          id: tip.id,
          title: tip.title || "Tasarruf Önerisi",
          content: tip.content || tip.tip_text || "",
          category: tip.category || "general",
          estimated_savings: tip.estimated_savings || 5,
          difficulty: tip.difficulty || "medium",
          utility_type: tip.utility_type || "general",
          points_reward:
            tip.points_reward ||
            (tip.difficulty === "easy"
              ? 8
              : tip.difficulty === "medium"
              ? 12
              : 15),
        }));

        setPersonalizedTips(tipsWithPoints);
      }
    } catch (error) {
      console.error("Öneriler yüklenemedi:", error);
    }
  };

  const fetchBuildingLeaderboard = async (userData: any) => {
    try {
      const buildingId = userData.apartment?.building?.id;
      if (!buildingId) return;

      const { data: buildingUsers } = await supabase
        .from("users")
        .select(
          `
          id,
          name,
          total_points,
          monthly_points,
          apartment_id,
          apartments (
            number,
            building_id
          )
        `
        )
        .eq("apartments.building_id", buildingId)
        .order("monthly_points", { ascending: false });

      if (buildingUsers) {
        const rankedUsers: LeaderboardEntry[] = buildingUsers.map(
          (user: any, index: number) => {
            const apartmentArray = Array.isArray(user.apartments)
              ? user.apartments
              : [user.apartments];
            const apartment =
              apartmentArray.length > 0 ? apartmentArray[0] : null;

            return {
              id: user.id,
              name: user.name || `Daire ${apartment?.number || "?"}`,
              apartment_number: apartment?.number || "?",
              total_points: user.total_points || 0,
              monthly_points: user.monthly_points || 0,
              rank: index + 1,
              is_current_user: user.id === userData.id,
            };
          }
        );

        setBuildingRanking(rankedUsers);

        const userRank = rankedUsers.findIndex((u) => u.id === userData.id) + 1;
        setStats((prev) => ({
          ...prev,
          buildingRank: userRank || rankedUsers.length + 1,
          monthlyRank: rankedUsers.find((u) => u.id === userData.id)?.rank || 0,
          totalInBuilding: rankedUsers.length,
        }));
      }
    } catch (error) {
      console.error("Liderlik tablosu yüklenemedi:", error);
    }
  };

  const calculateCompanyDiscounts = async (
  userData: any,
  subscriptions: UserSubscription[],
  consumptions: Consumption[]
): Promise<CompanyDiscount[]> => {
  const discounts: CompanyDiscount[] = [];
  const currentMonth = getCurrentMonthYear();

  for (const subscription of subscriptions) {
    const company = subscription.companies?.[0];
    if (!company) continue;

    // Bu şirketin bu ayki tüketimlerini filtrele
    const monthlyConsumptions = consumptions.filter((cons) => {
      if (cons.subscription_id !== subscription.id) return false;
      const date = new Date(cons.created_at);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      return monthYear === currentMonth;
    });

    // Bu ayki puanı hesapla
    let monthlyPoints = 0;
    if (monthlyConsumptions.length > 0) {
      // Tasarruf puanı
      const comparison = calculateMonthlyComparison(monthlyConsumptions, [
        subscription,
      ]);
      monthlyPoints = calculateMonthlyPoints(comparison, monthlyConsumptions);

      // Şirkete özel bonus (sözleşmeli ise +20%)
      if (company.is_contracted) {
        monthlyPoints = Math.round(monthlyPoints * 1.2);
      }
    }

    // Toplam puan (tüm zamanlar)
    const totalConsumptions = consumptions.filter(
      (c) => c.subscription_id === subscription.id
    );
    const totalPoints = totalConsumptions.reduce(
      (sum, cons) => sum + (cons.monthly_points || 0),
      0
    );

    // İndirim seviyesini belirle - JSON parse hatasını önle
    let discountTiers: DiscountTier[] = [];
    
    try {
      if (Array.isArray(company.discount_tiers)) {
        discountTiers = company.discount_tiers;
      } else if (typeof company.discount_tiers === 'string') {
        discountTiers = JSON.parse(company.discount_tiers);
      }
    } catch (error) {
      console.warn(`Discount tiers parse hatası for ${company.name}:`, error);
    }
    
    // Eğer boşsa default değerler
    if (!discountTiers || discountTiers.length === 0) {
      discountTiers = getDefaultDiscountTiers(company.name);
    }

    // AYLIK PUANA göre indirim seviyesi
    let currentDiscount = 0;
    let currentTierName = "Başlangıç";
    let nextTierPoints = 0;
    let nextTierDiscount = 0;
    let nextTierName = "";
    let progressPercent = 0;

    for (let i = discountTiers.length - 1; i >= 0; i--) {
      if (monthlyPoints >= discountTiers[i].min_points) {
        currentDiscount = discountTiers[i].discount_percent;
        currentTierName = discountTiers[i].tier_name || `Seviye ${i + 1}`;

        if (i < discountTiers.length - 1) {
          nextTierPoints = discountTiers[i + 1].min_points - monthlyPoints;
          nextTierDiscount = discountTiers[i + 1].discount_percent;
          nextTierName = discountTiers[i + 1].tier_name || `Seviye ${i + 2}`;

          const currentRange =
            discountTiers[i + 1].min_points - discountTiers[i].min_points;
          const currentProgress = monthlyPoints - discountTiers[i].min_points;
          progressPercent = Math.round(
            (currentProgress / currentRange) * 100
          );
        } else {
          progressPercent = 100;
        }
        break;
      }
    }

    // Eğer hiçbir tier'e uymuyorsa en düşük tier
    if (currentDiscount === 0 && discountTiers.length > 0) {
      currentDiscount = discountTiers[0].discount_percent;
      currentTierName = discountTiers[0].tier_name || "Başlangıç";
      nextTierPoints = discountTiers[1]?.min_points - monthlyPoints || 0;
      nextTierDiscount = discountTiers[1]?.discount_percent || 0;
      nextTierName = discountTiers[1]?.tier_name || "";
      progressPercent = Math.round((monthlyPoints / discountTiers[1]?.min_points || 1) * 100);
    }

    discounts.push({
      company_id: company.id,
      company_name: company.name,
      company_code: company.code,
      utility_type: subscription.utility_type,
      is_contracted: company.is_contracted || false,
      monthly_points: monthlyPoints,
      total_points: totalPoints,
      current_discount: currentDiscount,
      current_tier_name: currentTierName,
      next_tier_points: nextTierPoints,
      next_tier_discount: nextTierDiscount,
      next_tier_name: nextTierName,
      progress_percent: progressPercent,
      discount_tiers: discountTiers,
    });
  }

  return discounts;
};

  const updateUserPoints = async (
    userId: number,
    monthlyPoints: number,
    totalPoints: number
  ) => {
    try {
      const { data, error } = await supabase.rpc("update_user_points_safe", {
        user_id_param: userId,
        monthly_points_param: monthlyPoints,
        total_points_param: totalPoints,
      });

      if (error) {
        console.error("RPC hatası:", error);
        const { error: directError } = await supabase
          .from("users")
          .update({
            monthly_points: monthlyPoints,
            total_points: totalPoints,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (directError) {
          throw new Error(`Update failed: ${directError.message}`);
        }
        return { success: true };
      }
      return data;
    } catch (error) {
      console.error("Puan güncelleme hatası:", error);
      throw error;
    }
  };

  const syncCachedPoints = async (userId: number) => {
    try {
      const userData = JSON.parse(
        localStorage.getItem("ekoakort_user") || "{}"
      );
      if (userData._cached && userData.id === userId) {
        console.log("🔄 Cache'li puanları sync ediyor...");
        const result = await updateUserPoints(
          userId,
          userData.monthly_points,
          userData.total_points
        );
        if (result?.success) {
          delete userData._cached;
          delete userData._cached_at;
          localStorage.setItem("ekoakort_user", JSON.stringify(userData));
          console.log("✅ Cache sync başarılı");
        }
      }
    } catch (error) {
      console.error("Sync hatası:", error);
    }
  };

  // ==================== AKSİYON FONKSİYONLARI ====================
  // fetchDashboardData içinde:
const fetchDashboardData = async () => {
  try {
    setRefreshing(true);
    const userData = JSON.parse(localStorage.getItem("ekoakort_user") || "{}");
    if (!userData.id) {
      router.push("/login");
      return;
    }

    console.log("📊 Dashboard verileri çekiliyor...");

    // 1. KULLANICI ABONELİKLERİNİ ÇEK
    const { data: subscriptions, error: subsError } = await supabase
      .from("user_subscriptions")
      .select(`
        id, 
        company_id, 
        subscriber_no, 
        utility_type, 
        is_active,
        created_at,
        companies!inner (
          id, 
          name, 
          code, 
          utility_type, 
          discount_tiers,
          is_contracted
        )
      `)
      .eq("user_id", userData.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (subsError) {
      console.error("Abonelikler çekilemedi:", subsError);
      throw subsError;
    }

    const formattedSubscriptions: UserSubscription[] = (subscriptions || []).map((sub: any) => ({
      id: sub.id,
      company_id: sub.company_id,
      subscriber_no: sub.subscriber_no,
      utility_type: sub.utility_type,
      is_active: sub.is_active,
      created_at: sub.created_at,
      companies: Array.isArray(sub.companies) ? sub.companies : [sub.companies],
    }));

    setUserSubscriptions(formattedSubscriptions);
    if (formattedSubscriptions.length > 0) {
      const defaultSub = formattedSubscriptions[0];
      setSelectedSubscription(defaultSub);
      setQuickRecord((prev) => ({
        ...prev,
        subscription_id: defaultSub.id.toString(),
      }));
    }

    // 2. TÜM TÜKETİM VERİLERİNİ ÇEK
    let allConsumptionsData: Consumption[] = [];

    if (formattedSubscriptions.length > 0) {
      const subscriptionIds = formattedSubscriptions.map((s) => s.id);

      const { data: consumptions, error: consError } = await supabase
        .from("consumptions")
        .select("*")
        .in("subscription_id", subscriptionIds)
        .order("created_at", { ascending: false });

      if (consError) {
        console.error("Tüketim verisi çekilemedi:", consError);
      } else {
        allConsumptionsData = (consumptions || []) as Consumption[];
        console.log(`📈 ${allConsumptionsData.length} tüketim kaydı bulundu`);
      }
    }

    setAllConsumptions(allConsumptionsData);

    // 3. AYLIK KARŞILAŞTIRMA HESAPLA
    if (allConsumptionsData.length >= 1 && formattedSubscriptions.length > 0) {
      const comparison = calculateMonthlyComparison(
        allConsumptionsData,
        formattedSubscriptions
      );
      setMonthlyComparison(comparison);

      const monthlyPoints = calculateMonthlyPoints(
        comparison,
        allConsumptionsData
      );

      setStats((prev) => ({
        ...prev,
        waterSavingsPercent: comparison.waterSavingsPercent,
        electricitySavingsPercent: comparison.electricitySavingsPercent,
        waterSavedAmount: comparison.waterSavedAmount,
        electricitySavedAmount: comparison.electricitySavedAmount,
        currentMonthWater: comparison.currentWater,
        currentMonthElectricity: comparison.currentElectricity,
        previousMonthWater: comparison.previousWater,
        previousMonthElectricity: comparison.previousElectricity,
        monthlyPoints: monthlyPoints,
        currentMonthName: formatMonthYear(comparison.currentMonth),
        previousMonthName: formatMonthYear(comparison.previousMonth),
        comparedToAvg: getComparisonStatus(
          comparison.waterSavingsPercent,
          comparison.electricitySavingsPercent
        ),
      }));
    }

    // 4. ŞİRKET İNDİRİMLERİNİ HESAPLA (try-catch ile)
    try {
      if (formattedSubscriptions.length > 0 && allConsumptionsData.length > 0) {
        const discounts = await calculateCompanyDiscounts(
          userData,
          formattedSubscriptions,
          allConsumptionsData
        );
        setCompanyDiscounts(discounts);

        const totalPoints = discounts.reduce(
          (sum, d) => sum + d.total_points,
          0
        );
        setStats((prev) => ({ ...prev, totalPoints }));
      }
    } catch (error) {
      console.error("Company discounts hesaplama hatası:", error);
    }

    // 5. LİDERLİK VERİSİNİ ÇEK
    try {
      await fetchBuildingLeaderboard(userData);
    } catch (error) {
      console.error("Liderlik verisi hatası:", error);
    }

    // 6. ÖNERİLERİ ÇEK
    try {
      await fetchPersonalizedTips(userData.id);
    } catch (error) {
      console.error("Öneriler hatası:", error);
    }

    // 7. KULLANICI PUANLARINI GÜNCELLE
    try {
      await updateUserPoints(
        userData.id,
        stats.monthlyPoints,
        stats.totalPoints
      );
    } catch (error) {
      console.error("Puan güncelleme hatası:", error);
    }
  } catch (error) {
    console.error("Dashboard verisi yüklenemedi:", error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  const handleApplyTip = async (tipId: number) => {
    try {
      const userData = JSON.parse(
        localStorage.getItem("ekoakort_user") || "{}"
      );
      const monthlyTipsUsed = userData.monthly_tips_used || 0;

      // 1. Aylık limit kontrolü
      if (monthlyTipsUsed >= 3) {
        alert(
          "❌ Aylık öneri limitiniz doldu! Her ay en fazla 3 öneri uygulayabilirsiniz."
        );
        return;
      }

      // 2. Bu öneriyi daha önce uygulamış mı?
      const { data: existingTip } = await supabase
        .from("user_applied_tips")
        .select("*")
        .eq("user_id", userData.id)
        .eq("tip_id", tipId)
        .single();

      if (existingTip) {
        alert("⚠️ Bu öneriyi zaten uygulamışsınız!");
        return;
      }

      // 3. Öneri bilgilerini al
      const { data: tip } = await supabase
        .from("tips")
        .select("*")
        .eq("id", tipId)
        .single();

      if (!tip) {
        alert("Öneri bulunamadı!");
        return;
      }

      // 4. Kullanıcının aylık öneri sayısını artır
      const newMonthlyTipsUsed = monthlyTipsUsed + 1;
      await supabase
        .from("users")
        .update({
          monthly_tips_used: newMonthlyTipsUsed,
          last_tip_reset: new Date().toISOString().split("T")[0],
        })
        .eq("id", userData.id);

      // 5. user_applied_tips tablosuna kaydet
      const pointsEarned = tip.points_reward || 10;
      await supabase.from("user_applied_tips").insert([
        {
          user_id: userData.id,
          tip_id: tipId,
          earned_points: pointsEarned,
        },
      ]);

      // 6. Toplam puanı güncelle
      const newTotalPoints = (stats.totalPoints || 0) + pointsEarned;
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

      // 8. State'leri güncelle
      setStats((prev) => ({ ...prev, totalPoints: newTotalPoints }));
      setUser((prev: any) => ({
        ...prev,
        monthly_tips_used: newMonthlyTipsUsed,
        total_points: newTotalPoints,
      }));

      // 9. Öneriler listesini güncelle
      setPersonalizedTips((prev) => prev.filter((t) => t.id !== tipId));

      alert(
        `✅ "${
          tip.title
        }" önerisi uygulandı!\n🎉 ${pointsEarned} puan kazandınız!\n📊 Aylık kalan öneri hakkınız: ${
          3 - newMonthlyTipsUsed
        }`
      );

      // Yeni öneri getir
      await fetchPersonalizedTips(userData.id);
    } catch (error) {
      console.error("Öneri uygulanamadı:", error);
      alert("Öneri uygulanırken bir hata oluştu.");
    }
  };

  const handleQuickRecordSubmit = async () => {
    if (!quickRecord.subscription_id || !quickRecord.counter_value) {
      alert("Lütfen abonelik seçin ve sayaç değerini girin");
      return;
    }

    try {
      const userData = JSON.parse(
        localStorage.getItem("ekoakort_user") || "{}"
      );
      const subscriptionId = parseInt(quickRecord.subscription_id);
      const currentCounter = parseFloat(quickRecord.counter_value);

      const subscription = userSubscriptions.find(
        (s) => s.id === subscriptionId
      );
      if (!subscription) throw new Error("Abonelik bulunamadı");

      if (lastCounterValue !== null && currentCounter < lastCounterValue) {
        alert(
          `❌ Hatalı giriş!\n\nSayaç geriye gidemez!\n\nSon sayaç değeri: ${lastCounterValue}\nGirdiğiniz değer: ${currentCounter}\n\nLütfen son değerden BÜYÜK veya EŞİT bir sayı girin.`
        );
        return;
      }

      const now = new Date();
      const newRecord: any = {
        user_id: userData.id,
        subscription_id: subscriptionId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        created_at: now.toISOString(),
        monthly_points: 10,
      };

      if (subscription.utility_type === "water") {
        newRecord.water_amount = currentCounter;
        newRecord.electricity_amount = 0;
      } else {
        newRecord.electricity_amount = currentCounter;
        newRecord.water_amount = 0;
      }

      const { error } = await supabase.from("consumptions").insert([newRecord]);
      if (error) throw error;

      const company = subscription.companies?.[0];
      const utilityType =
        subscription.utility_type === "water" ? "Su" : "Elektrik";
      const unit = subscription.utility_type === "water" ? "m³" : "kWh";

      let message = `✅ ${utilityType} sayaç kaydı başarılı!\n\n`;
      message += `Şirket: ${company?.name || "Bilinmeyen"}\n`;
      message += `Yeni sayaç değeri: ${currentCounter} ${unit}\n`;

      if (lastCounterValue !== null) {
        const consumption = currentCounter - lastCounterValue;
        message += `Önceki sayaç: ${lastCounterValue} ${unit}\n`;
        message += `Bu dönem tüketimi: ${consumption.toFixed(2)} ${unit}\n`;
      }

      message += `\nKazanılan puan: 10\n`;
      alert(message);

      setQuickRecord({
        subscription_id: quickRecord.subscription_id,
        counter_value: "",
      });

      setLastCounterValue(currentCounter);
      setLastCounterDate(new Date().toLocaleDateString("tr-TR"));
      refreshDashboard();
    } catch (error : any) {
      console.error("Kayıt hatası:", error);
      alert("Kayıt eklenirken hata: " + error.message);
    }
  };

  const refreshDashboard = () => {
    fetchDashboardData();
  };

  // ==================== LIFECYCLE ====================
  useEffect(() => {
    checkAuth();
    fetchDashboardData();

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault();
        refreshDashboard();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("ekoakort_user") || "{}");
    if (userData.id) {
      syncCachedPoints(userData.id);
    }
  }, []);

  useEffect(() => {
    if (quickRecord.subscription_id) {
      const subId = parseInt(quickRecord.subscription_id);
      fetchLastCounterValue(subId);
    } else {
      setLastCounterValue(null);
      setLastCounterDate(null);
    }
  }, [quickRecord.subscription_id, userSubscriptions]);

  // ==================== MODAL ====================
  const InfoModal = ({
    companyDiscount,
    onClose,
  }: {
    companyDiscount: CompanyDiscount;
    onClose: () => void;
  }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {companyDiscount.company_name} İndirim Tablosu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Bu Ayki Puan:</span>
            <span className="font-bold text-green-600">
              {companyDiscount.monthly_points} puan
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Mevcut İndirim:</span>
            <span className="text-2xl font-bold text-green-700">
              %{companyDiscount.current_discount}
            </span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">Toplam Puan:</span>
            <span className="font-semibold">
              {companyDiscount.total_points}
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${companyDiscount.progress_percent}%` }}
            ></div>
          </div>
          <div className="text-right text-sm text-gray-500">
            %{companyDiscount.progress_percent} tamamlandı
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-gray-800 mb-2">İndirim Seviyeleri:</h4>
          {companyDiscount.discount_tiers.map((tier, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                companyDiscount.current_discount >= tier.discount_percent
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-800">
                    {tier.tier_name || `Seviye ${index + 1}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {tier.min_points} puan/gerekiyor
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    %{tier.discount_percent}
                  </div>
                  <div className="text-xs text-gray-500">indirim</div>
                </div>
              </div>
              {companyDiscount.current_discount === tier.discount_percent && (
                <div className="mt-2 text-xs text-green-600 flex items-center">
                  <Sparkles className="w-3 h-3 mr-1" /> Mevcut seviyeniz
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="text-sm text-gray-600">
            <div className="flex justify-between mb-1">
              <span>Bu ayki puan:</span>
              <span className="font-medium">
                {companyDiscount.monthly_points}
              </span>
            </div>
            {companyDiscount.next_tier_points > 0 && (
              <div className="flex justify-between">
                <span>Sonraki seviye için:</span>
                <span className="font-medium text-green-600">
                  +{companyDiscount.next_tier_points} puan (%
                  {companyDiscount.next_tier_discount})
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Kapat
        </button>
      </div>
    </div>
  );

  // ==================== YÜKLENİYOR ====================
  if (loading) {
    return <LoadingSpinner message="Dashboard yükleniyor..." />;
  }

  // ==================== RENDER ====================
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 1. HOŞGELDİN BANNER */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <h1 className="text-2xl font-bold text-gray-800">
                Hoş Geldiniz, {user?.name || "Değerli Kullanıcı"}! 👋
              </h1>
              <button
                onClick={refreshDashboard}
                disabled={refreshing}
                className="ml-3 p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                title="Yenile (Ctrl+R)"
              >
                <RefreshCw
                  className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
            <p className="text-gray-600">
              <Building className="w-4 h-4 inline mr-1" />
              {user?.apartment?.building?.name || "Apartmanınız"}, Daire{" "}
              {user?.apartment?.number}
              <span className="mx-2">•</span>
              <Home className="w-4 h-4 inline mr-1" />
              {user?.family_size || 1} kişilik aile
            </p>
            {stats.currentMonthName && (
              <p className="text-sm text-gray-500 mt-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                {stats.currentMonthName} verileriniz gösteriliyor
              </p>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <div className="inline-flex items-center bg-white px-4 py-3 rounded-lg shadow">
              <Award className="w-6 h-6 text-yellow-500 mr-3" />
              <div>
                <div className="text-xs text-gray-500">Bu Ayki Puan</div>
                <div className="text-2xl font-bold text-gray-800">
                  {stats.monthlyPoints}
                  <span className="text-sm text-gray-400 ml-2">
                    / {stats.totalPoints} toplam
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AYLIK KARŞILAŞTIRMA KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* SU TASARRUFU KARTI */}
        <div className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition">
          <div className="flex items-center mb-4">
            <div
              className={`p-3 rounded-lg ${
                stats.waterSavingsPercent > 0
                  ? "bg-blue-100"
                  : stats.waterSavingsPercent < 0
                  ? "bg-red-100"
                  : "bg-gray-100"
              }`}
            >
              <Droplets
                className={`w-6 h-6 ${
                  stats.waterSavingsPercent > 0
                    ? "text-blue-600"
                    : stats.waterSavingsPercent < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-800">
                {stats.waterSavingsPercent > 0 ? "+" : ""}
                {stats.waterSavingsPercent}%
              </div>
              <div className="text-gray-500 text-sm">
                {stats.waterSavingsPercent > 0
                  ? "Su Tasarrufu"
                  : stats.waterSavingsPercent < 0
                  ? "Fazla Tüketim"
                  : "Değişim Yok"}
              </div>
            </div>
          </div>
          <div className="text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-600">{stats.currentMonthName}:</span>
              <span className="font-semibold">
                {stats.currentMonthWater} m³
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{stats.previousMonthName}:</span>
              <span className="font-medium">{stats.previousMonthWater} m³</span>
            </div>
            {stats.waterSavedAmount !== 0 && (
              <div
                className={`mt-2 text-sm font-medium ${
                  stats.waterSavedAmount > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {stats.waterSavedAmount > 0 ? "✓" : "⚠️"}
                {Math.abs(stats.waterSavedAmount).toFixed(1)} m³{" "}
                {stats.waterSavedAmount > 0 ? "tasarruf" : "fazla"}
              </div>
            )}
          </div>
        </div>

        {/* ELEKTRİK TASARRUFU KARTI */}
        <div className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition">
          <div className="flex items-center mb-4">
            <div
              className={`p-3 rounded-lg ${
                stats.electricitySavingsPercent > 0
                  ? "bg-yellow-100"
                  : stats.electricitySavingsPercent < 0
                  ? "bg-red-100"
                  : "bg-gray-100"
              }`}
            >
              <Zap
                className={`w-6 h-6 ${
                  stats.electricitySavingsPercent > 0
                    ? "text-yellow-600"
                    : stats.electricitySavingsPercent < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-800">
                {stats.electricitySavingsPercent > 0 ? "+" : ""}
                {stats.electricitySavingsPercent}%
              </div>
              <div className="text-gray-500 text-sm">
                {stats.electricitySavingsPercent > 0
                  ? "Elektrik Tasarrufu"
                  : stats.electricitySavingsPercent < 0
                  ? "Fazla Tüketim"
                  : "Değişim Yok"}
              </div>
            </div>
          </div>
          <div className="text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-600">{stats.currentMonthName}:</span>
              <span className="font-semibold">
                {stats.currentMonthElectricity} kWh
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{stats.previousMonthName}:</span>
              <span className="font-medium">
                {stats.previousMonthElectricity} kWh
              </span>
            </div>
            {stats.electricitySavedAmount !== 0 && (
              <div
                className={`mt-2 text-sm font-medium ${
                  stats.electricitySavedAmount > 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {stats.electricitySavedAmount > 0 ? "✓" : "⚠️"}
                {Math.abs(stats.electricitySavedAmount).toFixed(1)} kWh{" "}
                {stats.electricitySavedAmount > 0 ? "tasarruf" : "fazla"}
              </div>
            )}
          </div>
        </div>

        {/* AYLIK LİDERLİK KARTI */}
        <div className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Trophy className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-800">
                #{stats.monthlyRank || "-"}
              </div>
              <div className="text-gray-500 text-sm">Bu Ayki Sıralama</div>
            </div>
          </div>
          <div className="text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Apartmanda:</span>
              <span className="font-semibold">
                {stats.totalInBuilding} daire
              </span>
            </div>
            <div className="text-purple-600 mt-1">
              {stats.monthlyRank === 1
                ? "🏆 Bu Ayın Şampiyonu!"
                : stats.monthlyRank <= 3
                ? "🔥 İlk üçte!"
                : stats.monthlyRank <= 10
                ? "💪 İyi gidiyorsun!"
                : "📈 Devam edin!"}
            </div>
          </div>
        </div>

        {/* DURUM KARTI */}
        <div className="bg-white p-6 rounded-xl shadow border hover:shadow-md transition">
          <div className="flex items-center mb-4">
            <div
              className={`p-3 rounded-lg ${
                stats.comparedToAvg.includes("süper")
                  ? "bg-green-100"
                  : stats.comparedToAvg.includes("harika")
                  ? "bg-blue-100"
                  : stats.comparedToAvg.includes("dikkat")
                  ? "bg-red-100"
                  : "bg-gray-100"
              }`}
            >
              {stats.comparedToAvg.includes("süper") ||
              stats.comparedToAvg.includes("harika") ? (
                <TrendingUpIcon className="w-6 h-6 text-green-600" />
              ) : stats.comparedToAvg.includes("dikkat") ? (
                <TrendingDown className="w-6 h-6 text-red-600" />
              ) : (
                <BarChart3 className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="ml-4">
              <div
                className={`text-2xl font-bold ${
                  stats.comparedToAvg.includes("süper")
                    ? "text-green-600"
                    : stats.comparedToAvg.includes("harika")
                    ? "text-blue-600"
                    : stats.comparedToAvg.includes("dikkat")
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {stats.comparedToAvg.includes("süper")
                  ? "SÜPER"
                  : stats.comparedToAvg.includes("harika")
                  ? "İYİ"
                  : stats.comparedToAvg.includes("dikkat")
                  ? "DİKKAT"
                  : "ORTA"}
              </div>
              <div className="text-gray-500 text-sm">Durumunuz</div>
            </div>
          </div>
          <div className="text-sm">
            <div
              className={`font-medium ${
                stats.comparedToAvg.includes("süper")
                  ? "text-green-600"
                  : stats.comparedToAvg.includes("harika")
                  ? "text-blue-600"
                  : stats.comparedToAvg.includes("dikkat")
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {stats.comparedToAvg}
            </div>
          </div>
        </div>
      </div>

      {/* 3. HIZLI KAYIT ve İSTATİSTİKLER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* HIZLI KAYIT PANELİ */}
        <div className="bg-white rounded-xl shadow border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2 text-green-600" />
            Hızlı Sayaç Kaydı
          </h2>

          {userSubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-3">
                Henüz aboneliğiniz bulunmuyor.
              </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abonelik Seçin *
                </label>
                <select
                  value={quickRecord.subscription_id}
                  onChange={(e) => {
                    const subId = e.target.value;
                    setQuickRecord({
                      ...quickRecord,
                      subscription_id: subId,
                    });

                    const sub = userSubscriptions.find(
                      (s) => s.id === parseInt(subId)
                    );
                    setSelectedSubscription(sub || null);

                    if (subId) {
                      fetchLastCounterValue(parseInt(subId));
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Aboneliğinizi seçin</option>
                  {userSubscriptions.map((sub) => {
                    const company = sub.companies?.[0];
                    const isContracted = company?.is_contracted;
                    return (
                      <option key={sub.id} value={sub.id}>
                        {sub.utility_type === "water" ? "💧" : "⚡"}
                        {company?.name || "Bilinmeyen Şirket"}
                        {isContracted && " 🤝"}({company?.code || "???"}) -{" "}
                        {sub.subscriber_no}
                      </option>
                    );
                  })}
                </select>

                {/* SON SAYAÇ BİLGİSİ */}
                {lastCounterValue !== null && selectedSubscription && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center text-sm text-blue-800">
                      <div className="bg-blue-100 p-1.5 rounded-lg mr-2">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-medium">Son sayaç değeri: </span>
                        <span className="font-bold">{lastCounterValue}</span>
                        <span className="ml-1">
                          {selectedSubscription.utility_type === "water"
                            ? "m³"
                            : "kWh"}
                        </span>
                        {lastCounterDate && (
                          <span className="ml-2 text-blue-600">
                            ({lastCounterDate})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-600 space-y-1">
                      <div>
                        📊{" "}
                        <strong>
                          Sayaç üzerindeki son okuduğunuz değeri girin
                        </strong>
                      </div>
                      <div>
                        📈 Sistem otomatik olarak tüketiminizi hesaplayacak
                      </div>
                      <div className="font-medium text-blue-700">
                        Örnek: Son değer {lastCounterValue} ise,{" "}
                        {lastCounterValue + 5} girebilirsiniz
                      </div>
                    </div>
                  </div>
                )}

                {!lastCounterValue && quickRecord.subscription_id && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center text-sm text-yellow-800">
                      <div className="bg-yellow-100 p-1.5 rounded-lg mr-2">
                        <Info className="w-4 h-4" />
                      </div>
                      <div>
                        Bu abonelik için henüz kayıt bulunmuyor. İlk sayaç
                        değerinizi girin.
                      </div>
                    </div>
                  </div>
                )}

                {selectedSubscription && (
                  <div className="mt-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      {selectedSubscription.companies?.[0]?.is_contracted ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-green-600 mr-1" />
                          <span className="text-green-600 font-medium">
                            Sözleşmeli firma
                          </span>
                          <span className="mx-2">•</span>
                          <span>Otomatik veri entegrasyonu aktif</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-yellow-600 mr-1" />
                          <span className="text-yellow-600">
                            Manuel kayıt gerekiyor
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SAYAÇ DEĞERİ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Sayaç Değeri *
                  {lastCounterValue !== null && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      (Son: {lastCounterValue})
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={quickRecord.counter_value}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (
                        lastCounterValue !== null &&
                        parseFloat(value) <= lastCounterValue
                      ) {
                        e.target.classList.add("border-red-500");
                      } else {
                        e.target.classList.remove("border-red-500");
                      }
                      setQuickRecord({
                        ...quickRecord,
                        counter_value: value,
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pl-12"
                    placeholder={
                      selectedSubscription?.utility_type === "water"
                        ? lastCounterValue !== null
                          ? `Örn: ${lastCounterValue + 5}`
                          : "1250.50 (m³)"
                        : lastCounterValue !== null
                        ? `Örn: ${lastCounterValue + 50}`
                        : "4500.75 (kWh)"
                    }
                    required
                    min={
                      lastCounterValue !== null
                        ? lastCounterValue + 0.01
                        : undefined
                    }
                  />
                  <div className="absolute left-3 top-3.5">
                    {selectedSubscription?.utility_type === "water" ? (
                      <Droplets className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Zap className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>

                {/* HATA MESAJI */}
                {lastCounterValue !== null &&
                  quickRecord.counter_value &&
                  parseFloat(quickRecord.counter_value) <= lastCounterValue && (
                    <div className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Girdiğiniz değer son değerden ({lastCounterValue}) küçük
                      veya eşit!
                    </div>
                  )}
              </div>

              {/* KAYIT BUTONU */}
              <button
                onClick={handleQuickRecordSubmit}
                disabled={
                  !quickRecord.subscription_id ||
                  !quickRecord.counter_value ||
                  (lastCounterValue !== null &&
                    parseFloat(quickRecord.counter_value) <= lastCounterValue)
                }
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Kaydı Ekle (+10 puan)
              </button>

              {/* HATIRLATICI */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <History className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">
                      📅 Aylık Kayıt Hatırlatıcısı
                    </p>
                    <p className="text-xs text-blue-600">
                      Her ay <strong>aynı gün</strong> sayaç okumanızı yapın.
                      Böylece tasarrufunuzu doğru hesaplayabilir ve maksimum
                      puan kazanırsınız.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SON KAYITLAR ve İSTATİSTİKLER */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Son Kayıtlarınız ve İstatistikler
          </h3>

          {allConsumptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 mb-2">Henüz kayıt yapılmamış</p>
              <p className="text-sm">İlk sayaç kaydınızı yukarıdan ekleyin</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Son 5 Kaydınız
                </h4>
                <div className="space-y-3">
                  {allConsumptions.slice(0, 5).map((record) => {
                    const subscription = userSubscriptions.find(
                      (s) => s.id === record.subscription_id
                    );
                    const company = subscription?.companies?.[0];
                    const utilityType = subscription?.utility_type;

                    return (
                      <div
                        key={record.id}
                        className="bg-white border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center">
                            {utilityType === "water" ? (
                              <Droplets className="w-4 h-4 text-blue-500 mr-2" />
                            ) : (
                              <Zap className="w-4 h-4 text-yellow-500 mr-2" />
                            )}
                            <span className="font-medium text-gray-800">
                              {company?.name ||
                                (utilityType === "water" ? "Su" : "Elektrik")}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(record.created_at).toLocaleDateString(
                              "tr-TR"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {utilityType === "water" ? "Su:" : "Elektrik:"}
                            <span className="font-semibold ml-1">
                              {utilityType === "water"
                                ? `${record.water_amount?.toFixed(2)} m³`
                                : `${record.electricity_amount?.toFixed(
                                    2
                                  )} kWh`}
                            </span>
                          </span>
                          <span className="text-green-600 font-medium">
                            +{record.monthly_points || 0} puan
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium text-gray-700 mb-3">
                  📈 Tüketim Özeti
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.currentMonthWater.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Bu Ay Su (m³)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats.currentMonthElectricity.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Bu Ay Elektrik (kWh)
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.monthlyPoints}
                    </div>
                    <div className="text-xs text-gray-500">Bu Ayki Puan</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {allConsumptions.length}
                    </div>
                    <div className="text-xs text-gray-500">Toplam Kayıt</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. İNDİRİMLER ve ÖNERİLER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KAZANILAN İNDİRİMLER */}
        <div className="bg-white rounded-xl shadow border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-green-600" />
            Bu Ayki İndirimleriniz
          </h2>

          {companyDiscounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Henüz indiriminiz yok.</p>
              <p className="text-sm mt-1">Tasarruf yaparak puan kazanın!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {companyDiscounts.map((discount) => (
                <div
                  key={discount.company_id}
                  className={`border rounded-lg p-4 ${
                    discount.current_discount > 0
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div
                        className={`p-2 rounded-lg mr-3 ${
                          discount.utility_type === "water"
                            ? "bg-blue-100"
                            : "bg-yellow-100"
                        }`}
                      >
                        {discount.utility_type === "water" ? (
                          <Droplets className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Zap className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">
                          {discount.company_name}
                          {discount.is_contracted && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              🤝 Sözleşmeli
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {discount.utility_type === "water"
                            ? "💧 Su"
                            : "⚡ Elektrik"}
                          <button
                            onClick={() =>
                              setShowInfoModal(discount.company_id)
                            }
                            className="ml-2 text-gray-400 hover:text-gray-600"
                            title="İndirim tablosunu gör"
                          >
                            <Info className="w-4 h-4 inline" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${
                          discount.current_discount > 0
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        %{discount.current_discount}
                      </div>
                      <div className="text-xs text-gray-500">indirim</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {discount.current_tier_name}
                        <span className="ml-2 text-gray-400">
                          ({discount.monthly_points} puan)
                        </span>
                      </span>
                      <span className="font-medium">
                        Toplam: {discount.total_points} puan
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          discount.progress_percent > 50
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                        style={{ width: `${discount.progress_percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {discount.next_tier_points > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Sonraki seviye için:
                        </span>
                        <span className="text-sm font-semibold text-green-700">
                          +{discount.next_tier_points} puan → %
                          {discount.next_tier_discount}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ÖNERİLER BÖLÜMÜ */}
        <div className="bg-white rounded-xl shadow border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
              Size Özel Öneriler
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Aylık limit: {3 - (user?.monthly_tips_used || 0)}/{3} kaldı)
              </span>
            </h2>
            <button
              onClick={() => router.push("/tips")}
              className="text-sm text-green-600 hover:text-green-700 flex items-center"
            >
              Tümünü Gör <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {personalizedTips.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Tüm önerileri uyguladınız!</p>
              <p className="text-sm mt-1">Gelecek ay yeni öneriler gelecek.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {personalizedTips.slice(0, 3).map((tip) => {
                const remainingTips = 3 - (user?.monthly_tips_used || 0);
                const pointsEarned = tip.points_reward || 10;

                return (
                  <div
                    key={tip.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            tip.utility_type === "water"
                              ? "bg-blue-100 text-blue-700"
                              : tip.utility_type === "electricity"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {tip.utility_type === "water"
                            ? "💧 SU"
                            : tip.utility_type === "electricity"
                            ? "⚡ ELEKTRİK"
                            : "🌍 GENEL"}
                        </span>
                        <span
                          className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            tip.difficulty === "easy"
                              ? "bg-green-100 text-green-700"
                              : tip.difficulty === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {tip.difficulty === "easy"
                            ? "Kolay"
                            : tip.difficulty === "medium"
                            ? "Orta"
                            : "Zor"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <span className="text-sm font-semibold text-green-600 mr-2">
                            %{tip.estimated_savings || 5} tasarruf
                          </span>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            +{pointsEarned} puan
                          </span>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-1">
                      {tip.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">{tip.content}</p>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {remainingTips > 0
                          ? `⏳ ${remainingTips} öneri hakkınız kaldı`
                          : "❌ Aylık limit doldu"}
                      </span>
                      <button
                        onClick={() => handleApplyTip(tip.id)}
                        disabled={remainingTips <= 0}
                        className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                          remainingTips > 0
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {remainingTips > 0 ? "Uygula" : "Limit Doldu"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AYLIK ÖNERİ DURUMU */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800 mb-1">
                  📊 Aylık Öneri Durumu
                </h3>
                <p className="text-sm text-gray-600">
                  Bu ay {user?.monthly_tips_used || 0}/3 öneri uyguladınız
                </p>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${((user?.monthly_tips_used || 0) / 3) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. LİDERLİK TABLOSU */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-purple-500" />
              Apartman Aylık Liderliği
            </h2>
            <span className="text-sm text-gray-500">
              {stats.currentMonthName} • {buildingRanking.length} aktif
              kullanıcı
            </span>
          </div>

          {buildingRanking.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Henüz liderlik verisi yok.</p>
              <p className="text-sm mt-1">
                Komşularınız kayıt yaptıkça görünecek
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">
                        Sıra
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">
                        Kullanıcı
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">
                        Bu Ayki Puan
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">
                        Toplam Puan
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">
                        Daire
                      </th>
                      <th className="text-left py-3 px-4 text-gray-500 font-medium">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildingRanking.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={`border-b hover:bg-gray-50 ${
                          entry.is_current_user ? "bg-green-50" : ""
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                              index === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : index === 1
                                ? "bg-gray-100 text-gray-700"
                                : index === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-50 text-gray-600"
                            }`}
                          >
                            {index === 0
                              ? "🥇"
                              : index === 1
                              ? "🥈"
                              : index === 2
                              ? "🥉"
                              : index + 1}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-green-100 rounded-full flex items-center justify-center text-lg mr-3">
                              {entry.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">
                                {entry.name}
                                {entry.is_current_user && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    Siz
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-gray-800">
                            {entry.monthly_points}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-gray-700">
                            {entry.total_points}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-gray-600">
                            Daire {entry.apartment_number}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                              entry.monthly_points > 150
                                ? "bg-green-100 text-green-700"
                                : entry.monthly_points > 100
                                ? "bg-blue-100 text-blue-700"
                                : entry.monthly_points > 50
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {entry.monthly_points > 150
                              ? "Süper"
                              : entry.monthly_points > 100
                              ? "İyi"
                              : entry.monthly_points > 50
                              ? "Orta"
                              : "Başlangıç"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {stats.monthlyRank > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div>
                      <div className="text-gray-700 font-medium">
                        Sıralamanız:{" "}
                        <span className="font-bold">#{stats.monthlyRank}</span>
                      </div>
                      {stats.monthlyRank > 1 &&
                        buildingRanking[stats.monthlyRank - 2] && (
                          <div className="text-sm text-gray-600 mt-1">
                            Bir üst sıra için:{" "}
                            <span className="font-semibold text-green-600">
                              +
                              {buildingRanking[stats.monthlyRank - 2]
                                .monthly_points - stats.monthlyPoints}{" "}
                              puan
                            </span>
                          </div>
                        )}
                    </div>
                    <div className="mt-4 md:mt-0">
                      <button
                        onClick={() => router.push("/leaderboard")}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Tam Liderlik Tablosu
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 6. BİLGİLENDİRME */}
      <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Sparkles className="w-6 h-6 mr-3 text-green-600" />
          İpuçları ve Hatırlatmalar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="font-medium text-gray-800 mb-2">
              📅 Aylık Hatırlatıcı
            </div>
            <p className="text-sm text-gray-600">
              Her ay aynı gün sayaç okumanızı yapın. Düzenlilik bonusu
              kazanırsınız.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="font-medium text-gray-800 mb-2">
              🏆 İndirim Kazanma
            </div>
            <p className="text-sm text-gray-600">
              İndirimler <strong>bu ayki puanınıza</strong> göre belirlenir. Her
              ay yeniden kazanmanız gerekir.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-green-200">
            <div className="font-medium text-gray-800 mb-2">
              🤝 Sözleşmeli Firmalar
            </div>
            <p className="text-sm text-gray-600">
              İSKİ, Aydem gibi sözleşmeli firmalar otomatik veri aktarımı
              sağlar. Profilden ekleyebilirsiniz.
            </p>
          </div>
        </div>
      </div>

      {/* ALT BİLGİ */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>
          Eko-Akort | Tasarrufunuzu takip edin, puan kazanın, indirimlerden
          faydalanın! 💚
          <span className="ml-2">
            Son güncelleme: {new Date().toLocaleTimeString("tr-TR")}
          </span>
        </p>
      </div>

      {/* MODAL */}
      {showInfoModal && (
        <InfoModal
          companyDiscount={
            companyDiscounts.find((d) => d.company_id === showInfoModal)!
          }
          onClose={() => setShowInfoModal(null)}
        />
      )}
    </div>
  );
}
