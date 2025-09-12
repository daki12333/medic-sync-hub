import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import Sidebar from '@/components/Sidebar';
import { 
  Activity,
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  Sun,
  Moon,
  Bell,
  Search,
  Filter
} from 'lucide-react';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  lowStockItems: number;
  activeUsers: number;
}

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    lowStockItems: 0,
    activeUsers: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    const fetchStats = async () => {
      if (!user) return;

      try {
        // Total patients
        const { count: patientsCount } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // Today's appointments
        const today = new Date().toISOString().split('T')[0];
        const { count: todayAppointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('appointment_date', today)
          .in('status', ['scheduled', 'in_progress']);

        // Low stock items (items below minimum stock level)
        const { data: inventoryItems } = await supabase
          .from('inventory_items')
          .select('current_stock, min_stock_level');
        
        const lowStockCount = inventoryItems?.filter(item => 
          item.current_stock < item.min_stock_level
        ).length || 0;

        // Active users
        const { count: activeUsersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        setStats({
          totalPatients: patientsCount || 0,
          todayAppointments: todayAppointmentsCount || 0,
          lowStockItems: lowStockCount,
          activeUsers: activeUsersCount || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Učitavanje...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Ukupno pacijenata",
      value: stats.totalPatients,
      change: "+12%",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Današnji termini",
      value: stats.todayAppointments,
      change: "+5%",
      icon: Calendar,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Niska zaliha",
      value: stats.lowStockItems,
      change: stats.lowStockItems > 0 ? "⚠️" : "✅",
      icon: FileText,
      color: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-500/10"
    },
    {
      title: "Aktivni korisnici",
      value: stats.activeUsers,
      change: "+8%",
      icon: Activity,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-black/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-white text-xl font-bold">Dashboard</h1>
            <div className="text-sm text-gray-400">
              Dobrodošli, {profile?.full_name?.split(' ')[0] || 'Korisnik'}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Pretraži..."
                className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 w-64"
              />
            </div>
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full">
              <Bell className="w-5 h-5" />
            </Button>
            
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-500/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        stat.change.startsWith('+') ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {stat.change}
                      </span>
                    </div>
                    <h3 className="text-gray-400 text-sm font-medium mb-2">{stat.title}</h3>
                    <p className="text-white text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card 
              className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 backdrop-blur-xl border-blue-500/20 hover:from-blue-500/20 hover:to-cyan-500/10 transition-all duration-300 cursor-pointer group hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/20"
              onClick={() => navigate('/patients')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-4 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Pacijenti</h3>
                    <p className="text-gray-400 text-sm">Upravljaj pacijentima</p>
                  </div>
                </div>
                <div className="text-blue-400 text-sm font-medium">→ Otvori</div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-xl border-green-500/20 hover:from-green-500/20 hover:to-emerald-500/10 transition-all duration-300 cursor-pointer group hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/20"
              onClick={() => navigate('/appointments')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-4 bg-green-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Termini</h3>
                    <p className="text-gray-400 text-sm">Kalendar termina</p>
                  </div>
                </div>
                <div className="text-green-400 text-sm font-medium">→ Otvori</div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 backdrop-blur-xl border-purple-500/20 hover:from-purple-500/20 hover:to-pink-500/10 transition-all duration-300 cursor-pointer group hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/20"
              onClick={() => navigate('/specialist-report')}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-4 bg-purple-500/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold">Izvestaji</h3>
                    <p className="text-gray-400 text-sm">Specijalistički izvestaji</p>
                  </div>
                </div>
                <div className="text-purple-400 text-sm font-medium">→ Otvori</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white text-lg font-bold">Nedavne aktivnosti</h3>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "Novi pacijent registrovan", time: "prije 2 min", user: "Dr. Marković", type: "success" },
                  { action: "Termin otkazan", time: "prije 15 min", user: "Sestra Ana", type: "warning" },
                  { action: "Izvještaj kreiran", time: "prije 1h", user: "Dr. Petrov", type: "info" },
                  { action: "Sistem ažuriran", time: "prije 2h", user: "Administrator", type: "success" }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-green-400' :
                      activity.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{activity.action}</p>
                      <p className="text-gray-400 text-xs">{activity.user} • {activity.time}</p>
                    </div>
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;