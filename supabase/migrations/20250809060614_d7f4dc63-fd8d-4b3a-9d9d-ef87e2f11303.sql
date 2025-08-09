-- Create admin_role enum if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE public.admin_role AS ENUM ('super_admin','admin','lite_admin','editor','uploader','viewer');
  END IF;
END $$;

-- Ensure profiles table exists (used by handle_new_user)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  designation text,
  department text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure user_roles table exists with enum
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.admin_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper functions (create or replace to ensure they exist and compile)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.admin_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission_level(_user_id uuid, _min_level public.admin_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id 
    AND (
      (ur.role = 'super_admin') OR
      (ur.role = 'admin' AND _min_level IN ('admin','lite_admin','editor','uploader','viewer')) OR
      (ur.role = 'lite_admin' AND _min_level IN ('lite_admin','editor','uploader','viewer')) OR
      (ur.role = 'editor' AND _min_level IN ('editor','uploader','viewer')) OR
      (ur.role = 'uploader' AND _min_level IN ('uploader','viewer')) OR
      (ur.role = 'viewer' AND _min_level = 'viewer')
    )
  );
$$;

-- Policies for profiles (id is user id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
    CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;

-- Policies for user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles'
  ) THEN
    CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_permission_level(auth.uid(), 'admin'));
    CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE USING (public.has_permission_level(auth.uid(), 'admin'));
    CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE USING (public.has_permission_level(auth.uid(), 'admin'));
    CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
  END IF;
END $$;