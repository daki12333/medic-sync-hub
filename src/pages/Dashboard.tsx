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
  recentChanges24h: number;
  activeUsers: number;
}

interface RecentActivity {
  id: string;
  action: string;
  time: string;
  user: string;
  type: 'success' | 'warning' | 'info';
}

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    recentChanges24h: 0,
    activeUsers: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const fetchRecentActivities = async () => {
    try {
      // Get recent activities from activity_logs table with user info
      const { data: activities } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          event_type,
          table_name,
          created_at,
          profiles!activity_logs_performed_by_fkey(full_name, role)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activities && activities.length > 0) {
        const formattedActivities: RecentActivity[] = activities.map((activity, index) => {
          const performerInfo = activity.profiles as any;
          const performerName = performerInfo?.full_name || 'Nepoznat korisnik';
          
          let actionType: 'success' | 'warning' | 'info' = 'info';
          if (activity.event_type === 'insert') actionType = 'success';
          else if (activity.event_type === 'delete') actionType = 'warning';
          else if (activity.event_type === 'update') actionType = 'info';

          // Make action more user-friendly
          let friendlyAction = activity.action;
          if (activity.table_name === 'patients') {
            if (activity.event_type === 'insert') {
              friendlyAction = 'Registrovan novi pacijent';
            } else if (activity.event_type === 'update') {
              friendlyAction = 'Ažuriran pacijent';
            }
          } else if (activity.table_name === 'appointments') {
            if (activity.event_type === 'insert') {
              friendlyAction = 'Zakazan novi termin';
            } else if (activity.event_type === 'update') {
              friendlyAction = 'Ažuriran termin';
            } else if (activity.event_type === 'delete') {
              friendlyAction = 'Otkazan termin';
            }
          } else if (activity.table_name === 'profiles') {
            friendlyAction = 'Ažuriran profil korisnika';
          }

          return {
            id: `activity-${activity.id}`,
            action: friendlyAction,
            time: formatTimeAgo(activity.created_at),
            user: performerName,
            type: actionType
          };
        });

        setRecentActivities(formattedActivities);
      } else {
        // Fallback to simple queries if activity_logs is empty
        await fetchSimpleActivities();
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      // Fallback to simple queries
      await fetchSimpleActivities();
    }
  };

  const fetchSimpleActivities = async () => {
    try {
      const simpleActivities: RecentActivity[] = [];
      
      // Simple patients query
      const { data: patients } = await supabase
        .from('patients')
        .select('first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      patients?.forEach((patient, index) => {
        simpleActivities.push({
          id: `simple-patient-${index}`,
          action: `Registrovan novi pacijent: ${patient.first_name} ${patient.last_name}`,
          time: formatTimeAgo(patient.created_at),
          user: "Sistem",
          type: 'success'
        });
      });

      // Simple appointments query (if any exist)
      const { data: appointments } = await supabase
        .from('appointments')
        .select('created_at, reason')
        .order('created_at', { ascending: false })
        .limit(3);

      appointments?.forEach((appointment, index) => {
        simpleActivities.push({
          id: `simple-appointment-${index}`,
          action: `Zakazan novi termin - ${appointment.reason || 'Pregled'}`,
          time: formatTimeAgo(appointment.created_at),
          user: "Sistem",
          type: 'info'
        });
      });

      if (simpleActivities.length === 0) {
        simpleActivities.push({
          id: 'fallback-1',
          action: "Sistem je spreman za rad", 
          time: "prije 1 min", 
          user: "PulsMedic Sistem", 
          type: "success" 
        });
      }

      setRecentActivities(simpleActivities.slice(0, 6));
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      setRecentActivities([
        { 
          id: 'fallback-1',
          action: "Sistem je spreman za rad", 
          time: "prije 1 min", 
          user: "PulsMedic Sistem", 
          type: "success" 
        }
      ]);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "upravo sada";
    if (diffInMinutes < 60) return `prije ${diffInMinutes} min`;
    if (diffInHours < 24) return `prije ${diffInHours}h`;
    return `prije ${diffInDays} dana`;
  };

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

        // Recent changes in last 24h
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString();

        const [patientsChanges, appointmentsChanges, profilesChanges] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true })
            .gte('created_at', yesterdayISO),
          supabase.from('appointments').select('*', { count: 'exact', head: true })
            .gte('created_at', yesterdayISO),
          supabase.from('profiles').select('*', { count: 'exact', head: true })
            .gte('updated_at', yesterdayISO)
        ]);

        const totalRecentChanges = (patientsChanges.count || 0) + 
                                  (appointmentsChanges.count || 0) + 
                                  (profilesChanges.count || 0);

        // Active users
        const { count: activeUsersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        setStats({
          totalPatients: patientsCount || 0,
          todayAppointments: todayAppointmentsCount || 0,
          recentChanges24h: totalRecentChanges,
          activeUsers: activeUsersCount || 0
        });

        // Fetch recent activities
        await fetchRecentActivities();
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    if (user) {
      fetchStats();
      // Also refresh activities every 30 seconds to catch new changes
      const interval = setInterval(() => {
        fetchRecentActivities();
      }, 30000);
      
      return () => clearInterval(interval);
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
      title: "Promene (24h)",
      value: stats.recentChanges24h,
      change: stats.recentChanges24h > 5 ? "📈" : "📊",
      icon: TrendingUp,
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
                {recentActivities.length > 0 ? recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
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
                )) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Nema nedavnih aktivnosti</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;