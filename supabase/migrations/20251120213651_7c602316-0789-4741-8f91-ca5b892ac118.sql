-- Drop existing foreign key constraint
ALTER TABLE specialist_reports 
DROP CONSTRAINT IF EXISTS specialist_reports_doctor_id_fkey;

-- Add foreign key constraint with CASCADE delete
ALTER TABLE specialist_reports 
ADD CONSTRAINT specialist_reports_doctor_id_fkey 
FOREIGN KEY (doctor_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;
