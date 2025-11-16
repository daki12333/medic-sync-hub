-- Remove calendar permissions table as all users can now edit everything
DROP TABLE IF EXISTS public.calendar_permissions CASCADE;