import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

const SpecialistReport = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [showAddNewPatient, setShowAddNewPatient] = useState(false);
  
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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, loading, navigate]);

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
        .select('id, full_name, specialization')
        .eq('role', 'doctor')
        .eq('is_active', true);

      if (doctorsError) throw doctorsError;
      setDoctors(doctorsData || []);

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

  const handlePrint = () => {
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
            margin: 1.8in 0.8in 0.8in 0.8in;
          }
          
          @page :first {
            margin: 1.8in 0.8in 0.8in 0.8in;
          }
          
          @page :left {
            margin: 1.8in 0.8in 0.8in 0.8in;
          }
          
          @page :right {
            margin: 1.8in 0.8in 0.8in 0.8in;
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
            padding: 25px 25px 120px 25px;
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
          }
          
          .footer {
            position: fixed;
            bottom: 2cm;
            right: 25px;
            left: 25px;
            background: #ffffff;
            padding: 20px 0;
            text-align: right;
            border-top: 1px solid #f0f0f0;
          }
          
          .signature-line {
            border-bottom: 1px solid #000;
            width: 200px;
            margin: 20px 0 10px auto;
            height: 20px;
          }
          
          .doctor-signature {
            font-size: 17px;
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

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Lekar</Label>
            <Select onValueChange={handleDoctorChange}>
              <SelectTrigger>
                <SelectValue placeholder="Izaberite lekara" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.full_name} {doctor.specialization && `(${doctor.specialization})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="diagnosis">Dijagnoza</Label>
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
            <Label htmlFor="therapy">Terapija</Label>
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

          {/* Print Button */}
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handlePrint}
              disabled={!reportData.patient_name || !reportData.doctor_name}
              className="flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Štampaj Izveštaj</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecialistReport;