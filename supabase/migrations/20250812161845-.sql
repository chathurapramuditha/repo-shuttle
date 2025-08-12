-- Expand invoice visibility for Supply Chain and make Finance check case-insensitive
begin;

-- 1) Case-insensitive Finance department check
CREATE OR REPLACE FUNCTION public.is_finance(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND upper(coalesce(p.department, '')) = 'FINANCE'
  );
$function$;

-- 2) Utility: check if user is in any of the provided departments (case-insensitive)
CREATE OR REPLACE FUNCTION public.is_in_departments(_user_id uuid, _departments text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND upper(coalesce(p.department, '')) = ANY (
        SELECT upper(d) FROM unnest(_departments) AS d
      )
  );
$function$;

-- 3) Convenience function for Supply Chain
CREATE OR REPLACE FUNCTION public.is_supply_chain(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND upper(coalesce(p.department, '')) = 'SUPPLY CHAIN'
  );
$function$;

-- 4) Update invoices SELECT policy to include Supply Chain (keep super admins and finance)
DROP POLICY IF EXISTS "Finance and super admins can view invoices" ON public.invoices;

CREATE POLICY "Finance, Supply Chain, and super admins can view invoices"
ON public.invoices
FOR SELECT
USING (
  public.is_finance(auth.uid())
  OR public.is_supply_chain(auth.uid())
  OR public.has_role(auth.uid(), 'super_admin'::public.admin_role)
);

commit;