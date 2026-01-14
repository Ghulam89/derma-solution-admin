-- Fix Login Issues
-- Run this in Supabase SQL Editor to diagnose and fix common login problems

-- 1. Check if users exist and their confirmation status
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'Email NOT confirmed'
    ELSE 'Email confirmed'
  END as confirmation_status
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check if profiles exist for users
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  p.id as profile_id,
  p.role,
  CASE 
    WHEN p.id IS NULL THEN 'Profile MISSING'
    ELSE 'Profile exists'
  END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 20;

-- 3. Confirm all user emails (if email confirmation is blocking login)
-- WARNING: Only run this if you want to bypass email confirmation for development
-- UPDATE auth.users 
-- SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
-- WHERE email_confirmed_at IS NULL;

-- 4. Create missing profiles for users without profiles
-- This will create profiles for any users that don't have one
INSERT INTO public.profiles (id, email, first_name, last_name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', SPLIT_PART(u.email, '@', 1)) as first_name,
  COALESCE(u.raw_user_meta_data->>'last_name', '') as last_name,
  COALESCE((u.raw_user_meta_data->>'role')::public.user_role, 'customer') as role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 5. Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 6. Verify users can read their own profile (for debugging)
-- This should return the policy: "Users can read own profile"
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles' 
  AND cmd = 'SELECT'
  AND policyname = 'Users can read own profile';

-- 7. Check for specific user (replace email with actual email)
-- SELECT 
--   u.id,
--   u.email,
--   u.email_confirmed_at,
--   u.created_at,
--   p.role,
--   p.first_name,
--   p.last_name
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON u.id = p.id
-- WHERE u.email = 'user@example.com';

-- 8. Reset a specific user's password (requires admin)
-- This requires using Supabase Dashboard → Authentication → Users
-- Or use the API: POST /auth/v1/admin/users/{user_id}/password
-- You cannot reset passwords via SQL for security reasons

-- 9. Disable email confirmation requirement (for development only)
-- This must be done via Supabase Dashboard:
-- Go to Authentication → Settings → Email Auth
-- Disable "Enable email confirmations"

