-- Create specialist_reports table
CREATE TABLE public.specialist_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  doctor_id UUID NOT NULL,
  exam_date DATE NOT NULL,
  anamnesis TEXT,
  objective_findings TEXT,
  diagnosis TEXT,
  therapy TEXT,
  control TEXT,
  echo_findings TEXT,
  lab_results TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.specialist_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view reports"
  ON public.specialist_reports
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create reports"
  ON public.specialist_reports
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update reports"
  ON public.specialist_reports
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete reports"
  ON public.specialist_reports
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_specialist_reports_updated_at
  BEFORE UPDATE ON public.specialist_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_specialist_reports_patient_id ON public.specialist_reports(patient_id);
CREATE INDEX idx_specialist_reports_doctor_id ON public.specialist_reports(doctor_id);
CREATE INDEX idx_specialist_reports_exam_date ON public.specialist_reports(exam_date);