import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useMultiTabAuth } from '@/hooks/useMultiTabAuth';
import { useToast } from '@/hooks/use-toast';
import { SettingsDialog } from '@/components/SettingsDialog';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Try to use MultiTabAuth first, fallback to regular Auth
  let authHook;
  try {
    authHook = useMultiTabAuth();
  } catch {
    authHook = useAuth();
  }
  
  const { signUp, signIn } = authHook;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    designation: '',
    department: '',
    password: '',
    confirmPassword: ''
  });

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginForm.email, loginForm.password);
    
    if (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // Check if user needs to change password after admin reset
      // This will be triggered by a database flag or user metadata
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.user_metadata?.force_password_change) {
        setShowPasswordReset(true);
        toast({
          title: "Password Change Required",
          description: "Your password was reset by an admin. Please set a new password.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        navigate('/');
      }
    }
    
    setIsLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentPassword !== 'Hemas@123') {
      toast({
        title: "Invalid Current Password",
        description: "Please enter the correct current password",
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(loginForm.email, currentPassword);
      
      if (!error) {
        // Now update the password
        const { supabase } = await import('@/integrations/supabase/client');
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          toast({
            title: "Password Update Failed",
            description: updateError.message,
            variant: "destructive"
          });
        } else {
          // Clear the force password change flag
          await supabase.auth.updateUser({
            data: { force_password_change: false }
          });
          
          toast({
            title: "Password Updated",
            description: "Your password has been successfully changed",
          });
          setShowPasswordReset(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(
      signUpForm.email,
      signUpForm.password,
      signUpForm.firstName,
      signUpForm.lastName,
      signUpForm.designation,
      signUpForm.department
    );
    
    if (error) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Registration Successful",
        description: "Please check your email to verify your account.",
      });
    }
    
    setIsLoading(false);
  };

  // Department options with automatic role assignment (expanded)
  const departmentOptions = [
    // Existing core departments
    { value: 'IT', label: 'IT', defaultRole: 'admin' },
    { value: 'Finance', label: 'Finance', defaultRole: 'admin' },
    { value: 'Supply Chain', label: 'Supply Chain', defaultRole: 'editor' },
    { value: 'Procurement', label: 'Procurement', defaultRole: 'uploader' },
    { value: 'Operations', label: 'Operations', defaultRole: 'viewer' },
    { value: 'Management', label: 'Management', defaultRole: 'admin' },

    // Hospital-provided departments
    { value: 'OPD', label: 'OPD', defaultRole: 'viewer' },
    { value: 'FINANCE', label: 'FINANCE', defaultRole: 'admin' },
    { value: 'PR', label: 'PR', defaultRole: 'viewer' },
    { value: 'Marketing', label: 'Marketing', defaultRole: 'viewer' },
    { value: 'ETU', label: 'ETU', defaultRole: 'viewer' },
    { value: 'PHARMACY', label: 'PHARMACY', defaultRole: 'viewer' },
    { value: 'PHLEBOTOMY', label: 'PHLEBOTOMY', defaultRole: 'viewer' },
    { value: 'Kitchen', label: 'Kitchen', defaultRole: 'viewer' },
    { value: 'Ultra Sound', label: 'Ultra Sound', defaultRole: 'viewer' },
    { value: 'Araliya Ward', label: 'Araliya Ward', defaultRole: 'viewer' },
    { value: 'Radiology', label: 'Radiology', defaultRole: 'viewer' },
    { value: 'Call Center', label: 'Call Center', defaultRole: 'viewer' },
    { value: 'Health Check', label: 'Health Check', defaultRole: 'viewer' },
    { value: 'Medical Services', label: 'Medical Services', defaultRole: 'viewer' },
    { value: 'Assistant Manager Operations', label: 'Assistant Manager Operations', defaultRole: 'viewer' },
    { value: 'Nelum Ward', label: 'Nelum Ward', defaultRole: 'viewer' },
    { value: 'Physiotheraphy', label: 'Physiotheraphy', defaultRole: 'viewer' },
    { value: 'Billing', label: 'Billing', defaultRole: 'editor' },
    { value: 'Lab', label: 'Lab', defaultRole: 'viewer' },
    { value: 'Drug Store', label: 'Drug Store', defaultRole: 'uploader' },
    { value: 'ENG', label: 'ENG', defaultRole: 'viewer' },
    { value: 'Stores', label: 'Stores', defaultRole: 'uploader' },
    { value: 'ADMINISTRATION', label: 'ADMINISTRATION', defaultRole: 'admin' },
    { value: 'DTU', label: 'DTU', defaultRole: 'viewer' },
    { value: 'MICU', label: 'MICU', defaultRole: 'viewer' },
    { value: 'ICU', label: 'ICU', defaultRole: 'viewer' },
    { value: 'Orchid', label: 'Orchid', defaultRole: 'viewer' },
    { value: 'Theater', label: 'Theater', defaultRole: 'viewer' },
    { value: 'Home Care', label: 'Home Care', defaultRole: 'viewer' },
    { value: 'Facility', label: 'Facility', defaultRole: 'viewer' },
    { value: 'HR', label: 'HR', defaultRole: 'viewer' },
    { value: 'Quality', label: 'Quality', defaultRole: 'viewer' },
    { value: 'Adora', label: 'Adora', defaultRole: 'viewer' },
    { value: 'EHR', label: 'EHR', defaultRole: 'viewer' },
    { value: 'Admin', label: 'Admin', defaultRole: 'admin' },
    { value: 'Kitchen Store', label: 'Kitchen Store', defaultRole: 'uploader' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Settings Button - Top Right */}
      <div className="fixed top-4 right-4 z-10">
        <SettingsDialog />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
          <CardDescription>Sign in to your account or create a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              
              {/* Password Change Form - Appears after reset */}
              {showPasswordReset && (
                <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <h3 className="text-sm font-medium text-yellow-800 mb-3">
                    Password Change Required
                  </h3>
                   <form onSubmit={handlePasswordChange} className="space-y-3">
                     <div className="space-y-2">
                       <Label htmlFor="current-password">Current Password</Label>
                       <Input
                         id="current-password"
                         type="password"
                         value={currentPassword}
                         onChange={(e) => setCurrentPassword(e.target.value)}
                         placeholder="Enter your current password"
                         required
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="new-password">New Password</Label>
                       <Input
                         id="new-password"
                         type="password"
                         value={newPassword}
                         onChange={(e) => setNewPassword(e.target.value)}
                         placeholder="Enter your new password"
                         required
                       />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="confirm-new-password">Confirm Password</Label>
                       <Input
                         id="confirm-new-password"
                         type="password"
                         value={confirmNewPassword}
                         onChange={(e) => setConfirmNewPassword(e.target.value)}
                         placeholder="Confirm your new password"
                         required
                       />
                     </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Updating Password..." : "Update Password"}
                    </Button>
                  </form>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpForm.email}
                    onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      value={signUpForm.firstName}
                      onChange={(e) => setSignUpForm({ ...signUpForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      value={signUpForm.lastName}
                      onChange={(e) => setSignUpForm({ ...signUpForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={signUpForm.designation}
                    onChange={(e) => setSignUpForm({ ...signUpForm, designation: e.target.value })}
                    placeholder="e.g. Manager, Developer, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={signUpForm.department}
                    onValueChange={(value) => setSignUpForm({ ...signUpForm, department: value })}
                  >
                    <SelectTrigger className="bg-background text-foreground border-border">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Your department determines your initial access level
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signUpForm.password}
                    onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={signUpForm.confirmPassword}
                    onChange={(e) => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;