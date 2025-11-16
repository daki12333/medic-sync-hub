-- Remove the problematic foreign key constraint that references auth.users
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;

-- Add a comment to document why we don't have a foreign key here
COMMENT ON COLUMN public.appointments.created_by IS 'User ID from auth.users - no foreign key constraint as auth schema should not be directly referenced';