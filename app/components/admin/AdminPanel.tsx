// app/components/admin/AdminPanel.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Building,
  Home,
  Users,
  BarChart3,
  Edit2,
  Trash2,
  Plus,
  Search,
  Download,
  RefreshCw,
  Shield,
  LogOut,
  Zap,
  Droplets,
  CreditCard,
  Database,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({});
  
  // Tablolar için state'ler
  const [streets, setStreets] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [consumptions, setConsumptions] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "streets":
          const { data: streetsData } = await supabase
            .from("streets")
            .select("*")
            .order("name");
          setStreets(streetsData || []);
          break;
          
        case "buildings":
          const { data: buildingsData } = await supabase
            .from("buildings")
            .select("*, streets(name)")
            .order("name");
          setBuildings(buildingsData || []);
          break;
          
        case "companies":
          const { data: companiesData } = await supabase
            .from("companies")
            .select("*")
            .order("name");
          setCompanies(companiesData || []);
          break;
          
        case "users":
          const { data: usersData } = await supabase
            .from("users")
            .select("*, apartments(number, buildings(name, streets(name)))")
            .order("created_at", { ascending: false })
            .limit(50);
          setUsers(usersData || []);
          break;
          
        case "consumptions":
          const { data: consumptionsData } = await supabase
            .from("consumptions")
            .select("*, users(name)")
            .order("created_at", { ascending: false })
            .limit(100);
          setConsumptions(consumptionsData || []);
          break;
          
        default:
          // Dashboard için tüm istatistikleri getir
          const [
            { count: streetsCount },
            { count: buildingsCount },
            { count: companiesCount },
            { count: usersCount },
            { count: consumptionsCount },
            { data: waterData },
            { data: electricityData }
          ] = await Promise.all([
            supabase.from("streets").select("*", { count: "exact" }),
            supabase.from("buildings").select("*", { count: "exact" }),
            supabase.from("companies").select("*", { count: "exact" }),
            supabase.from("users").select("*", { count: "exact" }),
            supabase.from("consumptions").select("*", { count: "exact" }),
            supabase.from("consumptions").select("water_amount").limit(1000),
            supabase.from("consumptions").select("electricity_amount").limit(1000)
          ]);
          
          const totalWater = waterData?.reduce((sum, item) => sum + (item.water_amount || 0), 0) || 0;
          const totalElectricity = electricityData?.reduce((sum, item) => sum + (item.electricity_amount || 0), 0) || 0;
          
          setData({
            streetsCount,
            buildingsCount,
            companiesCount,
            usersCount,
            consumptionsCount,
            totalWater: Math.round(totalWater * 100) / 100,
            totalElectricity: Math.round(totalElectricity * 100) / 100
          });
      }
    } catch (error) {
      console.error("Veri yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    switch (activeTab) {
      case "streets":
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-6 text-left">ID</th>
                <th className="py-3 px-6 text-left">Sokak Adı</th>
                <th className="py-3 px-6 text-left">Oluşturulma</th>
                <th className="py-3 px-6 text-left">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {streets.map(street => (
                <tr key={street.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-6">{street.id}</td>
                  <td className="py-3 px-6 font-medium">{street.name}</td>
                  <td className="py-3 px-6">{new Date(street.created_at).toLocaleDateString("tr-TR")}</td>
                  <td className="py-3 px-6">
                    <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        
      case "buildings":
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-6 text-left">Apartman</th>
                <th className="py-3 px-6 text-left">Sokak</th>
                <th className="py-3 px-6 text-left">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map(building => (
                <tr key={building.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-6 font-medium">{building.name}</td>
                  <td className="py-3 px-6">{building.streets?.name}</td>
                  <td className="py-3 px-6">
                    <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
        
      // Diğer tablolar için benzer yapılar...
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-gray-700 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
              <p className="text-gray-600 text-sm">Sistem Yönetimi</p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-t">
          {[
            { id: "dashboard", icon: BarChart3, label: "Dashboard" },
            { id: "streets", icon: Building, label: "Sokaklar" },
            { id: "buildings", icon: Home, label: "Apartmanlar" },
            { id: "companies", icon: CreditCard, label: "Şirketler" },
            { id: "users", icon: Users, label: "Kullanıcılar" },
            { id: "consumptions", icon: Database, label: "Tüketimler" },
            { id: "settings", icon: Settings, label: "Ayarlar" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 border-b-2 transition ${
                activeTab === tab.id
                  ? "border-gray-800 text-gray-800"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
            <p className="mt-4 text-gray-600">Yükleniyor...</p>
          </div>
        ) : activeTab === "dashboard" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <Building className="w-10 h-10 text-blue-500 mr-4" />
                <div>
                  <div className="text-2xl font-bold">{data.streetsCount || 0}</div>
                  <div className="text-gray-500">Sokak</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <Home className="w-10 h-10 text-green-500 mr-4" />
                <div>
                  <div className="text-2xl font-bold">{data.buildingsCount || 0}</div>
                  <div className="text-gray-500">Apartman</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <Users className="w-10 h-10 text-purple-500 mr-4" />
                <div>
                  <div className="text-2xl font-bold">{data.usersCount || 0}</div>
                  <div className="text-gray-500">Kullanıcı</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <Database className="w-10 h-10 text-yellow-500 mr-4" />
                <div>
                  <div className="text-2xl font-bold">{data.consumptionsCount || 0}</div>
                  <div className="text-gray-500">Kayıt</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <Droplets className="w-10 h-10 text-blue-500 mr-4" />
                <div>
                  <div className="text-2xl font-bold">{data.totalWater || 0}</div>
                  <div className="text-gray-500">Toplam Su (m³)</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow border">
              <div className="flex items-center">
                <Zap className="w-10 h-10 text-yellow-500 mr-4" />
                <div>
                  <div className="text-2xl font-bold">{data.totalElectricity || 0}</div>
                  <div className="text-gray-500">Toplam Elektrik (kWh)</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">
                  {activeTab === "streets" && "Sokaklar"}
                  {activeTab === "buildings" && "Apartmanlar"}
                  {activeTab === "companies" && "Şirketler"}
                  {activeTab === "users" && "Kullanıcılar"}
                  {activeTab === "consumptions" && "Tüketim Kayıtları"}
                  {activeTab === "settings" && "Ayarlar"}
                </h2>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={fetchDashboardData}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  
                  {activeTab !== "settings" && activeTab !== "dashboard" && (
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Yeni Ekle
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {renderTable()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}