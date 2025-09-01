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
import { Switch } from '@/components/ui/switch';
import {
  Users,
  UserPlus,
  Calendar,
  Settings,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Shield,
  Activity,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist';
  phone: string | null;
  specialization: string | null;
  license_number: string | null;
  is_active: boolean;
  created_at: string;
}

interface CalendarPermission {
  id: string;
  user_id: string;
  doctor_id: string;
  can_view: boolean;
  can_edit: boolean;
  user: { full_name: string; email: string };
  doctor: { full_name: string; email: string };
}

const Admin = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<CalendarPermission[]>([]);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'receptionist' as Profile['role'],
    phone: '',
    specialization: '',
    license_number: ''
  });

  const [permissionForm, setPermissionForm] = useState({
    user_id: '',
    doctor_id: '',
    can_view: false,
    can_edit: false
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
      setProfiles(profilesData || []);

      // Fetch calendar permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('calendar_permissions')
        .select(`
          *,
          user:profiles!calendar_permissions_user_id_fkey(full_name, email),
          doctor:profiles!calendar_permissions_doctor_id_fkey(full_name, email)
        `);

      if (permissionsError) throw permissionsError;
      setPermissions(permissionsData || []);

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
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: {
          full_name: newUser.full_name
        }
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          phone: newUser.phone || null,
          specialization: newUser.specialization || null,
          license_number: newUser.license_number || null,
        });

      if (profileError) throw profileError;

      toast({
        title: "Uspešno",
        description: "Korisnik je uspešno kreiran",
      });

      setIsCreateUserOpen(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'receptionist',
        phone: '',
        specialization: '',
        license_number: ''
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Greška",
        description: error.message || "Nije moguće kreirati korisnika",
        variant: "destructive",
      });
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

  const createPermission = async () => {
    try {
      const { error } = await supabase
        .from('calendar_permissions')
        .insert({
          user_id: permissionForm.user_id,
          doctor_id: permissionForm.doctor_id,
          can_view: permissionForm.can_view,
          can_edit: permissionForm.can_edit,
          created_by: profile?.id
        });

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Dozvola je uspešno kreirana",
      });

      setIsPermissionDialogOpen(false);
      setPermissionForm({
        user_id: '',
        doctor_id: '',
        can_view: false,
        can_edit: false
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće kreirati dozvolu",
        variant: "destructive",
      });
    }
  };

  const deletePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Dozvola je obrisana",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće obrisati dozvolu",
        variant: "destructive",
      });
    }
  };

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

  const doctors = profiles.filter(p => p.role === 'doctor');
  const nonAdminUsers = profiles.filter(p => p.role !== 'admin');

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Korisnici</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Dozvole za kalendare</span>
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
                            <SelectItem value="receptionist">Recepcioner</SelectItem>
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        value={newUser.phone}
                        onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+381 11 234 5678"
                      />
                    </div>
                    
                    {(newUser.role === 'doctor' || newUser.role === 'nurse') && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="specialization">Specijalizacija</Label>
                          <Input
                            id="specialization"
                            value={newUser.specialization}
                            onChange={(e) => setNewUser(prev => ({ ...prev, specialization: e.target.value }))}
                            placeholder="Opšta medicina"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="license_number">Broj licence</Label>
                          <Input
                            id="license_number"
                            value={newUser.license_number}
                            onChange={(e) => setNewUser(prev => ({ ...prev, license_number: e.target.value }))}
                            placeholder="LK123456"
                          />
                        </div>
                      </>
                    )}
                    
                    <Button onClick={createUser} className="w-full bg-gradient-medical hover:shadow-medical">
                      Kreiraj korisnika
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
                          variant={profile.is_active ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleUserStatus(profile.id, profile.is_active)}
                          className="transition-all duration-200"
                        >
                          {profile.is_active ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              Deaktiviraj
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Aktiviraj
                            </>
                          )}
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

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Dozvole za kalendare</h2>
                <p className="text-muted-foreground">Upravljanje pristupom kalendarima lekara</p>
              </div>
              
              <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-medical hover:shadow-medical">
                    <Calendar className="h-4 w-4 mr-2" />
                    Dodeli dozvolu
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Dodela dozvole za kalendar</DialogTitle>
                    <DialogDescription>
                      Odredite ko može da vidi i menja kalendar lekara
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_select">Korisnik</Label>
                      <Select value={permissionForm.user_id} onValueChange={(value) => setPermissionForm(prev => ({ ...prev, user_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite korisnika" />
                        </SelectTrigger>
                        <SelectContent>
                          {nonAdminUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({getRoleText(user.role)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="doctor_select">Lekar</Label>
                      <Select value={permissionForm.doctor_id} onValueChange={(value) => setPermissionForm(prev => ({ ...prev, doctor_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberite lekara" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map(doctor => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              {doctor.full_name} ({doctor.specialization})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can_view">Može da vidi kalendar</Label>
                        <Switch
                          id="can_view"
                          checked={permissionForm.can_view}
                          onCheckedChange={(checked) => setPermissionForm(prev => ({ ...prev, can_view: checked }))}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="can_edit">Može da menja kalendar</Label>
                        <Switch
                          id="can_edit"
                          checked={permissionForm.can_edit}
                          onCheckedChange={(checked) => setPermissionForm(prev => ({ ...prev, can_edit: checked }))}
                        />
                      </div>
                    </div>
                    
                    <Button onClick={createPermission} className="w-full bg-gradient-medical hover:shadow-medical">
                      Dodeli dozvolu
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Permissions List */}
            <div className="grid gap-4">
              {permissions.map((permission) => (
                <Card key={permission.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-card transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {permission.user.full_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Pristup kalendaru: <strong>{permission.doctor.full_name}</strong>
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {permission.can_view && (
                              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                                <Eye className="h-3 w-3 mr-1" />
                                Može da vidi
                              </Badge>
                            )}
                            {permission.can_edit && (
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                <Edit className="h-3 w-3 mr-1" />
                                Može da menja
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePermission(permission.id)}
                        className="hover:shadow-card transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {permissions.length === 0 && (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nema dozvola</h3>
                    <p className="text-muted-foreground">Dodajte dozvole da korisnici mogu pristupiti kalendarima lekara.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;