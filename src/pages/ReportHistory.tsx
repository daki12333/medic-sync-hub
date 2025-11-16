import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Calendar, User, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import { format } from 'date-fns';

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

const ReportHistory = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchReports();
  }, [user, loading, navigate]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('specialist_reports')
        .select(`
          *,
          patients!specialist_reports_patient_id_fkey(first_name, last_name, date_of_birth, phone),
          doctor:profiles!specialist_reports_doctor_id_fkey(full_name, specialization)
        `)
        .order('exam_date', { ascending: false });

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

  useEffect(() => {
    if (searchTerm) {
      const filtered = reports.filter(report =>
        `${report.patients.first_name} ${report.patients.last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredReports(filtered);
    } else {
      setFilteredReports(reports);
    }
  }, [searchTerm, reports]);

  const handlePrint = (report: Report) => {
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
              <span class="field-label">Pacijent:</span> ${report.patients.first_name} ${report.patients.last_name}
            </div>
            <div class="field">
              <span class="field-label">Datum rođenja:</span> ${format(new Date(report.patients.date_of_birth), 'dd.MM.yyyy')}
            </div>
            <div class="field">
              <span class="field-label">Telefon:</span> ${report.patients.phone}
            </div>
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
              <Input
                placeholder="Pretraži po imenu pacijenta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
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
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePrint(report)}
                        className="ml-4"
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
        </div>
      </div>
    </div>
  );
};

export default ReportHistory;
