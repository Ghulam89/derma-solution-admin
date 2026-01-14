-- Migration: Add doctor_id column to orders table
-- This migration adds support for associating bookings with doctors

-- Ensure doctor_id column exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'doctor_id'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_orders_doctor ON public.orders(doctor_id);
  END IF;
END
$$;

