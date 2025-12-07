-- Create table for SMS campaign history
CREATE TABLE public.sms_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  successful_sends INTEGER NOT NULL DEFAULT 0,
  failed_sends INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

-- Only admins can view campaigns
CREATE POLICY "Admins can view SMS campaigns"
ON public.sms_campaigns
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can create campaigns
CREATE POLICY "Admins can create SMS campaigns"
ON public.sms_campaigns
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));