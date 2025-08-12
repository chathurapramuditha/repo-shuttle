begin;

-- Recreate admin view policy without IF NOT EXISTS
DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;

CREATE POLICY "Admins can view all invoices"
ON public.invoices
FOR SELECT
USING (
  public.has_permission_level(auth.uid(), 'admin'::public.admin_role)
);

commit;