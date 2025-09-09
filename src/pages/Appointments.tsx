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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Plus,
  ArrowLeft,
  Activity,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2
} from 'lucide-react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string | null;
  notes: string | null;
  diagnosis: string | null;
  treatment: string | null;
  next_appointment_needed: boolean;
  created_at: string;
  patients: Patient;
  profiles: Doctor;
}

const Appointments = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isCreateAppointmentOpen, setIsCreateAppointmentOpen] = useState(false);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
    duration_minutes: 30
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchData();
    }
  }, [user, loading, navigate]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner (id, first_name, last_name),
          profiles!appointments_doctor_id_fkey (id, full_name, specialization)
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      
      // Filter out appointments with failed joins and properly type the data
      const validAppointments = (appointmentsData || []).filter(appointment => 
        appointment.patients && 
        appointment.profiles && 
        typeof appointment.patients === 'object' &&
        typeof appointment.profiles === 'object' &&
        !('error' in appointment.patients) &&
        !('error' in appointment.profiles)
      ) as Appointment[];
      
      setAppointments(validAppointments);

      // Fetch patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // Fetch doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('profiles')
        .select('id, full_name, specialization')
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (doctorsError) throw doctorsError;
      setDoctors(doctorsData || []);

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

  const createAppointment = async () => {
    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentForm,
          created_by: profile?.id
        });

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Termin je uspešno zakazan",
      });

      setIsCreateAppointmentOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Greška",
        description: error.message || "Nije moguće zakazati termin",
        variant: "destructive",
      });
    }
  };

  const updateAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update(appointmentForm)
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Termin je ažuriran",
      });

      setIsEditAppointmentOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Greška",
        description: error.message || "Nije moguće ažurirati termin",
        variant: "destructive",
      });
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: Appointment['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Status termina je ažuriran",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće ažurirati status",
        variant: "destructive",
      });
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Termin je otkazan",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće otkazati termin",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setAppointmentForm({
      patient_id: '',
      doctor_id: '',
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '',
      duration_minutes: 30
    });
    setSelectedAppointment(null);
  };

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setAppointmentForm({
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      duration_minutes: appointment.duration_minutes
    });
    setIsEditAppointmentOpen(true);
  };

  const getStatusBadge = (status: Appointment['status']) => {
    const statusConfig = {
      scheduled: { color: 'bg-muted text-muted-foreground', text: 'Zakazano', icon: Clock },
      confirmed: { color: 'bg-primary text-primary-foreground', text: 'Potvrđeno', icon: CheckCircle },
      in_progress: { color: 'bg-warning text-warning-foreground', text: 'U toku', icon: Activity },
      completed: { color: 'bg-success text-success-foreground', text: 'Završeno', icon: CheckCircle },
      cancelled: { color: 'bg-destructive text-destructive-foreground', text: 'Otkazano', icon: XCircle },
      no_show: { color: 'bg-muted text-muted-foreground', text: 'Nije došao', icon: AlertCircle }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Učitavanje termina...</p>
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
              variant="floating"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="btn-float"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazad
            </Button>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-medical p-2 rounded-lg shadow-medical">
                <Calendar className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Kalendar termina</h1>
                <p className="text-sm text-muted-foreground">Upravljanje terminima</p>
              </div>
            </div>
          </div>
          
          <Dialog open={isCreateAppointmentOpen} onOpenChange={setIsCreateAppointmentOpen}>
            <DialogTrigger asChild>
              <Button variant="premium" className="btn-float">
                <Plus className="h-4 w-4 mr-2" />
                Zakaži termin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Zakazivanje novog termina</DialogTitle>
                <DialogDescription>
                  Unesite podatke za novi termin
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="patient_select">Pacijent</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/patients')}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Dodaj novog
                    </Button>
                  </div>
                  <Select value={appointmentForm.patient_id} onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, patient_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite pacijenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="doctor_select">Lekar</Label>
                  <Select value={appointmentForm.doctor_id} onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, doctor_id: value }))}>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment_date">Datum</Label>
                    <Input
                      id="appointment_date"
                      type="date"
                      value={appointmentForm.appointment_date}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointment_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointment_time">Vreme</Label>
                    <Input
                      id="appointment_time"
                      type="time"
                      value={appointmentForm.appointment_time}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointment_time: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Trajanje (minuti)</Label>
                  <Select value={appointmentForm.duration_minutes.toString()} onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, duration_minutes: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 minuta</SelectItem>
                      <SelectItem value="30">30 minuta</SelectItem>
                      <SelectItem value="45">45 minuta</SelectItem>
                      <SelectItem value="60">60 minuta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={createAppointment} className="w-full bg-gradient-medical hover:shadow-medical">
                  Zakaži termin
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">Svi termini</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-4">
              <Label htmlFor="date_picker">Datum:</Label>
              <Input
                id="date_picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>

          {/* All Appointments */}
          <TabsContent value="all" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Svi termini
              </h2>
              <p className="text-muted-foreground">
                {appointments.length} ukupno termina
              </p>
            </div>

            <div className="grid gap-4">
              {appointments.map((appointment) => (
                <Card key={appointment.id} className="card-professional group shadow-glass border-border/20 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                              {appointment.patients.first_name} {appointment.patients.last_name}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(appointment.appointment_date).toLocaleDateString('sr-RS')}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>{appointment.appointment_time} ({appointment.duration_minutes} min)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>Dr {appointment.profiles.full_name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {appointment.status === 'scheduled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            className="text-primary hover:bg-primary/10"
                          >
                            Potvrdi
                          </Button>
                        )}
                        {appointment.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            className="text-success hover:bg-success/10"
                          >
                            Završi
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(appointment)}
                          className="hover:shadow-card transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAppointment(appointment.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {appointments.length === 0 && (
                <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Nema termina</h3>
                    <p className="text-muted-foreground">
                      Trenutno nema zakazanih termina. Kliknite na "Zakaži termin" da dodate novi.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Appointment Dialog */}
        <Dialog open={isEditAppointmentOpen} onOpenChange={setIsEditAppointmentOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ažuriranje termina</DialogTitle>
              <DialogDescription>
                Izmenite podatke termina
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient_select">Pacijent</Label>
                <Select value={appointmentForm.patient_id} onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, patient_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Izaberite pacijenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="doctor_select">Lekar</Label>
                <Select value={appointmentForm.doctor_id} onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, doctor_id: value }))}>
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment_date">Datum</Label>
                  <Input
                    id="appointment_date"
                    type="date"
                    value={appointmentForm.appointment_date}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointment_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointment_time">Vreme</Label>
                  <Input
                    id="appointment_time"
                    type="time"
                    value={appointmentForm.appointment_time}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointment_time: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Trajanje (minuti)</Label>
                <Select value={appointmentForm.duration_minutes.toString()} onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, duration_minutes: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20 minuta</SelectItem>
                    <SelectItem value="30">30 minuta</SelectItem>
                    <SelectItem value="45">45 minuta</SelectItem>
                    <SelectItem value="60">60 minuta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={updateAppointment} className="w-full bg-gradient-medical hover:shadow-medical">
                Ažuriraj termin
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Appointments;