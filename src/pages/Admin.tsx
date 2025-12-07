import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Activity,
  ArrowLeft,
  CheckCircle,
  XCircle,
  KeyRound,
  Megaphone,
  Send,
  Phone,
  History,
  TrendingUp
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

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

interface SMSCampaign {
  id: string;
  message: string;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
}

const Admin = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Promotion states
  const [promotionMessage, setPromotionMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [sendingSMS, setSendingSMS] = useState(false);
  
  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'doctor' as string,
    specialization: ''
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

      // Fetch all patients with phone numbers
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .not('phone', 'is', null)
        .order('last_name', { ascending: true });

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // Fetch SMS campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('sms_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

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
          specialization: newUser.specialization
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
        specialization: ''
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

  const sendPasswordReset = async (userEmail: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: `Email za reset lozinke je poslat na ${userEmail}`,
      });
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće poslati email za reset lozinke",
        variant: "destructive",
      });
    }
  };

  const sendPromotion = async () => {
    if (!promotionMessage.trim()) {
      toast({
        title: "Greška",
        description: "Unesite tekst poruke",
        variant: "destructive",
      });
      return;
    }

    const recipientPhones = sendToAll
      ? patients.filter(p => p.phone).map(p => p.phone!)
      : patients.filter(p => selectedPatients.includes(p.id) && p.phone).map(p => p.phone!);

    if (recipientPhones.length === 0) {
      toast({
        title: "Greška",
        description: "Nema pacijenata sa brojevima telefona",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingSMS(true);
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          recipients: recipientPhones,
          message: promotionMessage,
          userId: user?.id
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Uspešno",
        description: `Promocija poslata na ${data.sent} broj(eva). ${data.failed > 0 ? `Neuspešno: ${data.failed}` : ''}`,
      });

      setPromotionMessage('');
      setSelectedPatients([]);
      fetchData(); // Refresh to get new campaign
    } catch (error: any) {
      console.error('Error sending promotion:', error);
      toast({
        title: "Greška",
        description: error.message || "Nije moguće poslati promociju",
        variant: "destructive",
      });
    } finally {
      setSendingSMS(false);
    }
  };

  const togglePatientSelection = (patientId: string) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const selectAllPatients = () => {
    setSelectedPatients(patients.map(p => p.id));
  };

  const deselectAllPatients = () => {
    setSelectedPatients([]);
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

  const patientsWithPhone = patients.filter(p => p.phone);

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
            <TabsTrigger value="promotions" className="flex items-center space-x-2">
              <Megaphone className="h-4 w-4" />
              <span>Promocije</span>
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
                    
                    
                    {newUser.role === 'doctor' && (
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Specijalizacija</Label>
                        <Input
                          id="specialization"
                          value={newUser.specialization}
                          onChange={(e) => setNewUser(prev => ({ ...prev, specialization: e.target.value }))}
                          placeholder="Kardiologija, Neurologija..."
                        />
                      </div>
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
                           variant="outline"
                           size="sm"
                           onClick={() => sendPasswordReset(profile.email)}
                           className="transition-all duration-200"
                         >
                           <KeyRound className="h-4 w-4 mr-1" />
                           Reset
                         </Button>
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

          {/* Promotions Tab */}
          <TabsContent value="promotions" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">SMS Promocije</h2>
              <p className="text-muted-foreground">Pošaljite promotivne poruke pacijentima</p>
            </div>

            {/* Campaign History */}
            {campaigns.length > 0 && (
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Istorija kampanja
                  </CardTitle>
                  <CardDescription>Prethodne SMS kampanje sa uspešnošću slanja</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3">
                      {campaigns.map((campaign) => {
                        const successRate = campaign.total_recipients > 0 
                          ? Math.round((campaign.successful_sends / campaign.total_recipients) * 100) 
                          : 0;
                        
                        return (
                          <div 
                            key={campaign.id} 
                            className="p-4 border border-border/50 rounded-lg bg-background/50"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground line-clamp-2">
                                  {campaign.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(campaign.created_at).toLocaleDateString('sr-RS', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className={`h-4 w-4 ${successRate >= 80 ? 'text-success' : successRate >= 50 ? 'text-warning' : 'text-destructive'}`} />
                                    <span className={`font-bold text-lg ${successRate >= 80 ? 'text-success' : successRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
                                      {successRate}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {campaign.successful_sends}/{campaign.total_recipients} poslato
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Message Input */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    Poruka
                  </CardTitle>
                  <CardDescription>Unesite tekst promotivne poruke</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Poštovani, obaveštavamo Vas o specijalnoj akciji..."
                    value={promotionMessage}
                    onChange={(e) => setPromotionMessage(e.target.value)}
                    className="min-h-[150px]"
                  />
                  <div className="text-sm text-muted-foreground">
                    Karaktera: {promotionMessage.length} / 160 (1 SMS)
                    {promotionMessage.length > 160 && (
                      <span className="text-warning ml-2">
                        ({Math.ceil(promotionMessage.length / 160)} SMS poruke)
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recipients Selection */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Primaoci ({patientsWithPhone.length})
                  </CardTitle>
                  <CardDescription>Izaberite kome šaljete poruku</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sendToAll" 
                        checked={sendToAll}
                        onCheckedChange={(checked) => {
                          setSendToAll(checked as boolean);
                          if (checked) setSelectedPatients([]);
                        }}
                      />
                      <Label htmlFor="sendToAll" className="font-medium">Pošalji svima</Label>
                    </div>
                  </div>

                  {!sendToAll && (
                    <>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAllPatients}>
                          Izaberi sve
                        </Button>
                        <Button variant="outline" size="sm" onClick={deselectAllPatients}>
                          Poništi izbor
                        </Button>
                      </div>
                      <ScrollArea className="h-[200px] border rounded-md p-3">
                        <div className="space-y-2">
                          {patientsWithPhone.map((patient) => (
                            <div key={patient.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={patient.id}
                                checked={selectedPatients.includes(patient.id)}
                                onCheckedChange={() => togglePatientSelection(patient.id)}
                              />
                              <Label htmlFor={patient.id} className="flex-1 cursor-pointer">
                                <span className="font-medium">{patient.first_name} {patient.last_name}</span>
                                <span className="text-muted-foreground ml-2 text-sm">{patient.phone}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <p className="text-sm text-muted-foreground">
                        Izabrano: {selectedPatients.length} pacijent(a)
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Send Button */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {sendToAll 
                        ? `Slanje na ${patientsWithPhone.length} broj(eva)`
                        : `Slanje na ${selectedPatients.length} izabrani(h) broj(eva)`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {promotionMessage.length > 0 
                        ? `${Math.ceil(promotionMessage.length / 160)} SMS po primaocu`
                        : 'Unesite poruku za slanje'
                      }
                    </p>
                  </div>
                  <Button 
                    onClick={sendPromotion}
                    disabled={sendingSMS || !promotionMessage.trim() || (!sendToAll && selectedPatients.length === 0)}
                    className="bg-gradient-medical hover:shadow-medical"
                    size="lg"
                  >
                    {sendingSMS ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Slanje...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Pošalji promociju
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
