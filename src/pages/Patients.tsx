import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  ArrowLeft,
  Activity,
  Search,
  Edit,
  Trash2,
  Phone,
  Calendar,
  FileText,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface PatientReport {
  id: string;
  exam_date: string;
  anamnesis: string;
  objective_findings: string;
  diagnosis: string;
  therapy: string;
  control: string;
  echo_findings: string;
  lab_results: string;
  doctor: {
    full_name: string;
    specialization: string;
  };
}

const Patients = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatePatientOpen, setIsCreatePatientOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isViewReportsOpen, setIsViewReportsOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientReports, setPatientReports] = useState<PatientReport[]>([]);
  
  const [patientForm, setPatientForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    phone: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchPatients();
    }
  }, [user, loading, navigate]);

  const fetchPatients = async () => {
    try {
      setLoadingData(true);
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);

    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati pacijente",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const createPatient = async () => {
    try {
      const { error } = await supabase
        .from('patients')
        .insert({
          ...patientForm,
          date_of_birth: patientForm.date_of_birth || null,
          phone: patientForm.phone || null,
        });

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Pacijent je uspešno dodat",
      });

      setIsCreatePatientOpen(false);
      resetForm();
      fetchPatients();
    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast({
        title: "Greška",
        description: error.message || "Nije moguće dodati pacijenta",
        variant: "destructive",
      });
    }
  };

  const updatePatient = async () => {
    if (!selectedPatient) return;

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          ...patientForm,
          date_of_birth: patientForm.date_of_birth || null,
          phone: patientForm.phone || null,
        })
        .eq('id', selectedPatient.id);

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Podaci o pacijentu su ažurirani",
      });

      setIsEditPatientOpen(false);
      resetForm();
      fetchPatients();
    } catch (error: any) {
      console.error('Error updating patient:', error);
      toast({
        title: "Greška",
        description: error.message || "Nije moguće ažurirati pacijenta",
        variant: "destructive",
      });
    }
  };

  const deletePatient = async (patientId: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .update({ is_active: false })
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Pacijent je uklonjen iz aktivne liste",
      });

      fetchPatients();
    } catch (error: any) {
      toast({
        title: "Greška",
        description: error.message || "Nije moguće ukloniti pacijenta",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setPatientForm({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      phone: ''
    });
    setSelectedPatient(null);
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth || '',
      phone: patient.phone || ''
    });
    setIsEditPatientOpen(true);
  };

  const openReportsDialog = async (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewReportsOpen(true);
    setLoadingReports(true);
    
    try {
      const { data, error } = await supabase
        .from('specialist_reports')
        .select(`
          *,
          doctor:profiles!specialist_reports_doctor_id_fkey(full_name, specialization)
        `)
        .eq('patient_id', patient.id)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      setPatientReports(data || []);
    } catch (error) {
      console.error('Error fetching patient reports:', error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati izveštaje pacijenta",
        variant: "destructive",
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const handlePrintReport = (report: PatientReport) => {
    if (!selectedPatient) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Specijalistički Izveštaj</title>
          <style>
            body { 
              font-family: 'Times New Roman', serif; 
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .title { 
              font-size: 24px; 
              font-weight: bold;
              margin-bottom: 10px;
            }
            .section { 
              margin-bottom: 25px;
            }
            .section-title { 
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 10px;
              text-decoration: underline;
            }
            .field { 
              margin-bottom: 10px;
              line-height: 1.6;
            }
            .field-label { 
              font-weight: bold;
            }
            .footer {
              margin-top: 60px;
              text-align: right;
            }
            @media print {
              body { padding: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="padding: 10px 20px; margin-bottom: 20px; cursor: pointer;">
            Štampaj
          </button>
          
          <div class="header">
            <div class="title">SPECIJALISTIČKI IZVEŠTAJ</div>
          </div>

          <div class="section">
            <div class="field">
              <span class="field-label">Pacijent:</span> ${selectedPatient.first_name} ${selectedPatient.last_name}
            </div>
            ${selectedPatient.date_of_birth ? `
            <div class="field">
              <span class="field-label">Datum rođenja:</span> ${format(new Date(selectedPatient.date_of_birth), 'dd.MM.yyyy')}
            </div>
            ` : ''}
            ${selectedPatient.phone ? `
            <div class="field">
              <span class="field-label">Telefon:</span> ${selectedPatient.phone}
            </div>
            ` : ''}
            <div class="field">
              <span class="field-label">Datum pregleda:</span> ${format(new Date(report.exam_date), 'dd.MM.yyyy')}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Anamneza:</div>
            <div>${report.anamnesis || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Objektivni nalaz:</div>
            <div>${report.objective_findings || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Dijagnoza:</div>
            <div>${report.diagnosis || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Terapija:</div>
            <div>${report.therapy || 'N/A'}</div>
          </div>

          <div class="section">
            <div class="section-title">Kontrola:</div>
            <div>${report.control || 'N/A'}</div>
          </div>

          ${report.echo_findings ? `
          <div class="section">
            <div class="section-title">EHO nalaz:</div>
            <div>${report.echo_findings}</div>
          </div>
          ` : ''}

          ${report.lab_results ? `
          <div class="section">
            <div class="section-title">Laboratorijski nalazi:</div>
            <div>${report.lab_results}</div>
          </div>
          ` : ''}

          <div class="footer">
            <div style="margin-bottom: 40px;">
              <div><strong>${report.doctor.full_name}</strong></div>
              <div>${report.doctor.specialization || 'Specijalista'}</div>
            </div>
            <div>_______________________</div>
            <div style="margin-top: 5px;">Potpis i pečat</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone?.includes(searchQuery)
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Učitavanje pacijenata...</p>
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
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Pacijenti</h1>
                <p className="text-sm text-muted-foreground">Upravljanje pacijentima</p>
              </div>
            </div>
          </div>
          
          <Dialog open={isCreatePatientOpen} onOpenChange={setIsCreatePatientOpen}>
            <DialogTrigger asChild>
              <Button variant="premium" className="btn-float">
                <UserPlus className="h-4 w-4 mr-2" />
                Dodaj pacijenta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Dodavanje novog pacijenta</DialogTitle>
                <DialogDescription>
                  Unesite osnovne podatke o pacijentu
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Ime *</Label>
                    <Input
                      id="first_name"
                      value={patientForm.first_name}
                      onChange={(e) => setPatientForm(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Marko"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Prezime *</Label>
                    <Input
                      id="last_name"
                      value={patientForm.last_name}
                      onChange={(e) => setPatientForm(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Marković"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Datum rođenja</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={patientForm.date_of_birth}
                      onChange={(e) => setPatientForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={patientForm.phone}
                      onChange={(e) => setPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+381 11 234 5678"
                    />
                  </div>
                </div>
                
                <Button onClick={createPatient} className="w-full bg-gradient-medical hover:shadow-medical">
                  Dodaj pacijenta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretraži pacijente po imenu ili telefonu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 transition-all duration-200 focus:shadow-medical"
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass glass-hover border-border/20 shadow-glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <div className="p-1 bg-primary/10 rounded-md">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <span>Ukupno pacijenata</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-medical bg-clip-text text-transparent">{patients.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Patients List */}
        <div className="space-y-4">
          {filteredPatients.length === 0 ? (
            <Card className="card-professional shadow-glass border-border/20 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-card opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-8 text-center relative z-10">
                <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-4 group-hover:bg-primary/10 transition-colors duration-300">
                  <Users className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Nema pacijenata</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Nema rezultata za zadatu pretragu.' : 'Još uvek niste dodali nijednog pacijenta.'}
                </p>
                {!searchQuery && (
                  <Button 
                    onClick={() => setIsCreatePatientOpen(true)}
                    variant="premium"
                    className="btn-float"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Dodaj prvog pacijenta
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredPatients.map((patient) => (
              <Card key={patient.id} className="card-professional group shadow-glass border-border/20 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 group-hover:bg-primary/20 transition-all duration-300">
                          Aktivan
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                        {patient.date_of_birth && (
                          <div className="flex items-center space-x-2 group-hover:text-primary/70 transition-colors duration-300">
                            <Calendar className="h-4 w-4" />
                            <span>Rođen: {new Date(patient.date_of_birth).toLocaleDateString('sr-RS')}</span>
                          </div>
                        )}
                        {patient.phone && (
                          <div className="flex items-center space-x-2 group-hover:text-primary/70 transition-colors duration-300">
                            <Phone className="h-4 w-4" />
                            <span>{patient.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => openReportsDialog(patient)}
                        className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
                        title="Pregled izveštaja"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => openEditDialog(patient)}
                        className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => deletePatient(patient.id)}
                        className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Patient Dialog */}
        <Dialog open={isEditPatientOpen} onOpenChange={setIsEditPatientOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Izmena podataka o pacijentu</DialogTitle>
              <DialogDescription>
                Ažurirajte podatke o pacijentu
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_first_name">Ime *</Label>
                  <Input
                    id="edit_first_name"
                    value={patientForm.first_name}
                    onChange={(e) => setPatientForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Marko"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_last_name">Prezime *</Label>
                  <Input
                    id="edit_last_name"
                    value={patientForm.last_name}
                    onChange={(e) => setPatientForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Marković"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_date_of_birth">Datum rođenja</Label>
                  <Input
                    id="edit_date_of_birth"
                    type="date"
                    value={patientForm.date_of_birth}
                    onChange={(e) => setPatientForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_phone">Telefon</Label>
                  <Input
                    id="edit_phone"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+381 11 234 5678"
                  />
                </div>
              </div>
              
              <Button onClick={updatePatient} className="w-full bg-gradient-medical hover:shadow-medical">
                Ažuriraj podatke
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Patient Reports Dialog */}
        <Dialog open={isViewReportsOpen} onOpenChange={setIsViewReportsOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Izveštaji pacijenta: {selectedPatient?.first_name} {selectedPatient?.last_name}
              </DialogTitle>
              <DialogDescription>
                Svi specijalistički izveštaji za ovog pacijenta
              </DialogDescription>
            </DialogHeader>

            {loadingReports ? (
              <div className="text-center py-12">
                <Activity className="h-8 w-8 animate-pulse text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Učitavanje izveštaja...</p>
              </div>
            ) : patientReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nema sačuvanih izveštaja za ovog pacijenta</p>
              </div>
            ) : (
              <div className="space-y-4">
                {patientReports.map((report) => (
                  <Card key={report.id} className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(report.exam_date), 'dd.MM.yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              <span>{report.doctor.full_name}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePrintReport(report)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {report.diagnosis && (
                        <div className="mb-2">
                          <span className="font-semibold text-foreground">Dijagnoza:</span>{' '}
                          <span className="text-muted-foreground">{report.diagnosis}</span>
                        </div>
                      )}
                      {report.therapy && (
                        <div>
                          <span className="font-semibold text-foreground">Terapija:</span>{' '}
                          <span className="text-muted-foreground">{report.therapy}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Patients;