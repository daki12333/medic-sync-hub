-- Allow admins to delete patients from the database
CREATE POLICY "Admins can delete patients"
ON public.patients
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));