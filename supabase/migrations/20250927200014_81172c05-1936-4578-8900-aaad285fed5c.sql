-- Add missing foreign key constraints (only if they don't exist)

-- Add foreign key from appointments.patient_id to patients.id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_patient_id_fkey') THEN
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_patient_id_fkey 
        FOREIGN KEY (patient_id) REFERENCES public.patients(id);
    END IF;
END $$;

-- Add foreign key from calendar_permissions.user_id to profiles.user_id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_permissions_user_id_fkey') THEN
        ALTER TABLE public.calendar_permissions 
        ADD CONSTRAINT calendar_permissions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
    END IF;
END $$;

-- Add foreign key from calendar_permissions.doctor_id to profiles.user_id (if not exists)  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_permissions_doctor_id_fkey') THEN
        ALTER TABLE public.calendar_permissions 
        ADD CONSTRAINT calendar_permissions_doctor_id_fkey 
        FOREIGN KEY (doctor_id) REFERENCES public.profiles(user_id);
    END IF;
END $$;