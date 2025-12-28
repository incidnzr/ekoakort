"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Home,
  Key,
  LogIn,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// Import'lardan hemen sonra ekle
interface Street {
  id: number;
  name: string;
  city?: string;
  district?: string;
}

interface Building {
  id: number;
  name: string;
  street_id: number;
  total_floors?: number;
  total_apartments?: number;
  streets: Street[]; // Array olarak
}

interface BuildingWithSingleStreet {
  id: number;
  name: string;
  street_id: number;
  streets: Street; // Tek bir street object
}

interface Apartment {
  id: number;
  number: string;
  building_id: number;
  buildings?: BuildingWithSingleStreet;
}

// Demo veriler (fallback için)
const DEMO_STREETS = [
  { id: "1", name: "Gül Sokağı" },
  { id: "2", name: "Lale Sokağı" },
  { id: "3", name: "Papatya Sokağı" },
];

const DEMO_BUILDINGS = [
  {
    id: "1",
    name: "Yeşil Apartmanı",
    street: "Gül Sokağı",
    floors: 5,
    apartments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: "2",
    name: "Mavi Apartmanı",
    street: "Gül Sokağı",
    floors: 4,
    apartments: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    id: "3",
    name: "Sarı Apartmanı",
    street: "Lale Sokağı",
    floors: 6,
    apartments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: "4",
    name: "Kırmızı Apartmanı",
    street: "Papatya Sokağı",
    floors: 3,
    apartments: [1, 2, 3, 4, 5, 6],
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [streets, setStreets] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);

  const [form, setForm] = useState({
    street: "",
    building: "",
    apartment_no: "",
    password: "",
    name: "",
    family_size: "3",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Başlangıçta verileri çek
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      console.log("Veritabanı bağlantısı deneniyor...");

      // 1. Sokakları çek
      const { data: streetsData, error: streetsError } = await supabase
        .from("streets")
        .select("id, name, city, district")
        .order("name");

      if (streetsError) {
        console.error("Sokaklar çekilirken hata:", streetsError);
        throw streetsError;
      }

      if (streetsData && streetsData.length > 0) {
        const streetNames = streetsData.map((s) => s.name);
        console.log("Çekilen sokaklar:", streetNames);
        setStreets(streetNames);

        // Sokakları mapping için kaydet
        const streetsMap = new Map<number, string>();
        streetsData.forEach((s) => streetsMap.set(s.id, s.name));

        // 2. Binaları çek
        const {
          data: buildingsData,
          error: buildingsError,
        } = await supabase
          .from("buildings")
          .select("id, name, street_id, total_floors, total_apartments")
          .order("name");

        if (buildingsError) {
          console.error("Binalar çekilirken hata:", buildingsError);
          throw buildingsError;
        }

        if (buildingsData && buildingsData.length > 0) {
          const formattedBuildings = buildingsData.map((b) => ({
            id: b.id.toString(),
            name: b.name,
            street: streetsMap.get(b.street_id) || "Bilinmeyen Sokak",
            floors: b.total_floors || 5,
            apartments: Array.from(
              { length: b.total_apartments || 10 },
              (_, i) => (i + 1).toString()
            ),
          }));

          console.log("Çekilen binalar:", formattedBuildings.length);
          setBuildings(formattedBuildings);
        }
      }
    } catch (error) {
      console.error("Veritabanı bağlantı hatası:", error);
      // Fallback data
      setStreets(["Gül Sokağı", "Çiçek Sokak", "Bahçe Sokak"]);
      setBuildings([
        {
          id: "1",
          name: "Yeşil Apartmanı",
          street: "Gül Sokağı",
          floors: 5,
          apartments: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        },
      ]);
    }
  };
  // Seçili sokağa göre apartmanları filtrele
  const filteredBuildings = form.street
    ? buildings.filter((b) => b.street === form.street)
    : [];

  // Seçili apartmana göre daire numaraları
  const selectedBuilding = buildings.find((b) => b.name === form.building);
  const availableApartments = selectedBuilding?.apartments || [];

  const handleSubmit = async () => {
    if (mode === "login") {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const handleLogin = async () => {
    if (
      !form.street ||
      !form.building ||
      !form.apartment_no ||
      !form.password
    ) {
      setError("Lütfen tüm alanları doldurun");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("=== LOGIN BAŞLIYOR ===");

      // 1. Önce sokak ve binayı bul - TİP DÜZELTMESİ BURADA
      const { data: buildingData, error: buildingError } = await supabase
        .from("buildings")
        .select(
          `
        id,
        name,
        street_id,
        streets!inner(id, name)
      `
        )
        .eq("name", form.building)
        .eq("streets.name", form.street)
        .single();

      if (buildingError || !buildingData) {
        console.error("Bina bulunamadı:", buildingError);
        setError("Bu apartman bulunamadı");
        setLoading(false);
        return;
      }

      // TİP DÖNÜŞÜMÜ: any kullanarak TypeScript'i atlatıyoruz
      const building = buildingData as any;
      console.log("✓ Bina bulundu:", building.id);

      // 2. Bu binada bu daireyi bul
      const { data: apartmentData, error: aptError } = await supabase
        .from("apartments")
        .select("id, number, building_id")
        .eq("building_id", building.id)
        .eq("number", form.apartment_no)
        .single();

      if (aptError || !apartmentData) {
        console.error("Daire bulunamadı:", aptError);
        setError("Bu daire bulunamadı");
        setLoading(false);
        return;
      }

      console.log("✓ Daire bulundu:", apartmentData.id);

      // 3. Bu dairedeki kullanıcıyı bul
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("apartment_id", apartmentData.id)
        .eq("password", form.password)
        .single();

      if (userError || !userData) {
        console.error("Kullanıcı bulunamadı:", userError);
        setError("Şifre hatalı veya kullanıcı bulunamadı");
        setLoading(false);
        return;
      }

      console.log("✓ Kullanıcı bulundu:", userData.name);

      // 4. Street bilgisini güvenli şekilde al
      // building.streets bir array olabilir, ilk elemanı al
      const streetInfo = Array.isArray(building.streets)
        ? building.streets[0]
        : building.streets;

      const userWithDetails = {
        ...userData,
        apartment: {
          id: apartmentData.id,
          number: apartmentData.number,
          building: {
            id: building.id,
            name: building.name,
            street: {
              id: streetInfo?.id || 0,
              name: streetInfo?.name || form.street,
            },
          },
        },
      };

      // 5. LocalStorage'a kaydet
      localStorage.setItem("ekoakort_user", JSON.stringify(userWithDetails));

      // 6. Last login güncelle
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", userData.id);

      console.log("=== LOGIN BAŞARIYLA TAMAMLANDI ===");
      router.push("/dashboard");
    } catch (error) {
      console.error("LOGIN CATCH HATASI:", error);
      setError("Giriş sırasında bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const fallbackLogin = () => {
    const demoUser = {
      id: Date.now(),
      building_name: form.building,
      apartment_no: form.apartment_no,
      name: form.name || "Demo Kullanıcı",
      family_size: parseInt(form.family_size),
      street: form.street,
      email: form.email || "",
      created_at: new Date().toISOString(),
    };

    localStorage.setItem("ekoakort_user", JSON.stringify(demoUser));
    router.push("/dashboard");
  };

  const handleRegister = async () => {
  if (!form.street || !form.building || !form.apartment_no || !form.password) {
    setError("Lütfen tüm alanları doldurun");
    return;
  }

  if (form.password.length < 6) {
    setError("Şifre en az 6 karakter olmalıdır");
    return;
  }

  setLoading(true);
  setError("");

  // Değişkeni dışarıda tanımla (scope için)
  let apartmentData: any = null;

  try {
    console.log("=== REGISTER BAŞLIYOR ===");

    // 1. Önce sokak ve binayı bul
    const { data: buildingData, error: buildingError } = await supabase
      .from('buildings')
      .select(`
        id,
        name,
        street_id,
        streets!inner(id, name)
      `)
      .eq('name', form.building)
      .eq('streets.name', form.street)
      .single();

    if (buildingError || !buildingData) {
      console.error("Bina bulunamadı:", buildingError);
      setError("Bu apartman bulunamadı");
      setLoading(false);
      return;
    }

    // TİP DÖNÜŞÜMÜ
    const building = buildingData as any;
    console.log("✓ Bina bulundu:", building.id);

    // 2. Bu binada bu daireyi bul veya oluştur
    const { data: existingApartment, error: aptError } = await supabase
      .from('apartments')
      .select('id, number, building_id')
      .eq('building_id', building.id)
      .eq('number', form.apartment_no)
      .single();

    if (aptError) {
      // Daire yoksa oluştur
      console.log("Daire bulunamadı, oluşturuluyor...");
      
      const { data: newApartment, error: createAptError } = await supabase
        .from('apartments')
        .insert([
          {
            building_id: building.id,
            number: form.apartment_no,
            floor: 1,
            area_sqm: 100
          }
        ])
        .select()
        .single();

      if (createAptError) {
        console.error("Daire oluşturma hatası:", createAptError);
        setError("Daire oluşturulamadı");
        setLoading(false);
        return;
      }

      apartmentData = newApartment;
      console.log("✓ Yeni daire oluşturuldu:", apartmentData.id);
    } else {
      apartmentData = existingApartment;
      console.log("✓ Mevcut daire bulundu:", apartmentData.id);
      
      // 3. Bu dairede kullanıcı var mı kontrol et
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, name')
        .eq('apartment_id', apartmentData.id)
        .maybeSingle();

      if (existingUser) {
        console.log("✗ Daire dolu! Mevcut kullanıcı:", existingUser);
        setError(`Bu daire zaten kayıtlı (${existingUser.name})`);
        setLoading(false);
        return;
      }
    }

    console.log("✓ Daire boş, kayıt yapılabilir");

    // 4. YENİ KULLANICI OLUŞTUR
    const userInsertData = {
      apartment_id: apartmentData.id,
      password: form.password,
      name: form.name || `Daire ${form.apartment_no} Sakini`,
      family_size: parseInt(form.family_size) || 3,
      email: form.email || null,
      total_points: 0,
      current_streak: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("Gönderilecek user data:", userInsertData);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([userInsertData])
      .select()
      .single();

    if (insertError) {
      console.error("Kullanıcı ekleme hatası:", insertError);
      setError(`Kayıt hatası: ${insertError.message}`);
      setLoading(false);
      return;
    }

    console.log("✓ Kullanıcı başarıyla oluşturuldu:", newUser.id);

    // 5. Street bilgisini güvenli şekilde al
    const streetInfo = Array.isArray(building.streets) 
      ? building.streets[0] 
      : building.streets;

    // 6. LOCALSTORAGE'A KAYDET
    const userWithDetails = {
      ...newUser,
      apartment: {
        id: apartmentData.id,
        number: apartmentData.number,
        building: {
          id: building.id,
          name: building.name,
          street: {
            id: streetInfo?.id || 0,
            name: streetInfo?.name || form.street
          }
        }
      }
    };

    localStorage.setItem("ekoakort_user", JSON.stringify(userWithDetails));
    console.log("✓ LocalStorage'a kaydedildi");

    // 7. BAŞARI
    console.log("=== REGISTER BAŞARIYLA TAMAMLANDI ===");
    
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);

  } catch (error: any) {
    console.error("REGISTER CATCH HATASI:", error);
    setError("Beklenmeyen bir hata: " + (error.message || "Bilinmeyen hata"));
  } finally {
    setLoading(false);
  }
};

  const fallbackRegister = () => {
    const demoUser = {
      id: Date.now(),
      building_name: form.building,
      apartment_no: form.apartment_no,
      name: form.name || `Daire ${form.apartment_no} Sakin`,
      family_size: parseInt(form.family_size),
      street: form.street,
      email: form.email || "",
      created_at: new Date().toISOString(),
    };

    localStorage.setItem("ekoakort_user", JSON.stringify(demoUser));
    router.push("/dashboard");
  };

  const resetForm = () => {
    setForm({
      street: "",
      building: "",
      apartment_no: "",
      password: "",
      name: "",
      family_size: "3",
      email: "",
    });
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Eko-Akort</h1>
          <p className="text-gray-600">Akıllı Tasarruf Platformu</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Mod Seçimi */}
          <div className="flex mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setMode("login");
                resetForm();
              }}
              className={`flex-1 py-2 rounded-md text-center font-medium transition ${
                mode === "login" ? "bg-white shadow" : "text-gray-600"
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              Giriş Yap
            </button>
            <button
              onClick={() => {
                setMode("register");
                resetForm();
              }}
              className={`flex-1 py-2 rounded-md text-center font-medium transition ${
                mode === "register" ? "bg-white shadow" : "text-gray-600"
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Kayıt Ol
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Sokak Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sokak *
              </label>
              <div className="relative">
                <select
                  value={form.street}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      street: e.target.value,
                      building: "",
                      apartment_no: "",
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none pr-10"
                >
                  <option value="">Sokak seçin</option>
                  {streets.map((street, index) => (
                    <option key={index} value={street}>
                      {street}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Apartman Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apartman *
              </label>
              <div className="relative">
                <select
                  value={form.building}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      building: e.target.value,
                      apartment_no: "",
                    })
                  }
                  disabled={!form.street}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none pr-10 ${
                    !form.street
                      ? "bg-gray-50 text-gray-400"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Apartman seçin</option>
                  {filteredBuildings.map((building) => (
                    <option key={building.id} value={building.name}>
                      {building.name} ({building.floors} kat)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Daire Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daire No *
              </label>
              <div className="relative">
                <select
                  value={form.apartment_no}
                  onChange={(e) =>
                    setForm({ ...form, apartment_no: e.target.value })
                  }
                  disabled={!form.building}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none pr-10 ${
                    !form.building
                      ? "bg-gray-50 text-gray-400"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Daire seçin</option>
                  {availableApartments.map((apt:any) => (
                    <option key={apt} value={apt}>
                      Daire {apt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                  placeholder={
                    mode === "login" ? "Şifrenizi girin" : "En az 6 karakter"
                  }
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Kayıt için ek alanlar */}
            {mode === "register" && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adınız (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Adınız"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kişi Sayısı *
                    </label>
                    <select
                      value={form.family_size}
                      onChange={(e) =>
                        setForm({ ...form, family_size: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="1">1 Kişi</option>
                      <option value="2">2 Kişi</option>
                      <option value="3">3 Kişi</option>
                      <option value="4">4 Kişi</option>
                      <option value="5">5+ Kişi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta (İsteğe Bağlı)
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="ornek@email.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Hata Mesajı */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Demo Bilgisi */}
            {!error && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Test için:</strong>
                  <br />
                  <span className="text-xs">
                    Sokak: <strong>Gül Sokağı</strong> → Apartman:{" "}
                    <strong>Yeşil Apartmanı</strong> → Daire: <strong>3</strong>{" "}
                    → Şifre: <strong>daire3_yesilapt</strong>
                    <br />
                    <em>Yeni kayıt olmak için farklı bir daire seçin</em>
                  </span>
                </p>
              </div>
            )}

            {/* Gönder Butonu */}
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                !form.street ||
                !form.building ||
                !form.apartment_no ||
                !form.password
              }
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center mt-4"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  {mode === "login"
                    ? "Giriş Yapılıyor..."
                    : "Kayıt Yapılıyor..."}
                </>
              ) : (
                <>
                  {mode === "login" ? (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Giriş Yap
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Kayıt Ol
                    </>
                  )}
                </>
              )}
            </button>

            {/* Debug için Supabase Bağlantı Bilgisi */}
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
              <div className="font-mono truncate">
                {mode === "login" ? "🔐 Giriş modu" : "📝 Kayıt modu"} |
                Sokaklar: {streets.length} | Apartmanlar: {buildings.length}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Hackathon Projesi | Eko-Akort © 2025
          </p>
        </div>
      </div>
    </div>
  );
}
