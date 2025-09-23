-- Create the admin user directly (this will use the Auth API)
-- Since we can't create auth users via SQL, we'll prepare for when the user is created

-- First, let's create a function to make a user admin by email
CREATE OR REPLACE FUNCTION public.make_user_admin_by_email(_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO _user_id 
  FROM auth.users 
  WHERE email = _email;
  
  IF _user_id IS NOT NULL THEN
    -- Remove existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = _user_id;
    
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin');
  END IF;
END;
$$;