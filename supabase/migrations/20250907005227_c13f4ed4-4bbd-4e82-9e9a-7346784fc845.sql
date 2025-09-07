-- Add user permissions table for managing what users can do
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  permission_type TEXT NOT NULL,
  is_granted BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_type)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Only admins can manage user permissions" 
ON public.user_permissions 
FOR ALL 
USING (is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permission types
INSERT INTO public.user_permissions (user_id, permission_type, is_granted, granted_by)
SELECT 
  p.id,
  pt.permission_type,
  CASE 
    WHEN p.role = 'admin' THEN true
    WHEN p.role = 'doctor' AND pt.permission_type IN ('view_patients', 'edit_patients', 'view_appointments', 'edit_appointments') THEN true
    WHEN p.role = 'nurse' AND pt.permission_type IN ('view_patients', 'view_appointments') THEN true
    ELSE false
  END as is_granted,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1) as granted_by
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('view_patients'),
    ('edit_patients'),
    ('delete_patients'),
    ('view_appointments'),
    ('edit_appointments'),
    ('delete_appointments'),
    ('manage_users'),
    ('view_reports')
) AS pt(permission_type)
WHERE p.is_active = true;