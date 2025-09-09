import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Users, 
  Package, 
  ClipboardList, 
  Settings, 
  LogOut, 
  Activity,
  UserPlus,
  Bell,
  FileText
} from 'lucide-react';

interface DashboardStats {
  totalPatients: number;
}

const Dashboard = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0
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

        setStats({
          totalPatients: patientsCount || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Učitavanje...</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'doctor': return 'bg-primary text-primary-foreground';
      case 'nurse': return 'bg-success text-success-foreground';
      case 'receptionist': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'doctor': return 'Lekar';
      case 'nurse': return 'Sestra';
      case 'receptionist': return 'Recepcioner';
      default: return 'Nepoznato';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-medical p-2 rounded-lg shadow-medical">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">PulsMedic</h1>
              <p className="text-sm text-muted-foreground">Sistem za upravljanje ordinacijom</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {profile?.full_name || 'Korisnik'}
              </p>
              <Badge className={`text-xs ${getRoleBadgeColor(profile?.role || '')}`}>
                {getRoleText(profile?.role || '')}
              </Badge>
            </div>
            <Button
              variant="glass"
              size="icon"
              onClick={handleSignOut}
              className="hover:shadow-glass-hover hover:text-destructive transition-all duration-300"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Dobrodošli, {profile?.full_name?.split(' ')[0] || 'Korisnik'}!
          </h2>
          <p className="text-muted-foreground">
            Pregled aktivnosti vaše ordinacije za danas
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8 max-w-md">
          <Card className="glass glass-hover border-border/20 shadow-glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno pacijenata</CardTitle>
              <div className="p-2 bg-success/10 rounded-lg">
                <Users className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground bg-gradient-medical bg-clip-text text-transparent">{stats.totalPatients}</div>
              <p className="text-xs text-muted-foreground">
                aktivnih pacijenata
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="card-professional cursor-pointer group shadow-glass border-border/20 overflow-hidden relative"
            onClick={() => navigate('/patients')}
          >
            <div className="absolute inset-0 bg-gradient-medical opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 shadow-inset">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">Upravljaj pacijentima</CardTitle>
                  <CardDescription className="group-hover:text-primary/70 transition-colors duration-300">Dodaj i upravljaj pacijentima</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="card-professional cursor-pointer group shadow-glass border-border/20 overflow-hidden relative"
            onClick={() => navigate('/appointments')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-success/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-3">
                <div className="bg-success/10 p-3 rounded-xl group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300 shadow-inset">
                  <Calendar className="h-6 w-6 text-success" />
                </div>
                <div>
                  <CardTitle className="text-lg group-hover:text-success transition-colors duration-300">Kalendar termina</CardTitle>
                  <CardDescription className="group-hover:text-success/70 transition-colors duration-300">Zakaži i upravljaj terminima</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card 
            className="card-professional cursor-pointer group shadow-glass border-border/20 overflow-hidden relative"
            onClick={() => navigate('/specialist-report')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-3">
                <div className="bg-accent/10 p-3 rounded-xl group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300 shadow-inset">
                  <FileText className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg group-hover:text-accent-foreground transition-colors duration-300">Specijalistički izvještaj</CardTitle>
                  <CardDescription className="group-hover:text-accent-foreground/70 transition-colors duration-300">Kreiraj i štampaj izvještaje</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>


          {profile?.role === 'admin' && (
            <Card 
              className="card-professional cursor-pointer group shadow-glass border-border/20 overflow-hidden relative"
              onClick={() => navigate('/admin')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="bg-destructive/10 p-3 rounded-xl group-hover:bg-destructive/20 group-hover:scale-110 transition-all duration-300 shadow-inset">
                    <Settings className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-destructive transition-colors duration-300">Administracija</CardTitle>
                    <CardDescription className="group-hover:text-destructive/70 transition-colors duration-300">Upravljanje korisnicima i sistemom</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;