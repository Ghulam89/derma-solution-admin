-- Fix: Add missing RLS policy to allow admins to insert orders
-- This fixes the error: "new row violates row-level security policy for table 'orders'"
-- when admins try to create bookings from the admin panel

-- Drop the policy if it already exists (idempotent)
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;

-- Create the policy to allow admins to insert orders
CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (public.is_admin());

-- Verify the policy was created
-- You can check by running: SELECT * FROM pg_policies WHERE tablename = 'orders';

