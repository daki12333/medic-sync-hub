-- Ensure activity_logs table exists
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('insert','update','delete')),
  performed_by uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK to profiles if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'activity_logs_performed_by_fkey'
      AND table_schema = 'public' AND table_name = 'activity_logs'
  ) THEN
    ALTER TABLE public.activity_logs
      ADD CONSTRAINT activity_logs_performed_by_fkey
      FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Recreate policies idempotently
DROP POLICY IF EXISTS "Medical staff can view activity logs" ON public.activity_logs;
CREATE POLICY "Medical staff can view activity logs"
ON public.activity_logs FOR SELECT
USING (public.is_medical_staff());

DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can insert activity logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Generic auditing trigger function
CREATE OR REPLACE FUNCTION public.audit_activity()
RETURNS trigger AS $$
DECLARE
  v_performed_by uuid;
  v_action text;
  v_event text := lower(TG_OP);
  v_record_id uuid;
BEGIN
  v_performed_by := public.get_current_profile_id();

  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_action := 'Kreiran zapis u ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_action := 'Izmenjen zapis u ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_action := 'Obrisan zapis iz ' || TG_TABLE_NAME;
  END IF;

  INSERT INTO public.activity_logs (table_name, record_id, action, event_type, performed_by)
  VALUES (TG_TABLE_NAME, v_record_id, v_action, v_event, v_performed_by);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers to core tables (idempotent)
DROP TRIGGER IF EXISTS audit_patients_insert ON public.patients;
DROP TRIGGER IF EXISTS audit_patients_update ON public.patients;
CREATE TRIGGER audit_patients_insert AFTER INSERT ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.audit_activity();
CREATE TRIGGER audit_patients_update AFTER UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.audit_activity();

DROP TRIGGER IF EXISTS audit_appointments_insert ON public.appointments;
DROP TRIGGER IF EXISTS audit_appointments_update ON public.appointments;
DROP TRIGGER IF EXISTS audit_appointments_delete ON public.appointments;
CREATE TRIGGER audit_appointments_insert AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.audit_activity();
CREATE TRIGGER audit_appointments_update AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.audit_activity();
CREATE TRIGGER audit_appointments_delete AFTER DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.audit_activity();

DROP TRIGGER IF EXISTS audit_profiles_update ON public.profiles;
CREATE TRIGGER audit_profiles_update AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_activity();

-- Helpful index for fast recent activity queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
