-- Make nenad@pulsmedic.rs an admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('3be9acfd-c849-4fc1-b941-9de401faf68f', 'admin') 
ON CONFLICT (user_id, role) DO NOTHING;