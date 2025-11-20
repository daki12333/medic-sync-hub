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
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientSearchDropdown } from '@/components/PatientSearchDropdown';
import { DoctorSearchDropdown } from '@/components/DoctorSearchDropdown';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
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
  created_at: string;
  patients: Patient;
  doctor: Doctor;
}

const Appointments = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isCreateAppointmentOpen, setIsCreateAppointmentOpen] = useState(false);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeConflict, setTimeConflict] = useState<{ hasConflict: boolean; conflictTime: string } | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'time'>('date');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('');
  
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

  const checkTimeConflict = async (doctorId: string, date: string, time: string, duration: number, excludeId?: string) => {
    if (!doctorId || !date || !time) {
      setTimeConflict(null);
      return;
    }

    try {
      const [hours, minutes] = time.split(':').map(Number);
      const selectedMinutes = hours * 60 + minutes;
      const selectedEndMinutes = selectedMinutes + duration;

      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('appointment_time, duration_minutes, id')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .neq('status', 'cancelled');

      if (existingAppointments && existingAppointments.length > 0) {
        for (const apt of existingAppointments) {
          if (excludeId && apt.id === excludeId) continue;

          const [aptHours, aptMinutes] = apt.appointment_time.split(':').map(Number);
          const aptStartMinutes = aptHours * 60 + aptMinutes;
          const aptEndMinutes = aptStartMinutes + (apt.duration_minutes || 30);

          // Check if times overlap
          if (
            (selectedMinutes >= aptStartMinutes && selectedMinutes < aptEndMinutes) ||
            (selectedEndMinutes > aptStartMinutes && selectedEndMinutes <= aptEndMinutes) ||
            (selectedMinutes <= aptStartMinutes && selectedEndMinutes >= aptEndMinutes)
          ) {
            setTimeConflict({
              hasConflict: true,
              conflictTime: apt.appointment_time
            });
            return;
          }
        }
      }
      
      setTimeConflict(null);
    } catch (error) {
      console.error('Error checking time conflict:', error);
      setTimeConflict(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch appointments with patients
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner (id, first_name, last_name)
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      
      // Get all doctor IDs from appointments
      const doctorIds = [...new Set(appointmentsData?.map(apt => apt.doctor_id) || [])];
      
      // Fetch doctors separately
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('profiles')
        .select('user_id, full_name, specialization')
        .in('user_id', doctorIds);

      if (doctorsError) throw doctorsError;
      
      // Create a map of doctors by user_id
      const doctorsMap = new Map(doctorsData?.map(doc => [doc.user_id, doc]) || []);
      
      // Combine appointments with doctor data
      const appointmentsWithDoctors = appointmentsData?.map(appointment => ({
        ...appointment,
        doctor: doctorsMap.get(appointment.doctor_id) ? {
          id: doctorsMap.get(appointment.doctor_id)!.user_id,
          full_name: doctorsMap.get(appointment.doctor_id)!.full_name,
          specialization: doctorsMap.get(appointment.doctor_id)!.specialization
        } : null
      })).filter(apt => apt.doctor) || [];
      
      setAppointments(appointmentsWithDoctors as Appointment[]);

      // Fetch patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name', { ascending: true });

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // Fetch doctors for form
      const { data: allDoctorsData, error: allDoctorsError } = await supabase
        .from('profiles')
        .select('user_id, full_name, specialization')
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (allDoctorsError) throw allDoctorsError;
      setDoctors((allDoctorsData || []).map(doc => ({
        id: doc.user_id,
        full_name: doc.full_name,
        specialization: doc.specialization
      })));

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
    if (timeConflict?.hasConflict) {
      toast({
        title: "Greška",
        description: "Ne možete zakazati termin u isto vreme kao već zakazan termin",
        variant: "destructive",
      });
      return;
    }

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

    if (timeConflict?.hasConflict) {
      toast({
        title: "Greška",
        description: "Ne možete zakazati termin u isto vreme kao već zakazan termin",
        variant: "destructive",
      });
      return;
    }

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
    setTimeConflict(null);
  };

  // Check for time conflicts when relevant fields change
  useEffect(() => {
    if (appointmentForm.doctor_id && appointmentForm.appointment_date && appointmentForm.appointment_time) {
      checkTimeConflict(
        appointmentForm.doctor_id,
        appointmentForm.appointment_date,
        appointmentForm.appointment_time,
        appointmentForm.duration_minutes,
        selectedAppointment?.id
      );
    } else {
      setTimeConflict(null);
    }
  }, [appointmentForm.doctor_id, appointmentForm.appointment_date, appointmentForm.appointment_time, appointmentForm.duration_minutes]);

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

  const filterAndSortAppointments = (appointments: Appointment[]) => {
    // First filter by doctor
    let filtered = appointments;
    if (selectedDoctorFilter !== 'all') {
      filtered = filtered.filter(apt => apt.doctor_id === selectedDoctorFilter);
    }
    
    // Then filter by patient
    if (selectedPatientFilter) {
      filtered = filtered.filter(apt => apt.patient_id === selectedPatientFilter);
    }
    
    // Then sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        // Sort by date first, then by time
        const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
        if (dateCompare !== 0) return dateCompare;
        return a.appointment_time.localeCompare(b.appointment_time);
      } else {
        // Sort by time only
        return a.appointment_time.localeCompare(b.appointment_time);
      }
    });
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
          
          {isMobile ? (
            <Drawer open={isCreateAppointmentOpen} onOpenChange={setIsCreateAppointmentOpen}>
              <DrawerTrigger asChild>
                <Button variant="premium" className="btn-float">
                  <Plus className="h-4 w-4 mr-2" />
                  Zakaži termin
                </Button>
              </DrawerTrigger>
              <DrawerContent className="px-4 pb-8">
                <DrawerHeader>
                  <DrawerTitle>Zakazivanje novog termina</DrawerTitle>
                  <DrawerDescription>
                    Unesite podatke za novi termin
                  </DrawerDescription>
                </DrawerHeader>
                
                <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto px-1">
                  <PatientSearchDropdown
                    value={appointmentForm.patient_id}
                    onValueChange={(patientId) => setAppointmentForm(prev => ({ ...prev, patient_id: patientId }))}
                    onAddNewPatient={() => {
                      setIsCreateAppointmentOpen(false);
                      navigate('/patients');
                    }}
                  />
                  
                  <DoctorSearchDropdown
                    value={appointmentForm.doctor_id}
                    onValueChange={(doctorId) => setAppointmentForm(prev => ({ ...prev, doctor_id: doctorId }))}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appointment_date">Datum</Label>
                      <DatePicker
                        date={appointmentForm.appointment_date ? new Date(appointmentForm.appointment_date) : undefined}
                        onDateChange={(date) => setAppointmentForm(prev => ({ 
                          ...prev, 
                          appointment_date: date ? format(date, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appointment_time">Vreme</Label>
                      <TimePicker
                        time={appointmentForm.appointment_time}
                        onTimeChange={(time) => setAppointmentForm(prev => ({ ...prev, appointment_time: time }))}
                        className="w-full"
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

                  {timeConflict?.hasConflict && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Upozorenje: Termin je već zakazan u {timeConflict.conflictTime}. Molimo izaberite drugo vreme.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <DrawerFooter className="pt-4">
                  <Button 
                    onClick={createAppointment} 
                    className="w-full bg-gradient-medical hover:shadow-medical"
                    disabled={timeConflict?.hasConflict}
                  >
                    Zakaži termin
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full">Otkaži</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ) : (
            <Dialog open={isCreateAppointmentOpen} onOpenChange={setIsCreateAppointmentOpen}>
              <DialogTrigger asChild>
                <Button variant="premium" className="btn-float">
                  <Plus className="h-4 w-4 mr-2" />
                  Zakaži termin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Zakazivanje novog termina</DialogTitle>
                  <DialogDescription>
                    Unesite podatke za novi termin
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <PatientSearchDropdown
                    value={appointmentForm.patient_id}
                    onValueChange={(patientId) => setAppointmentForm(prev => ({ ...prev, patient_id: patientId }))}
                    onAddNewPatient={() => {
                      setIsCreateAppointmentOpen(false);
                      navigate('/patients');
                    }}
                  />
                  
                  <DoctorSearchDropdown
                    value={appointmentForm.doctor_id}
                    onValueChange={(doctorId) => setAppointmentForm(prev => ({ ...prev, doctor_id: doctorId }))}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appointment_date">Datum</Label>
                      <DatePicker
                        date={appointmentForm.appointment_date ? new Date(appointmentForm.appointment_date) : undefined}
                        onDateChange={(date) => setAppointmentForm(prev => ({ 
                          ...prev, 
                          appointment_date: date ? format(date, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appointment_time">Vreme</Label>
                      <TimePicker
                        time={appointmentForm.appointment_time}
                        onTimeChange={(time) => setAppointmentForm(prev => ({ ...prev, appointment_time: time }))}
                        className="w-full"
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

                  {timeConflict?.hasConflict && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Upozorenje: Termin je već zakazan u {timeConflict.conflictTime}. Molimo izaberite drugo vreme.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    onClick={createAppointment} 
                    className="w-full bg-gradient-medical hover:shadow-medical"
                    disabled={timeConflict?.hasConflict}
                  >
                    Zakaži termin
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">Svi termini</TabsTrigger>
          </TabsList>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient_filter">Pacijent</Label>
              <PatientSearchDropdown
                value={selectedPatientFilter}
                onValueChange={setSelectedPatientFilter}
                onAddNewPatient={() => navigate('/patients')}
                placeholder="Svi pacijenti"
                hideLabel={true}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doctor_filter">Lekar</Label>
              <Select value={selectedDoctorFilter} onValueChange={setSelectedDoctorFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi lekari</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr {doctor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* All Appointments */}
          <TabsContent value="all" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Svi termini
                </h2>
                <p className="text-muted-foreground">
                  {filterAndSortAppointments(appointments).length} {selectedDoctorFilter !== 'all' ? 'filtriranih' : 'ukupno'} termina
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label className="text-sm text-muted-foreground">Sortiraj:</Label>
                <Select value={sortBy} onValueChange={(value: 'date' | 'time') => setSortBy(value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Po datumu</SelectItem>
                    <SelectItem value="time">Po vremenu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4">
              {filterAndSortAppointments(appointments).map((appointment) => (
                <Card key={appointment.id} className="card-professional group shadow-glass border-border/20 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="bg-gradient-medical p-4 rounded-xl shadow-medical group-hover:scale-110 transition-all duration-300 flex flex-col items-center justify-center min-w-[80px]">
                          <div className="text-2xl font-bold text-primary-foreground">
                            {new Date(appointment.appointment_date).getDate()}
                          </div>
                          <div className="text-xs text-primary-foreground/90 uppercase">
                            {new Date(appointment.appointment_date).toLocaleDateString('sr-RS', { month: 'short' })}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                              {appointment.patients.first_name} {appointment.patients.last_name}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                          
                          <div className="flex items-center space-x-2 mb-3">
                            <Clock className="h-5 w-5 text-primary" />
                            <span className="text-2xl font-bold text-foreground">{appointment.appointment_time.substring(0, 5)}</span>
                            <span className="text-sm text-muted-foreground ml-2">({appointment.duration_minutes} min)</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Dr {appointment.doctor.full_name}</span>
                          </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:space-x-2">
                      <Button
                        variant="outline"
                        size={isMobile ? "default" : "sm"}
                        onClick={() => openEditDialog(appointment)}
                        className="hover:shadow-card transition-all duration-200 w-full sm:w-auto"
                      >
                        <Edit className="h-4 w-4 sm:mr-0" />
                        {isMobile && <span className="ml-2">Izmeni</span>}
                      </Button>
                      <Button
                        variant="outline"
                        size={isMobile ? "default" : "sm"}
                        onClick={() => deleteAppointment(appointment.id)}
                        className="text-destructive hover:bg-destructive/10 w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-0" />
                        {isMobile && <span className="ml-2">Obriši</span>}
                      </Button>
                    </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filterAndSortAppointments(appointments).length === 0 && (
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
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ažuriranje termina</DialogTitle>
              <DialogDescription>
                Izmenite podatke termina
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <PatientSearchDropdown
                value={appointmentForm.patient_id}
                onValueChange={(patientId) => setAppointmentForm(prev => ({ ...prev, patient_id: patientId }))}
                onAddNewPatient={() => {
                  setIsEditAppointmentOpen(false);
                  navigate('/patients');
                }}
              />
              
              <DoctorSearchDropdown
                value={appointmentForm.doctor_id}
                onValueChange={(doctorId) => setAppointmentForm(prev => ({ ...prev, doctor_id: doctorId }))}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment_date">Datum</Label>
                  <DatePicker
                    date={appointmentForm.appointment_date ? new Date(appointmentForm.appointment_date) : undefined}
                    onDateChange={(date) => setAppointmentForm(prev => ({ 
                      ...prev, 
                      appointment_date: date ? format(date, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appointment_time">Vreme</Label>
                  <TimePicker
                    time={appointmentForm.appointment_time}
                    onTimeChange={(time) => setAppointmentForm(prev => ({ ...prev, appointment_time: time }))}
                    className="w-full"
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

              {timeConflict?.hasConflict && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Upozorenje: Termin je već zakazan u {timeConflict.conflictTime}. Molimo izaberite drugo vreme.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={updateAppointment} 
                className="w-full bg-gradient-medical hover:shadow-medical"
                disabled={timeConflict?.hasConflict}
              >
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