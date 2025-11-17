import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Calendar, User, Printer, Trash2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Report {
  id: string;
  patient_id: string;
  doctor_id: string;
  exam_date: string;
  anamnesis: string;
  objective_findings: string;
  diagnosis: string;
  therapy: string;
  control: string;
  echo_findings: string;
  lab_results: string;
  created_at: string;
  patients: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone: string;
  };
  doctor: {
    full_name: string;
    specialization: string;
  };
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

const ReportHistory = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchReports();
    fetchPatients();
  }, [user, loading, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('specialist_reports')
        .select(`
          *,
          patients!specialist_reports_patient_id_fkey(first_name, last_name, date_of_birth, phone),
          doctor:profiles!specialist_reports_doctor_id_fkey(full_name, specialization)
        `)
        .order('exam_date', { ascending: false });

      // If user is a doctor (not admin), only show their reports
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();
      
      if (profileData?.role === 'doctor') {
        query = query.eq('doctor_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
      setFilteredReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati izveštaje.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      const filtered = reports.filter(report => report.patient_id === selectedPatientId);
      setFilteredReports(filtered);
    } else {
      setFilteredReports(reports);
    }
  }, [selectedPatientId, reports]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (value.length > 0) {
      const filtered = patients.filter(patient =>
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredPatients(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSelectedPatientId('');
    }
  };

  const selectPatient = (patient: Patient) => {
    setSearchTerm(`${patient.first_name} ${patient.last_name}`);
    setSelectedPatientId(patient.id);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedPatientId('');
    setShowSuggestions(false);
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('specialist_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Izveštaj je obrisan.",
      });

      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Greška",
        description: "Nije moguće obrisati izveštaj.",
        variant: "destructive",
      });
    } finally {
      setDeleteReportId(null);
    }
  };

  const handlePrint = (report: Report) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Specijalistički Izveštaj</title>
        <style>
          @page {
            size: A4;
            margin: 2.3in 0.8in 0.8in 0.8in;
          }
          
          @page :first {
            margin: 2.3in 0.8in 0.8in 0.8in;
          }
          
          @page :left {
            margin: 2.3in 0.8in 0.8in 0.8in;
          }
          
          @page :right {
            margin: 2.3in 0.8in 0.8in 0.8in;
          }
          
          body {
            font-family: 'Times New Roman', serif;
            font-size: 16px;
            line-height: 1.3;
            color: #000;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          
          .document {
            background: #ffffff;
            padding: 25px;
            min-height: calc(100vh - 50px);
          }
          
          .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
          }
          
          .title {
            font-size: 24px;
            font-weight: 900;
            margin-bottom: 10px;
            color: #1a365d;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 1px 1px 2px rgba(26, 54, 93, 0.1);
          }
          
          .patient-info {
            background: #ffffff;
            padding: 12px;
            margin-bottom: 18px;
          }
          
          .field {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
          }
          
          .field-label {
            font-weight: 700;
            font-size: 16px;
            color: #1a365d;
            min-width: 160px;
            display: inline-block;
          }
          
          .field-value {
            font-size: 16px;
            color: #2d3748;
            font-weight: 500;
          }
          
          .section {
            margin-bottom: 15px;
            border-left: 4px solid #3182ce;
            padding-left: 15px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .section-title {
            font-weight: 800;
            font-size: 18px;
            color: #1a365d;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .text-content {
            font-size: 15px;
            line-height: 1.4;
            color: #2d3748;
            text-align: justify;
            padding: 4px 0;
            font-weight: 500;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .lab-results {
            background: #ffffff;
            padding: 10px;
            margin: 12px 0;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .footer {
            margin-top: 30px;
            padding: 8px 0;
            text-align: right;
            height: auto;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .signature-line {
            border-bottom: 1px solid #000;
            width: 180px;
            margin: 10px 0 5px auto;
            height: 15px;
          }
          
          .doctor-signature {
            font-size: 16px;
            font-weight: 700;
            color: #1a365d;
          }
          
          @media print {
            body {
              padding: 0;
              background: white;
            }
            .document {
              box-shadow: none;
              min-height: auto;
            }
            .footer {
              position: static;
              margin-top: 30px;
            }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <div class="title">SPECIJALISTIČKI IZVEŠTAJ</div>
          </div>
          
          <div class="patient-info">
            <div class="field">
              <span class="field-label">Ime i prezime pacijenta:</span>
              <span class="field-value">${report.patients.first_name} ${report.patients.last_name}</span>
            </div>
            ${report.patients.phone ? `<div class="field">
              <span class="field-label">Telefon:</span>
              <span class="field-value">${report.patients.phone}</span>
            </div>` : ''}
            <div class="field">
              <span class="field-label">Datum pregleda:</span>
              <span class="field-value">${format(new Date(report.exam_date), 'dd.MM.yyyy')}</span>
            </div>
          </div>
          
          ${report.anamnesis ? `<div class="section">
            <div class="section-title">Anamneza</div>
            <div class="text-content">${report.anamnesis}</div>
          </div>` : ''}
          
          ${report.objective_findings ? `<div class="section">
            <div class="section-title">Objektivni nalaz</div>
            <div class="text-content">${report.objective_findings}</div>
          </div>` : ''}
          
          ${report.diagnosis ? `<div class="section">
            <div class="section-title">Dijagnoza</div>
            <div class="text-content">${report.diagnosis}</div>
          </div>` : ''}
          
          ${report.therapy ? `<div class="section">
            <div class="section-title">Terapija</div>
            <div class="text-content">${report.therapy}</div>
          </div>` : ''}
          
          ${report.control ? `<div class="section">
            <div class="section-title">Kontrola</div>
            <div class="text-content">${report.control}</div>
          </div>` : ''}
          
          ${report.echo_findings ? `<div class="section">
            <div class="section-title">EHO nalaz</div>
            <div class="text-content">${report.echo_findings}</div>
          </div>` : ''}
          
          ${report.lab_results ? `<div class="lab-results">
            <div class="section-title" style="color: #c05621; margin-bottom: 10px;">Laboratorijski nalazi</div>
            <div class="text-content" style="color: #744210;">${report.lab_results}</div>
          </div>` : ''}
          
          <div class="footer">
            <div class="signature-line"></div>
            <div class="doctor-signature">
              Lekar: ${report.doctor.full_name}
              ${report.doctor.specialization ? `<br><span style="font-size: 14px; font-weight: 500; color: #4a5568;">${report.doctor.specialization}</span>` : ''}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Istorija Izveštaja</h1>
                <p className="text-muted-foreground">Pregled svih specijalističkih izveštaja</p>
              </div>
            </div>
          </div>

          <Card className="mb-6 bg-card border-border">
            <CardContent className="pt-6">
              <div className="relative max-w-md" ref={dropdownRef}>
                <Input
                  placeholder="Pretraži po imenu pacijenta..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2"
                  >
                    ✕
                  </Button>
                )}
                
                {showSuggestions && filteredPatients.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => selectPatient(patient)}
                        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center justify-between"
                      >
                        <span>{patient.first_name} {patient.last_name}</span>
                        {selectedPatientId === patient.id && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Učitavanje...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nema izveštaja za zadatu pretragu' : 'Nema sačuvanih izveštaja'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {report.patients.first_name} {report.patients.last_name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(report.exam_date), 'dd.MM.yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{report.doctor.full_name}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePrint(report)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteReportId(report.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
        </div>

        <AlertDialog open={!!deleteReportId} onOpenChange={() => setDeleteReportId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Potvrda brisanja</AlertDialogTitle>
              <AlertDialogDescription>
                Da li ste sigurni da želite da obrišete ovaj izveštaj? Ova akcija ne može biti poništena.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Otkaži</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteReportId && handleDeleteReport(deleteReportId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Obriši
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default ReportHistory;
