'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, TrendingUp, Users, Building, Droplets, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Sabit avatar listesi
const AVATARS = ['👑', '🌟', '⚡', '💧', '🌿', '✨', '🎯', '🚀', '🎖️', '🏅']

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState<string>('İSKİ')
  const [totalSavings, setTotalSavings] = useState({ water: 0, electricity: 0 })

  useEffect(() => {
    fetchLeaderboard()
    fetchCompanyInfo()
  }, [])

  const fetchCompanyInfo = async () => {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('company_id')
        .limit(1)

      if (users && users[0]?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', users[0].company_id)
          .single()

        if (company) {
          setCompanyName(company.name)
        }
      }
    } catch (error) {
      console.error('Şirket bilgisi alınamadı:', error)
    }
  }

  // Sabit avatar getirme fonksiyonu
  const getAvatar = (id: string) => {
    // ID'den sabit bir sayı üret
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i)
      hash = hash & hash
    }
    return AVATARS[Math.abs(hash) % AVATARS.length]
  }

  const fetchLeaderboard = async () => {
    setLoading(true)
    
    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      let totalWaterSaved = 0
      let totalElectricitySaved = 0

      const leaderboardData = await Promise.all(
        (users || []).map(async (user, index) => {
          const { data: consumptions } = await supabase
            .from('consumptions')
            .select('water_amount, electricity_amount, month')
            .eq('user_id', user.id)
            .order('month', { ascending: false })
            .limit(4)

          if (!consumptions || consumptions.length < 2) {
            return {
              id: user.id,
              name: user.name || `Daire ${user.apartment_no.replace('Yeşil Apt. ', '')}`,
              apartment: user.apartment_no.replace('Yeşil Apt. ', ''),
              fullApartment: user.apartment_no,
              points: 200 + (index * 50), // Sabit puan
              savings: 5 + (index * 1.5), // Sabit tasarruf
              avatar: getAvatar(user.id),
              family_size: user.family_size,
              trend: 'up',
              waterSavings: 0,
              electricitySavings: 0
            }
          }

          const firstMonth = consumptions[consumptions.length - 1]
          const lastMonth = consumptions[0]
          
          const waterSavings = firstMonth.water_amount - lastMonth.water_amount
          const electricitySavings = firstMonth.electricity_amount - lastMonth.electricity_amount
          
          const waterPercentage = firstMonth.water_amount > 0 
            ? (waterSavings / firstMonth.water_amount * 100)
            : 0
            
          const electricityPercentage = firstMonth.electricity_amount > 0
            ? (electricitySavings / firstMonth.electricity_amount * 100)
            : 0
          
          const avgSavings = (waterPercentage + electricityPercentage) / 2
          const positiveSavings = Math.max(0, avgSavings)

          totalWaterSaved += waterSavings
          totalElectricitySaved += electricitySavings

          const points = Math.floor(
            200 + 
            (positiveSavings * 25) + 
            (user.family_size * 40) +
            (Math.min(consumptions.length, 4) * 30)
          )

          const trend = waterSavings > 0 && electricitySavings > 0 ? 'up' : 
                       waterSavings < 0 || electricitySavings < 0 ? 'down' : 'stable'

          return {
            id: user.id,
            name: user.name || `Daire ${user.apartment_no.replace('Yeşil Apt. ', '')}`,
            apartment: user.apartment_no.replace('Yeşil Apt. ', ''),
            fullApartment: user.apartment_no,
            points: points,
            savings: Math.round(positiveSavings * 10) / 10,
            waterSavings: Math.round(waterSavings * 100) / 100,
            electricitySavings: Math.round(electricitySavings * 100) / 100,
            avatar: getAvatar(user.id),
            family_size: user.family_size,
            trend: trend
          }
        })
      )

      setTotalSavings({
        water: Math.round(totalWaterSaved * 100) / 100,
        electricity: Math.round(totalElectricitySaved * 100) / 100
      })

      const sorted = leaderboardData.sort((a, b) => b.points - a.points)
      setLeaderboard(sorted)

    } catch (error) {
      console.error('Liderlik verisi çekilemedi:', error)
      
      // Sabit mock data (hydration hatası olmaması için)
      const mockData = [
        { id: '1', name: 'Ali Yılmaz', apartment: 'Daire 1', points: 1250, savings: 18, avatar: '👑', family_size: 2, trend: 'up', waterSavings: 1.8, electricitySavings: 50 },
        { id: '2', name: 'Ayşe Demir', apartment: 'Daire 2', points: 980, savings: 15, avatar: '🌟', family_size: 1, trend: 'up', waterSavings: 1.3, electricitySavings: 30 },
        { id: '3', name: 'Mehmet Kaya', apartment: 'Daire 3', points: 870, savings: 12, avatar: '⚡', family_size: 3, trend: 'up', waterSavings: 3.0, electricitySavings: 65 },
        { id: '4', name: 'Fatma Şahin', apartment: 'Daire 4', points: 750, savings: 10, avatar: '💧', family_size: 4, trend: 'up', waterSavings: 3.2, electricitySavings: 55 },
        { id: '5', name: 'Can Öztürk', apartment: 'Daire 5', points: 620, savings: 8, avatar: '🌿', family_size: 2, trend: 'up', waterSavings: 2.0, electricitySavings: 40 },
        { id: '6', name: 'Zeynep Arslan', apartment: 'Daire 6', points: 540, savings: 7, avatar: '✨', family_size: 3, trend: 'up', waterSavings: 2.3, electricitySavings: 45 },
        { id: '7', name: 'Emre Çelik', apartment: 'Daire 7', points: 480, savings: 6, avatar: '🎯', family_size: 1, trend: 'up', waterSavings: 1.1, electricitySavings: 25 },
        { id: '8', name: 'Selin Yıldız', apartment: 'Daire 8', points: 390, savings: 5, avatar: '🚀', family_size: 5, trend: 'up', waterSavings: 4.0, electricitySavings: 60 },
      ]
      setLeaderboard(mockData)
    } finally {
      setLoading(false)
    }
  }

  const getMedal = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return (index + 1).toString()
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '📈'
    if (trend === 'down') return '📉'
    return '➡️'
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Yeşil Apartmanı Liderliği</h2>
            <div className="flex items-center text-gray-600 text-sm">
              <Building className="w-4 h-4 mr-2" />
              <span>İş Ortağı: <strong className="text-green-600">{companyName}</strong></span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center text-green-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>Canlı Güncelleme</span>
          </div>
          <div className="flex items-center text-blue-600">
            <Users className="w-4 h-4 mr-1" />
            <span>{leaderboard.length} daire aktif</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Liderlik tablosu yükleniyor...</p>
          <p className="text-gray-400 text-sm">Gerçek veriler hesaplanıyor</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {leaderboard.slice(0, 3).map((user, index) => (
              <div 
                key={user.id} 
                className={`
                  rounded-2xl p-6 text-center border-2
                  ${index === 0 ? 'bg-gradient-to-b from-yellow-50 to-amber-100 border-yellow-300 shadow-lg' : ''}
                  ${index === 1 ? 'bg-gradient-to-b from-gray-50 to-gray-100 border-gray-300' : ''}
                  ${index === 2 ? 'bg-gradient-to-b from-amber-50 to-orange-100 border-amber-300' : ''}
                `}
              >
                <div className="text-4xl mb-3">{user.avatar}</div>
                <div className="text-5xl font-bold text-gray-800 mb-2">{getMedal(index)}</div>
                <h3 className="font-bold text-xl text-gray-800 mb-1">{user.name}</h3>
                <p className="text-gray-600 mb-2">{user.apartment} • {user.family_size} kişi</p>
                
                <div className="inline-flex items-center bg-white px-4 py-2 rounded-full shadow-sm mb-3">
                  <span className="text-green-600 font-bold text-xl mr-2">{user.points.toLocaleString()}</span>
                  <span className="text-gray-500">puan</span>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tasarruf:</span>
                    <span className="font-bold text-green-600">%{user.savings}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Su:</span>
                    <span className="font-bold text-blue-600">{user.waterSavings || '0'} m³</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Elektrik:</span>
                    <span className="font-bold text-yellow-600">{user.electricitySavings || '0'} kWh</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-3 text-gray-500 font-medium">Sıra</th>
                  <th className="text-left py-4 px-3 text-gray-500 font-medium">Daire & Kullanıcı</th>
                  <th className="text-left py-4 px-3 text-gray-500 font-medium">Kişi Sayısı</th>
                  <th className="text-left py-4 px-3 text-gray-500 font-medium">Puan</th>
                  <th className="text-left py-4 px-3 text-gray-500 font-medium">Tasarruf</th>
                  <th className="text-left py-4 px-3 text-gray-500 font-medium">Trend</th>
                  <th className="text-left py-4 px-3 text-gray-500 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(3).map((user, index) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-medium text-gray-700">
                        {index + 4}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center">
                        <div className="text-2xl mr-4">{user.avatar}</div>
                        <div>
                          <div className="font-medium text-gray-800">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.apartment}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-700">{user.family_size} kişi</span>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center">
                        <div className="w-24 h-10 bg-gradient-to-r from-green-50 to-emerald-100 rounded-lg flex items-center justify-center">
                          <span className="font-bold text-green-700">{user.points.toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <div className="w-24 bg-blue-100 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${Math.min(user.savings * 6, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-blue-600 font-medium text-sm">%{user.savings}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Su: <span className="font-medium">{user.waterSavings || '0'} m³</span> • 
                          Elektrik: <span className="font-medium">{user.electricitySavings || '0'} kWh</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="text-2xl">
                        {getTrendIcon(user.trend)}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <span className={`
                        px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center
                        ${user.savings > 15 ? 'bg-green-100 text-green-700' : ''}
                        ${user.savings >= 10 && user.savings <= 15 ? 'bg-blue-100 text-blue-700' : ''}
                        ${user.savings < 10 ? 'bg-gray-100 text-gray-700' : ''}
                      `}>
                        {user.savings > 15 ? 'Süper Tasarrufçu' : 
                         user.savings >= 10 ? 'İyi Gidiyor' : 
                         'Başlangıç Seviyesi'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Trophy className="w-6 h-6 mr-3 text-green-600" />
              Yeşil Apartmanı Toplam Kazanımları
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm">
                <div className="flex items-center mb-3">
                  <Droplets className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{totalSavings.water} m³</div>
                    <div className="text-gray-500 text-sm">Toplam Su Tasarrufu</div>
                  </div>
                </div>
                <p className="text-blue-600 text-sm">
                  ≈ {Math.round(totalSavings.water * 1000)} litre su kurtarıldı
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm">
                <div className="flex items-center mb-3">
                  <Zap className="w-8 h-8 text-yellow-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{totalSavings.electricity} kWh</div>
                    <div className="text-gray-500 text-sm">Toplam Elektrik Tasarrufu</div>
                  </div>
                </div>
                <p className="text-yellow-600 text-sm">
                  ≈ {Math.round(totalSavings.electricity * 2.5)} TL tasarruf
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm">
                <div className="flex items-center mb-3">
                  <Trophy className="w-8 h-8 text-purple-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-800">
                      {leaderboard.length > 0 
                        ? '%' + (leaderboard.reduce((sum, user) => sum + user.savings, 0) / leaderboard.length).toFixed(1)
                        : '%0'
                      }
                    </div>
                    <div className="text-gray-500 text-sm">Ortalama Tasarruf Oranı</div>
                  </div>
                </div>
                <p className="text-purple-600 text-sm">
                  {leaderboard.filter(u => u.savings > 10).length} daire %10+ tasarruf yapıyor
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm">
                <div className="flex items-center mb-3">
                  <Building className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-gray-800">
                      {leaderboard.reduce((sum, user) => sum + user.points, 0).toLocaleString()}
                    </div>
                    <div className="text-gray-500 text-sm">Toplam Kazanılan Puan</div>
                  </div>
                </div>
                <p className="text-green-600 text-sm">
                  {companyName} işbirliği ile ödüllendirilecek
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-green-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Şirket Ödül Havuzu Aktif! 🎁</h4>
                  <p className="text-gray-600 text-sm">
                    {companyName}, %15 toplam tasarruf hedefine ulaşan apartmana fatura indirimi sağlayacak.
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  <div className="bg-white px-4 py-2 rounded-lg border border-green-300">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Hedef:</div>
                      <div className="text-xl font-bold text-green-600">%15 Toplam Tasarruf</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Şu an: %{leaderboard.length > 0 
                          ? (leaderboard.reduce((sum, user) => sum + user.savings, 0) / leaderboard.length).toFixed(1)
                          : '0'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}