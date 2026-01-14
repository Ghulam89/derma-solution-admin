-- ============================================
-- DOCTORS TABLE
-- ============================================
-- This script creates the doctors table and associated policies
-- for managing doctors in the admin panel

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  specialization TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for active doctors
CREATE INDEX IF NOT EXISTS idx_doctors_active ON public.doctors(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active doctors
CREATE POLICY "Anyone can read active doctors"
  ON public.doctors FOR SELECT
  USING (is_active = TRUE);

-- Policy: Admins can read all doctors (including inactive)
CREATE POLICY "Admins can read all doctors"
  ON public.doctors FOR SELECT
  USING (public.is_admin());

-- Policy: Admins can insert doctors
CREATE POLICY "Admins can insert doctors"
  ON public.doctors FOR INSERT
  WITH CHECK (public.is_admin());

-- Policy: Admins can update doctors
CREATE POLICY "Admins can update doctors"
  ON public.doctors FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy: Admins can delete doctors
CREATE POLICY "Admins can delete doctors"
  ON public.doctors FOR DELETE
  USING (public.is_admin());

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_doctors_updated_at ON public.doctors;
CREATE TRIGGER trg_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

