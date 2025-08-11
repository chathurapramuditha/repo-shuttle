-- Restrict profiles visibility to HR and direct managers; add manager relationships and helper functions

-- 1) Create manager_relationships table
CREATE TABLE IF NOT EXISTS public.manager_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(manager_id, employee_id)
);

-- Enable RLS on the new table
ALTER TABLE public.manager_relationships ENABLE ROW LEVEL SECURITY;

-- Policies for manager_relationships
DO $$
BEGIN
  -- Drop if exist to allow re-run safely
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'manager_relationships' AND policyname = 'Managers can view their relationships'
  ) THEN
    DROP POLICY "Managers can view their relationships" ON public.manager_relationships;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'manager_relationships' AND policyname = 'HR and super admins can manage relationships'
  ) THEN
    DROP POLICY "HR and super admins can manage relationships" ON public.manager_relationships;
  END IF;
END$$;

CREATE POLICY "Managers can view their relationships"
ON public.manager_relationships
FOR SELECT
USING (auth.uid() = manager_id OR auth.uid() = employee_id);

CREATE POLICY "HR and super admins can manage relationships"
ON public.manager_relationships
FOR ALL
USING (
  public.has_role(auth.uid(), 'super_admin'::public.admin_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.department = 'HR'
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.admin_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.department = 'HR'
  )
);

-- 2) Helper functions with SECURITY DEFINER and fixed search_path
CREATE OR REPLACE FUNCTION public.is_hr(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.department = 'HR'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of(_manager_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.manager_relationships mr
    WHERE mr.manager_id = _manager_id AND mr.employee_id = _employee_id
  );
$$;

-- 3) Tighten profiles SELECT RLS: remove broad admin visibility, allow HR and direct managers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admins can view all profiles'
  ) THEN
    DROP POLICY "Admins can view all profiles" ON public.profiles;
  END IF;
END$$;

-- Keep super admin policy as-is for operational needs

-- Add HR view-all policy if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'HR can view all profiles'
  ) THEN
    CREATE POLICY "HR can view all profiles"
    ON public.profiles
    FOR SELECT
    USING (public.is_hr(auth.uid()));
  END IF;
END$$;

-- Add manager direct-report view policy if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Managers can view their direct reports'
  ) THEN
    CREATE POLICY "Managers can view their direct reports"
    ON public.profiles
    FOR SELECT
    USING (public.is_manager_of(auth.uid(), id));
  END IF;
END$$;

-- Optional: index to speed up manager lookups
CREATE INDEX IF NOT EXISTS idx_manager_relationships_manager_employee
  ON public.manager_relationships (manager_id, employee_id);
