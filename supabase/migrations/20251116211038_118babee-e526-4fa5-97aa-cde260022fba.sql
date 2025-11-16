-- Add foreign key constraint for doctor_id
ALTER TABLE public.specialist_reports
ADD CONSTRAINT specialist_reports_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES public.profiles(user_id);