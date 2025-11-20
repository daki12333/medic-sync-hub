import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer, Plus, Sparkles, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DoctorSearchDropdown } from '@/components/DoctorSearchDropdown';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
}

interface ReportData {
  patient_name: string;
  patient_dob: string;
  patient_phone: string;
  exam_date: string;
  anamnesis: string;
  objective_findings: string;
  diagnosis: string;
  therapy: string;
  control: string;
  echo_findings: string;
  lab_results: string;
  doctor_name: string;
  doctor_specialization: string;
}

interface ICDCode {
  code: string;
  description: string;
}

interface DiagnosisSuggestion {
  diagnosis: string;
  icd_code: string;
  probability: "visoka" | "srednja" | "niska";
  explanation: string;
}

interface TherapySuggestion {
  therapy: string;
}

const SpecialistReport = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [showAddNewPatient, setShowAddNewPatient] = useState(false);
  
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  
  const [reportData, setReportData] = useState<ReportData>({
    patient_name: '',
    patient_dob: '',
    patient_phone: '',
    exam_date: new Date().toISOString().split('T')[0],
    anamnesis: '',
    objective_findings: '',
    diagnosis: '',
    therapy: '',
    control: '',
    echo_findings: '',
    lab_results: '',
    doctor_name: '',
    doctor_specialization: ''
  });
  
  const [icdCodes, setIcdCodes] = useState<ICDCode[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState<DiagnosisSuggestion[]>([]);
  const [showDiagnosisSuggestions, setShowDiagnosisSuggestions] = useState(false);
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  
  const [therapySuggestion, setTherapySuggestion] = useState<TherapySuggestion | null>(null);
  const [showTherapySuggestion, setShowTherapySuggestion] = useState(false);
  const [isLoadingTherapy, setIsLoadingTherapy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
    
    // Auto-select doctor if current user is a doctor
    if (profile?.role === 'doctor' && user?.id) {
      setSelectedDoctorId(user.id);
      setReportData(prev => ({
        ...prev,
        doctor_name: profile.full_name || '',
        doctor_specialization: profile.specialization || ''
      }));
    }
  }, [user, profile, loading, navigate]);

  const fetchData = async () => {
    try {
      // Fetch patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('id, first_name, last_name, date_of_birth, phone')
        .eq('is_active', true)
        .order('first_name');

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // Fetch doctors (profiles with doctor role)
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('profiles')
        .select('user_id, full_name, specialization')
        .eq('role', 'doctor')
        .eq('is_active', true);

      if (doctorsError) throw doctorsError;
      
      // Map user_id to id for compatibility
      const mappedDoctors = (doctorsData || []).map(d => ({
        id: d.user_id,
        full_name: d.full_name,
        specialization: d.specialization
      }));
      setDoctors(mappedDoctors);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Greška",
        description: "Nije moguće učitati podatke.",
        variant: "destructive",
      });
    }
  };

  const handlePatientNameChange = (value: string) => {
    setReportData(prev => ({ ...prev, patient_name: value }));
    
    if (value.length > 0) {
      const filtered = patients.filter(patient => 
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredPatients(filtered);
      setShowPatientSuggestions(true);
      setShowAddNewPatient(filtered.length === 0);
    } else {
      setShowPatientSuggestions(false);
      setShowAddNewPatient(false);
    }
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setReportData(prev => ({
      ...prev,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_dob: patient.date_of_birth || '',
      patient_phone: patient.phone || ''
    }));
    setShowPatientSuggestions(false);
    setShowAddNewPatient(false);
  };

  const handleDoctorChange = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      setReportData(prev => ({
        ...prev,
        doctor_name: doctor.full_name || '',
        doctor_specialization: doctor.specialization || ''
      }));
    }
  };

  const handleAddNewPatient = () => {
    navigate('/patients', { state: { addNew: true, patientName: reportData.patient_name } });
  };

  const handleGetDiagnosisSuggestions = async () => {
    if (!reportData.anamnesis && !reportData.objective_findings) {
      toast({
        title: "Nedostaju podaci",
        description: "Molimo unesite anamnezu ili objektivni nalaz.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingDiagnosis(true);
    try {
      const { data, error } = await supabase.functions.invoke('medical-ai-assistant', {
        body: {
          type: 'diagnosis',
          anamnesis: reportData.anamnesis,
          objectiveFindings: reportData.objective_findings
        }
      });

      if (error) throw error;
      
      if (data?.suggestions) {
        setDiagnosisSuggestions(data.suggestions);
        setShowDiagnosisSuggestions(true);
        toast({
          title: "AI Predlozi spremni",
          description: `Pronađeno ${data.suggestions.length} mogućih dijagnoza.`,
        });
      }
    } catch (error) {
      console.error('Diagnosis suggestion error:', error);
      toast({
        title: "Greška",
        description: "Nije moguće dobiti predloge dijagnoza.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  const handleAcceptDiagnosis = (suggestion: DiagnosisSuggestion) => {
    setReportData(prev => ({
      ...prev,
      diagnosis: `${suggestion.diagnosis} (${suggestion.icd_code})\n\n${suggestion.explanation}`
    }));
    setShowDiagnosisSuggestions(false);
    toast({
      title: "Dijagnoza prihvaćena",
      description: "Dijagnoza je dodata u izveštaj.",
    });
  };

  const handleGetTherapySuggestion = async () => {
    if (!reportData.diagnosis) {
      toast({
        title: "Nedostaje dijagnoza",
        description: "Molimo prvo unesite dijagnozu.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingTherapy(true);
    try {
      const { data, error } = await supabase.functions.invoke('medical-ai-assistant', {
        body: {
          type: 'therapy',
          diagnosis: reportData.diagnosis,
          anamnesis: reportData.anamnesis
        }
      });

      if (error) throw error;
      
      if (data) {
        setTherapySuggestion(data);
        setShowTherapySuggestion(true);
        toast({
          title: "AI Predlog spreman",
          description: "Terapija je predložena.",
        });
      }
    } catch (error) {
      console.error('Therapy suggestion error:', error);
      toast({
        title: "Greška",
        description: "Nije moguće dobiti predlog terapije.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTherapy(false);
    }
  };

  const handleAcceptTherapy = () => {
    if (!therapySuggestion) return;
    
    setReportData(prev => ({
      ...prev,
      therapy: therapySuggestion.therapy
    }));
    setShowTherapySuggestion(false);
    toast({
      title: "Terapija prihvaćena",
      description: "Terapija je dodata u izveštaj.",
    });
  };

  const handleSaveAndPrint = async () => {
    if (!reportData.patient_name || !reportData.doctor_name) {
      toast({
        title: "Greška",
        description: "Molimo popunite podatke o pacijentu i lekaru.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPatientId || !selectedDoctorId) {
      toast({
        title: "Greška",
        description: "Molimo izaberite pacijenta i lekara iz liste.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsClassifying(true);
      
      // Classify diagnosis with AI if diagnosis is provided
      let classifiedCodes: ICDCode[] = [];
      if (reportData.diagnosis) {
        try {
          const { data: icdData, error: icdError } = await supabase.functions.invoke('classify-icd', {
            body: {
              diagnosis: reportData.diagnosis,
              anamnesis: reportData.anamnesis,
              objectiveFindings: reportData.objective_findings
            }
          });

          if (icdError) {
            console.error('ICD classification error:', icdError);
            toast({
              title: "Upozorenje",
              description: "ICD klasifikacija nije uspela, izveštaj će biti sačuvan bez ICD kodova.",
              variant: "default",
            });
          } else if (icdData?.codes) {
            classifiedCodes = icdData.codes;
            setIcdCodes(classifiedCodes);
            toast({
              title: "ICD Kodovi Klasifikovani",
              description: `Pronađeno ${classifiedCodes.length} ICD-10 koda.`,
            });
          }
        } catch (icdError) {
          console.error('ICD classification failed:', icdError);
          toast({
            title: "Upozorenje",
            description: "ICD klasifikacija nije dostupna.",
            variant: "default",
          });
        }
      }
      
      setIsClassifying(false);

      // Save to database
      const { error } = await supabase
        .from('specialist_reports')
        .insert({
          patient_id: selectedPatientId,
          doctor_id: selectedDoctorId,
          exam_date: reportData.exam_date,
          anamnesis: reportData.anamnesis,
          objective_findings: reportData.objective_findings,
          diagnosis: reportData.diagnosis,
          therapy: reportData.therapy,
          control: reportData.control,
          echo_findings: reportData.echo_findings,
          lab_results: reportData.lab_results,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Uspešno",
        description: "Izveštaj je sačuvan.",
      });

      // Continue with printing with ICD codes
      handlePrint(classifiedCodes);
    } catch (error) {
      console.error('Error saving report:', error);
      setIsClassifying(false);
      toast({
        title: "Greška",
        description: "Nije moguće sačuvati izveštaj.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (icdCodesToPrint: ICDCode[] = icdCodes) => {
    // Open print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
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
          
          .subtitle {
            font-size: 14px;
            color: #4a5568;
            font-style: italic;
            margin-top: 5px;
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
          
          .icd-codes {
            background: #f7fafc;
            border: 2px solid #3182ce;
            border-radius: 6px;
            padding: 12px;
            margin: 10px 0;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .icd-title {
            font-weight: 800;
            font-size: 14px;
            color: #1a365d;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .icd-item {
            margin: 6px 0;
            padding: 6px;
            background: white;
            border-left: 3px solid #3182ce;
            padding-left: 10px;
          }
          
          .icd-code {
            font-weight: 700;
            color: #2c5282;
            font-size: 15px;
            font-family: 'Courier New', monospace;
          }
          
          .icd-description {
            color: #2d3748;
            font-size: 14px;
            margin-left: 8px;
          }
          
          .footer {
            margin-top: 30px;
            padding: 8px 0;
            text-align: right;
            height: auto;
            break-inside: avoid;
            page-break-inside: avoid;
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
              <span class="field-value">${reportData.patient_name}</span>
            </div>
            
            <div class="field">
              <span class="field-label">Datum pregleda:</span>
              <span class="field-value">${new Date(reportData.exam_date).toLocaleDateString('sr-RS')}</span>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Anamneza</div>
            <div class="text-content">${reportData.anamnesis || ''}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Objektivni nalaz</div>
            <div class="text-content">${reportData.objective_findings || ''}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Dijagnoza</div>
            <div class="text-content">${reportData.diagnosis || ''}</div>
            ${icdCodesToPrint && icdCodesToPrint.length > 0 ? `
              <div class="icd-codes">
                <div class="icd-title">ICD-10 Klasifikacija</div>
                ${icdCodesToPrint.map(icd => `
                  <div class="icd-item">
                    <span class="icd-code">${icd.code}</span>
                    <span class="icd-description">${icd.description}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">Terapija</div>
            <div class="text-content">${reportData.therapy || ''}</div>
          </div>
          
          ${reportData.lab_results ? `<div class="lab-results">
            <div class="section-title" style="color: #c05621; margin-bottom: 10px;">Laboratorijski nalazi</div>
            <div class="text-content" style="color: #744210;">${reportData.lab_results}</div>
          </div>` : ''}
          
          <div class="footer">
            <div class="signature-line"></div>
            <div class="doctor-signature">
              Lekar: ${reportData.doctor_name}
              ${reportData.doctor_specialization ? `<br><span style="font-size: 14px; font-weight: 500; color: #4a5568;">${reportData.doctor_specialization}</span>` : ''}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Specijalistički Izveštaj</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kreiranje Izveštaja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2 relative">
            <Label htmlFor="patient">Pacijent</Label>
            <Input
              id="patient"
              value={reportData.patient_name}
              onChange={(e) => handlePatientNameChange(e.target.value)}
              placeholder="Unesite ime i prezime pacijenta"
            />
            
            {showPatientSuggestions && filteredPatients.length > 0 && (
              <div className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg mt-1">
                {filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-2 hover:bg-accent cursor-pointer"
                    onClick={() => selectPatient(patient)}
                  >
                    {patient.first_name} {patient.last_name}
                    {patient.date_of_birth && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({new Date(patient.date_of_birth).toLocaleDateString('sr-RS')})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {showAddNewPatient && reportData.patient_name.length > 0 && (
              <div className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg mt-1">
                <div
                  className="p-2 hover:bg-accent cursor-pointer flex items-center space-x-2 text-primary"
                  onClick={handleAddNewPatient}
                >
                  <Plus className="h-4 w-4" />
                  <span>Dodaj novog pacijenta: "{reportData.patient_name}"</span>
                </div>
              </div>
            )}
          </div>

          {/* Exam Date */}
          <div className="space-y-2">
            <Label htmlFor="exam_date">Datum pregleda</Label>
            <Input
              id="exam_date"
              type="date"
              value={reportData.exam_date}
              onChange={(e) => setReportData(prev => ({ ...prev, exam_date: e.target.value }))}
            />
          </div>

          <DoctorSearchDropdown
            value={selectedDoctorId}
            onValueChange={(doctorId) => {
              setSelectedDoctorId(doctorId);
              const doctor = doctors.find(d => d.id === doctorId);
              if (doctor) {
                setReportData(prev => ({
                  ...prev,
                  doctor_name: doctor.full_name || '',
                  doctor_specialization: doctor.specialization || ''
                }));
              }
            }}
            label="Lekar"
            placeholder={profile?.role === 'doctor' ? reportData.doctor_name : "Pretraži lekare..."}
          />

          {/* Anamnesis */}
          <div className="space-y-2">
            <Label htmlFor="anamnesis">Anamneza</Label>
            <Textarea
              id="anamnesis"
              value={reportData.anamnesis}
              onChange={(e) => setReportData(prev => ({ ...prev, anamnesis: e.target.value }))}
              placeholder="Anamneza i nalaz"
              rows={4}
            />
          </div>

          {/* Objective Findings */}
          <div className="space-y-2">
            <Label htmlFor="objective_findings">Objektivni nalaz</Label>
            <Textarea
              id="objective_findings"
              value={reportData.objective_findings}
              onChange={(e) => setReportData(prev => ({ ...prev, objective_findings: e.target.value }))}
              placeholder="Objektivni nalaz"
              rows={3}
            />
          </div>

          {/* Diagnosis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="diagnosis">Dijagnoza</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetDiagnosisSuggestions}
                disabled={isLoadingDiagnosis || (!reportData.anamnesis && !reportData.objective_findings)}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isLoadingDiagnosis ? 'AI razmišlja...' : 'AI Predlog'}
              </Button>
            </div>
            
            {/* Diagnosis Suggestions Dialog - ABOVE textarea */}
            {showDiagnosisSuggestions && diagnosisSuggestions.length > 0 && (
              <div className="p-4 border border-primary rounded-lg bg-accent/50 space-y-3 max-h-[400px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Predlozi
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowDiagnosisSuggestions(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {diagnosisSuggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-background rounded border border-border hover:border-primary transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{suggestion.diagnosis}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                            {suggestion.icd_code}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            suggestion.probability === 'visoka' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            suggestion.probability === 'srednja' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {suggestion.probability}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{suggestion.explanation}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAcceptDiagnosis(suggestion)}
                        className="flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        Prihvati
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Textarea
              id="diagnosis"
              value={reportData.diagnosis}
              onChange={(e) => setReportData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="Dijagnoza"
              rows={2}
            />
          </div>

          {/* Therapy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="therapy">Terapija</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetTherapySuggestion}
                disabled={isLoadingTherapy || !reportData.diagnosis}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isLoadingTherapy ? 'AI razmišlja...' : 'AI Predlog'}
              </Button>
            </div>
            
            {/* Therapy Suggestion Dialog - ABOVE textarea */}
            {showTherapySuggestion && therapySuggestion && (
              <div className="p-3 border border-primary rounded-lg bg-accent/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Predlog
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowTherapySuggestion(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{therapySuggestion.therapy}</p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAcceptTherapy}
                  className="flex items-center gap-1 w-full"
                >
                  <Check className="h-3 w-3" />
                  Prihvati
                </Button>
              </div>
            )}
            
            <Textarea
              id="therapy"
              value={reportData.therapy}
              onChange={(e) => setReportData(prev => ({ ...prev, therapy: e.target.value }))}
              placeholder="Terapija"
              rows={3}
            />
          </div>

          {/* Lab Results */}
          <div className="space-y-2">
            <Label htmlFor="lab_results">Laboratorijski nalazi</Label>
            <Textarea
              id="lab_results"
              value={reportData.lab_results}
              onChange={(e) => setReportData(prev => ({ ...prev, lab_results: e.target.value }))}
              placeholder="SE CRP KS glyc,hol,trig urea,kreat K,Na Fe bil,lak fosf,gama GT,ALT,AST Urin"
              rows={2}
            />
          </div>


          {/* Save and Print Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSaveAndPrint}
              disabled={!reportData.patient_name || !reportData.doctor_name || isClassifying}
              className="flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>{isClassifying ? 'Klasifikacija ICD kodova...' : 'Sačuvaj i Štampaj'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecialistReport;