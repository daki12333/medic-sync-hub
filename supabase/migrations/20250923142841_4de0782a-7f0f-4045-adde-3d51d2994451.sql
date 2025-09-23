-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS specialization TEXT;

-- Add missing columns to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Create activity_logs table for admin dashboard
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create new one  
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view activity logs"
ON public.activity_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update profiles to have full_name computed from first_name and last_name
UPDATE public.profiles 
SET full_name = COALESCE(first_name || ' ' || last_name, first_name, last_name, email)
WHERE full_name IS NULL;

-- Make sure nenad@pulsmedic.rs user has a profile
DO $$
DECLARE
    _user_id UUID;
BEGIN
    -- Find the user by email
    SELECT id INTO _user_id 
    FROM auth.users 
    WHERE email = 'nenad@pulsmedic.rs';
    
    IF _user_id IS NOT NULL THEN
        -- Insert or update profile
        INSERT INTO public.profiles (user_id, email, first_name, last_name, full_name, role)
        VALUES (_user_id, 'nenad@pulsmedic.rs', 'Nenad', 'Admin', 'Nenad Admin', 'admin')
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
            
        RAISE NOTICE 'Profile created/updated for nenad@pulsmedic.rs';
    END IF;
END;
$$;