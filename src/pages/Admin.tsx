import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Activity,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  role: string | null;
  specialization: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


const Admin = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'doctor' as string,
  });

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

    if (user && profile?.role === 'admin') {
      fetchData();
    }
  }, [user, profile, loading, navigate]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
         .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles((profilesData || []).filter(p => p.role !== 'receptionist') as Profile[]);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati podatke",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const createUser = async () => {
    try {
      setCreatingUser(true);
      
      console.log('Creating user with data:', {
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
      });

      // Call Edge Function to create user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      if (data?.error) {
        console.error('Edge function data error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: "Uspešno",
        description: "Korisnik je uspešno kreiran",
      });

      setIsCreateUserOpen(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'doctor',
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Greška",
        description: error.message || "Nije moguće kreirati korisnika",
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: `Korisnik je ${!currentStatus ? 'aktiviran' : 'deaktiviran'}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće promeniti status korisnika",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === user?.email) {
      toast({
        title: "Greška",
        description: "Ne možete obrisati svoj sopstveni nalog",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm('Da li ste sigurni da želite da obrišete ovog korisnika? Ova akcija se ne može poništiti.')) {
      try {
        // Find the user_id from the profile
        const profile = profiles.find(p => p.id === userId);
        if (!profile) {
          throw new Error('Profile not found');
        }

        // Call Edge Function to delete user from auth
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: {
            user_id: profile.user_id
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }
        if (data?.error) {
          console.error('Edge function data error:', data.error);
          throw new Error(data.error);
        }

        toast({
          title: "Uspešno",
          description: "Korisnik je uspešno obrisan",
        });

        fetchData();
      } catch (error: any) {
        console.error('Error deleting user:', error);
        toast({
          title: "Greška",
          description: error.message || "Nije moguće obrisati korisnika",
          variant: "destructive",
        });
      }
    }
  };


  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive text-destructive-foreground';
      case 'doctor': return 'bg-primary text-primary-foreground';
      case 'nurse': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'doctor': return 'Lekar';
      case 'nurse': return 'Sestra';
      default: return 'Nepoznato';
    }
  };


  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Učitavanje admin panela...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
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
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Upravljanje sistemom</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Korisnici</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Upravljanje korisnicima</h2>
                <p className="text-muted-foreground">Kreiranje i upravljanje korisnicima sistema</p>
              </div>
              
              <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-medical hover:shadow-medical">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Dodaj korisnika
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Kreiranje novog korisnika</DialogTitle>
                    <DialogDescription>
                      Unesite podatke za novog korisnika sistema
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Puno ime</Label>
                        <Input
                          id="full_name"
                          value={newUser.full_name}
                          onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="Petar Petrović"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Uloga</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as Profile['role'] }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            
                            <SelectItem value="nurse">Sestra</SelectItem>
                            <SelectItem value="doctor">Lekar</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="petar@pulsmedic.rs"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Privremena šifra</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                    
                    
                    {(newUser.role === 'doctor' || newUser.role === 'nurse') && (
                      <>
                      </>
                    )}
                    
                    <Button 
                      onClick={createUser} 
                      disabled={creatingUser}
                      className="w-full bg-gradient-medical hover:shadow-medical"
                    >
                      {creatingUser ? 'Kreiranje...' : 'Kreiraj korisnika'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Users List */}
            <div className="grid gap-4">
              {profiles.map((profile) => (
                <Card key={profile.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-card transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${profile.is_active ? 'bg-success/10' : 'bg-muted/50'}`}>
                          <Users className={`h-5 w-5 ${profile.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {profile.full_name || 'Bez imena'}
                          </h3>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={`text-xs ${getRoleBadgeColor(profile.role)}`}>
                              {getRoleText(profile.role)}
                            </Badge>
                            {profile.specialization && (
                              <Badge variant="outline" className="text-xs">
                                {profile.specialization}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                         <Button
                           variant="destructive"
                           size="sm"
                           onClick={() => deleteUser(profile.id, profile.email)}
                           className="transition-all duration-200"
                         >
                           <Trash2 className="h-4 w-4 mr-1" />
                           Obriši
                         </Button>
                         
                         <div className="flex items-center">
                           {profile.is_active ? (
                             <CheckCircle className="h-5 w-5 text-success" />
                           ) : (
                             <XCircle className="h-5 w-5 text-muted-foreground" />
                           )}
                         </div>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;