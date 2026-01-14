-- ============================================
-- CREATE ADMIN ACCOUNT
-- ============================================
-- This script helps you create an admin account
-- 
-- OPTION 1: If you already have a user account, promote it to admin
-- Replace 'your-email@example.com' with the actual email address
-- ============================================

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- ============================================
-- OPTION 2: Create admin account directly in Supabase Auth
-- (You'll need to do this through Supabase Dashboard first)
-- 
-- Steps:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" or "Invite User"
-- 3. Enter email: admin@example.com
-- 4. Set password (or send invite)
-- 5. After user is created, run the UPDATE query above with that email
-- ============================================

-- ============================================
-- OPTION 3: Verify admin account was created
-- ============================================

SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM public.profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

