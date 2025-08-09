-- Attach signup triggers to create profiles and assign roles automatically
-- If triggers already exist, they will be replaced

-- Create trigger to insert into profiles and user_roles on new auth user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create trigger to notify admin on new user (fails gracefully inside function)
DROP TRIGGER IF EXISTS on_auth_user_created_notify ON auth.users;
CREATE TRIGGER on_auth_user_created_notify
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.notify_admin_new_user();
