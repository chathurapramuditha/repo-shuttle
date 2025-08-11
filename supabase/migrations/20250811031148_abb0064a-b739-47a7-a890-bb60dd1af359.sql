-- Ensure trigger exists to auto-create profiles on signup and backfill existing data
begin;

-- 1) Create trigger on auth.users to call public.handle_new_user()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END$$;

-- 2) Backfill profiles for existing users missing a profile
INSERT INTO public.profiles (id, email, first_name, last_name, designation, department)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data ->> 'first_name', ''),
       COALESCE(u.raw_user_meta_data ->> 'last_name', ''),
       COALESCE(u.raw_user_meta_data ->> 'designation', ''),
       NULLIF(u.raw_user_meta_data ->> 'department', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3) Update existing profiles that have empty department but auth metadata has a value
UPDATE public.profiles p
SET department = NULLIF(u.raw_user_meta_data ->> 'department', '')
FROM auth.users u
WHERE p.id = u.id
  AND (p.department IS NULL OR p.department = '')
  AND COALESCE(u.raw_user_meta_data ->> 'department', '') <> '';

-- 4) Ensure every user has at least one role based on department (without overwriting existing roles)
WITH user_meta AS (
  SELECT u.id,
         COALESCE(u.raw_user_meta_data ->> 'department', '') AS dept
  FROM auth.users u
)
INSERT INTO public.user_roles (user_id, role)
SELECT um.id,
       CASE 
         WHEN um.dept = 'Finance' THEN 'admin'::public.admin_role
         WHEN um.dept = 'Supply Chain' THEN 'editor'::public.admin_role
         WHEN um.dept = 'IT' THEN 'admin'::public.admin_role
         WHEN um.dept = 'Procurement' THEN 'uploader'::public.admin_role
         WHEN um.dept = 'Management' THEN 'admin'::public.admin_role
         WHEN um.dept = 'Operations' THEN 'viewer'::public.admin_role
         ELSE 'viewer'::public.admin_role
       END AS role
FROM user_meta um
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = um.id
);

commit;