begin;

-- 1) Make handle_new_user department mapping case-insensitive and include hospital departments
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  user_department text;
  dept_upper text;
  assigned_role text;
BEGIN
  -- Get department from user metadata
  user_department := COALESCE(NEW.raw_user_meta_data ->> 'department', '');
  dept_upper := upper(coalesce(user_department, ''));
  
  -- Determine role based on department (case-insensitive, expanded list)
  assigned_role := CASE 
    WHEN dept_upper IN ('FINANCE','ADMIN','ADMINISTRATION','MANAGEMENT','IT') THEN 'admin'
    WHEN dept_upper = 'SUPPLY CHAIN' THEN 'editor'
    WHEN dept_upper IN ('BILLING') THEN 'editor'
    WHEN dept_upper IN ('PROCUREMENT','STORES','DRUG STORE','KITCHEN STORE') THEN 'uploader'
    WHEN dept_upper IN ('OPERATIONS','OPD','PR','MARKETING','ETU','PHARMACY','PHLEBOTOMY','KITCHEN','ULTRA SOUND','ARALIYA WARD','RADIOLOGY','CALL CENTER','HEALTH CHECK','MEDICAL SERVICES','ASSISTANT MANAGER OPERATIONS','NELUM WARD','PHYSIOTHERAPHY','LAB','ENG','DTU','MICU','ICU','ORCHID','THEATER','HOME CARE','FACILITY','HR','QUALITY','ADORA','EHR') THEN 'viewer'
    ELSE 'viewer'
  END;

  -- Insert into profiles table with department as provided
  INSERT INTO public.profiles (id, email, first_name, last_name, designation, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'designation', ''),
    user_department
  );
  
  -- Assign department-based role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role::public.admin_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- 2) Ensure admins (e.g., IT/Administration) can view all invoices
CREATE POLICY IF NOT EXISTS "Admins can view all invoices"
ON public.invoices
FOR SELECT
USING (
  public.has_permission_level(auth.uid(), 'admin'::public.admin_role)
);

-- 3) Backfill roles for existing users based on current profile.department
WITH prof AS (
  SELECT p.id AS user_id, upper(coalesce(p.department,'')) AS dept
  FROM public.profiles p
)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id,
       CASE 
         WHEN dept IN ('FINANCE','ADMIN','ADMINISTRATION','MANAGEMENT','IT') THEN 'admin'::public.admin_role
         WHEN dept = 'SUPPLY CHAIN' THEN 'editor'::public.admin_role
         WHEN dept IN ('BILLING') THEN 'editor'::public.admin_role
         WHEN dept IN ('PROCUREMENT','STORES','DRUG STORE','KITCHEN STORE') THEN 'uploader'::public.admin_role
         ELSE 'viewer'::public.admin_role
       END
FROM prof
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = prof.user_id
);

commit;