-- Make nenad@pulsmedic.rs an admin
DO $$
DECLARE
    _user_id UUID;
BEGIN
    -- Find the user by email
    SELECT id INTO _user_id 
    FROM auth.users 
    WHERE email = 'nenad@pulsmedic.rs';
    
    IF _user_id IS NOT NULL THEN
        -- Remove existing roles for this user
        DELETE FROM public.user_roles WHERE user_id = _user_id;
        
        -- Add admin role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (_user_id, 'admin');
        
        RAISE NOTICE 'User nenad@pulsmedic.rs has been given admin role';
    ELSE
        RAISE NOTICE 'User nenad@pulsmedic.rs not found';
    END IF;
END;
$$;