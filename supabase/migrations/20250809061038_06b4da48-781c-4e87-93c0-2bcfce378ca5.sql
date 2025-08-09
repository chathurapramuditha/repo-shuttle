-- Fix handle_new_user to reference enum with schema qualification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_department text;
  assigned_role text;
BEGIN
  -- Get department from user metadata
  user_department := COALESCE(NEW.raw_user_meta_data ->> 'department', '');
  
  -- Determine role based on department
  assigned_role := CASE 
    WHEN user_department = 'Finance' THEN 'admin'
    WHEN user_department = 'Supply Chain' THEN 'editor'
    WHEN user_department = 'IT' THEN 'admin'
    WHEN user_department = 'Procurement' THEN 'uploader'
    WHEN user_department = 'Management' THEN 'admin'
    WHEN user_department = 'Operations' THEN 'viewer'
    ELSE 'viewer'
  END;

  -- Insert into profiles table with department
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