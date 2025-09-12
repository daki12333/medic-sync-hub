import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  Activity,
  FileText,
  Home
} from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'doctor': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'nurse': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'receptionist': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
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

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Pacijenti', path: '/patients' },
    { icon: Calendar, label: 'Termini', path: '/appointments' },
    { icon: FileText, label: 'Izvestaji', path: '/specialist-report' },
    ...(profile?.role === 'admin' ? [{ icon: Settings, label: 'Administracija', path: '/admin' }] : [])
  ];

  return (
    <div className="w-64 h-screen bg-black/95 backdrop-blur-xl border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">PulsMedic</h1>
            <p className="text-gray-400 text-xs">Medical Practice</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-white/10 text-white shadow-lg shadow-white/5' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-green-400' : 'group-hover:text-green-400'} transition-colors`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {profile?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">
              {profile?.full_name || 'Korisnik'}
            </p>
            <Badge className={`text-xs px-2 py-1 ${getRoleBadgeColor(profile?.role || '')}`}>
              {getRoleText(profile?.role || '')}
            </Badge>
          </div>
        </div>
        
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-400 hover:text-red-400 hover:bg-red-500/5"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Odjavi se
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;