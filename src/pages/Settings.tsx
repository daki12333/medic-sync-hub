import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, User } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const Settings = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Greška",
        description: "Lozinke se ne poklapaju",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Greška",
        description: "Lozinka mora imati najmanje 6 karaktera",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Lozinka je uspešno promenjena",
      });

      setPasswordData({
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće promeniti lozinku",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-subtle">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hover:shadow-card transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Nazad
              </Button>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-medical p-2 rounded-lg shadow-medical">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Podešavanja</h1>
                  <p className="text-sm text-muted-foreground">Upravljanje nalogom</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Profile Info */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-primary" />
                  <span>Informacije o nalogu</span>
                </CardTitle>
                <CardDescription>Osnovni podaci o vašem nalogu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Puno ime</Label>
                  <p className="text-lg font-medium text-foreground">{profile?.full_name || 'Nije postavljeno'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="text-lg font-medium text-foreground">{profile?.email || 'Nije postavljeno'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Uloga</Label>
                  <p className="text-lg font-medium text-foreground capitalize">{profile?.role || 'Nije postavljeno'}</p>
                </div>
                {profile?.specialization && (
                  <div>
                    <Label className="text-muted-foreground">Specijalizacija</Label>
                    <p className="text-lg font-medium text-foreground">{profile.specialization}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Password Change */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <span>Promena lozinke</span>
                </CardTitle>
                <CardDescription>Promenite svoju lozinku za pristup sistemu</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova lozinka</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="transition-all duration-200 focus:shadow-medical"
                    />
                    <p className="text-xs text-muted-foreground">Lozinka mora imati najmanje 6 karaktera</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Potvrdite lozinku</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="transition-all duration-200 focus:shadow-medical"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-medical hover:shadow-medical transition-all duration-200"
                  >
                    {loading ? 'Čuvanje...' : 'Promeni lozinku'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
