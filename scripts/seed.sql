-- Seed patients
INSERT INTO patients (name, dob, sex, address, contact_number) VALUES
  ('Debra Robertson', '1988-03-15', 'Female', '123 Mabini St, Manila', '+639123456001'),
  ('John Doe', '1992-07-22', 'Male', '456 Rizal Ave, Quezon City', '+639123456002'),
  ('Maria Santos', '1975-11-08', 'Female', '789 Bonifacio St, Makati', '+639123456003'),
  ('Carlos Reyes', '2000-01-30', 'Male', '321 Aguinaldo Hwy, Pasig', '+639123456004'),
  ('Anna Gonzales', '1965-05-18', 'Female', '654 Luna St, Mandaluyong', '+639123456005'),
  ('Pedro Cruz', '1995-09-12', 'Male', '987 Del Pilar St, Taguig', '+639123456006'),
  ('Lisa Tan', '1982-12-25', 'Female', '147 Quezon Blvd, Manila', '+639123456007'),
  ('Jose Rizal Jr', '1978-06-14', 'Male', '258 Katipunan Ave, Quezon City', '+639123456008'),
  ('Grace Lee', '1998-04-03', 'Female', '369 Shaw Blvd, Pasig', '+639123456009'),
  ('Miguel Lopez', '1985-08-20', 'Male', '741 Ortigas Ave, Mandaluyong', '+639123456010');

-- Update existing doctors as available
UPDATE doctors SET available = TRUE WHERE available IS NULL;

-- Add 2 unavailable doctors
INSERT INTO doctors (name, specialty, avatar_initials, available) VALUES
  ('Dr. Emily Cruz', 'Pediatrics', 'EC', false),
  ('Dr. Mark Tan', 'Orthopedics', 'MT', false)
ON CONFLICT DO NOTHING;

-- Create appointments table if not exists
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  doctor_id UUID REFERENCES doctors(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed vitals_log records for Debra Robertson (id will match the inserted row)
-- We use a DO block to get the patient IDs
DO $$
DECLARE
  debra_id uuid;
  john_id uuid;
BEGIN
  SELECT id INTO debra_id FROM patients WHERE name = 'Debra Robertson' LIMIT 1;
  SELECT id INTO john_id FROM patients WHERE name = 'John Doe' LIMIT 1;

  INSERT INTO vitals_log (patient_id, weight_kg, temperature_c, oxygen_saturation, heart_rate, recorded_at) VALUES
    (debra_id, 72.5, 36.7, 98.0, 72, NOW() - INTERVAL '1 hour'),
    (debra_id, 73.1, 36.5, 97.0, 75, NOW() - INTERVAL '1 day'),
    (debra_id, 72.8, 36.6, 98.0, 70, NOW() - INTERVAL '2 days'),
    (debra_id, 73.4, 36.8, 97.5, 73, NOW() - INTERVAL '1 week'),
    (john_id, 85.2, 36.9, 99.0, 68, NOW() - INTERVAL '2 hours'),
    (john_id, 84.8, 37.0, 98.5, 70, NOW() - INTERVAL '1 day');
END $$;
