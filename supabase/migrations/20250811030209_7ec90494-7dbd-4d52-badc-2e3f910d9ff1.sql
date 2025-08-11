-- Restrict invoice visibility to finance team, managers, and creators

-- 1) Helper function: is_finance
CREATE OR REPLACE FUNCTION public.is_finance(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.department = 'Finance'
  );
$$;

-- 2) Replace overly broad SELECT policy on invoices
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'All authenticated users can view all invoices'
  ) THEN
    DROP POLICY "All authenticated users can view all invoices" ON public.invoices;
  END IF;
END$$;

-- Finance and super admins can view all invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Finance and super admins can view invoices'
  ) THEN
    CREATE POLICY "Finance and super admins can view invoices"
    ON public.invoices
    FOR SELECT
    USING (
      public.is_finance(auth.uid())
      OR public.has_role(auth.uid(), 'super_admin'::public.admin_role)
    );
  END IF;
END$$;

-- Invoice creators can view their own invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Creators can view their invoices'
  ) THEN
    CREATE POLICY "Creators can view their invoices"
    ON public.invoices
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- Managers can view invoices created by their direct reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'invoices' AND policyname = 'Managers can view their reports invoices'
  ) THEN
    CREATE POLICY "Managers can view their reports invoices"
    ON public.invoices
    FOR SELECT
    USING (public.is_manager_of(auth.uid(), user_id));
  END IF;
END$$;

-- 3) Performance index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
