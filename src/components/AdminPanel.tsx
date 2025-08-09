import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Settings, Trash2, Zap, Shield, Eye, Edit, Upload, UserCheck, FileText, Calendar, TrendingUp, Mail, Lock, UserX, RotateCcw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMultiTabAuth } from "@/hooks/useMultiTabAuth";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  designation: string;
  department: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface UserWithRole extends User {
  role?: string;
}

export function AdminPanel() {
  // Try to use MultiTabAuth first, fallback to regular Auth
  let authHook;
  try {
    authHook = useMultiTabAuth();
  } catch {
    authHook = useAuth();
  }
  
  const { user } = authHook;
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<string | null>(null);
  const [editDesignationValue, setEditDesignationValue] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [editDepartmentValue, setEditDepartmentValue] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    designation: '',
    password: '',
    role: 'viewer'
  });

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserRole();
  }, []);

  const fetchCurrentUserRole = async () => {
    if (user) {
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        setUserRole(data?.role || null);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine users with their roles
      // Combine users with their roles
      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(role => role.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'no_role'
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          designation: newUser.designation,
          role: newUser.role
        }
      });

      if (error) throw error;

      if (data.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setNewUser({
        email: '',
        firstName: '',
        lastName: '',
        designation: '',
        password: '',
        role: 'viewer'
      });
      setIsCreateUserOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as any })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: newRole as any
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'lite_admin': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'uploader': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const roleTemplates = [
    {
      name: "Finance Team Member",
      role: "editor",
      description: "Can view, upload, and edit invoices",
      icon: Edit,
      color: "bg-blue-50 border-blue-200"
    },
    {
      name: "Data Entry Staff",
      role: "uploader",
      description: "Can view and upload new invoices",
      icon: Upload,
      color: "bg-green-50 border-green-200"
    },
    {
      name: "Viewer Only",
      role: "viewer",
      description: "Can only view invoices, no editing",
      icon: Eye,
      color: "bg-gray-50 border-gray-200"
    },
    {
      name: "Department Admin",
      role: "admin",
      description: "Full access including user management",
      icon: Shield,
      color: "bg-red-50 border-red-200"
    }
  ];

  const applyRoleTemplate = (userId: string, templateRole: string) => {
    handleUpdateRole(userId, templateRole);
  };

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');

  const handleGenerateReport = async (format: 'excel' | 'pdf') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          type: reportType,
          format: format
        }
      });
      
      if (error) throw error;
      
      if (data.error) throw new Error(data.error);

      toast({
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report Generated`,
        description: `${format.toUpperCase()} report sent successfully to ${data.emails_sent || 0} users`,
      });
      
      setReportDialogOpen(false);
    } catch (error: any) {
      console.error(`Error generating ${reportType} report:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to generate ${reportType} report`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openReportDialog = (type: 'weekly' | 'monthly') => {
    setReportType(type);
    setReportDialogOpen(true);
  };

  const handleSendOverdueEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-supply-chain-email');
      
      if (error) throw error;
      
      if (data.error) throw new Error(data.error);

      toast({
        title: "Overdue Emails Sent",
        description: data.message || "Overdue invoice notifications have been sent",
      });
    } catch (error: any) {
      console.error('Error sending overdue emails:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send overdue emails",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { userId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Password Reset",
        description: "Password has been reset to 'Hemas@123'",
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDesignation = async (userId: string, newDesignation: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ designation: newDesignation })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Designation updated successfully",
      });

      fetchUsers();
      setEditingDesignation(null);
    } catch (error: any) {
      console.error('Error updating designation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update designation",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDepartment = async (userId: string, newDepartment: string) => {
    try {
      console.log('Updating department for user:', userId, 'to:', newDepartment);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ department: newDepartment })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update result:', data);

      if (data && data.length > 0) {
        toast({
          title: "Success",
          description: "Department updated successfully",
        });
        fetchUsers();
        setEditingDepartment(null);
      } else {
        toast({
          title: "Warning",
          description: "No user found with that ID to update",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error updating department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update department",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete user role first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Delete user profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      toast({
        title: "User Deleted",
        description: "User has been successfully removed",
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const isSuperAdmin = userRole === 'super_admin';

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage users and their permissions</p>
        </div>
        
        <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-card-foreground" aria-describedby="create-user-description">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <p id="create-user-description" className="text-sm text-muted-foreground">
                Add a new user to the system with appropriate permissions
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    className="bg-background text-foreground border-border"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="bg-background text-foreground border-border"
                />
              </div>
              
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={newUser.designation}
                  onChange={(e) => setNewUser({...newUser, designation: e.target.value})}
                  className="bg-background text-foreground border-border"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="bg-background text-foreground border-border"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer - Can only view invoices</SelectItem>
                    <SelectItem value="uploader">Uploader - Can upload invoices</SelectItem>
                    <SelectItem value="editor">Editor - Can edit invoices</SelectItem>
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleCreateUser}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Creating..." : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length} of {users.length})
          </CardTitle>
          {/* User Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users by name, email, designation, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background text-foreground border-border"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((userItem) => (
                <TableRow key={userItem.id}>
                  <TableCell className="font-medium">
                    {userItem.first_name} {userItem.last_name}
                  </TableCell>
                  <TableCell>{userItem.email}</TableCell>
                  <TableCell>
                    {isSuperAdmin && editingDesignation === userItem.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editDesignationValue}
                          onChange={(e) => setEditDesignationValue(e.target.value)}
                          className="h-8"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleUpdateDesignation(userItem.id, editDesignationValue)}
                          className="h-8 w-8 p-0"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingDesignation(null)}
                          className="h-8 w-8 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{userItem.designation}</span>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDesignation(userItem.id);
                              setEditDesignationValue(userItem.designation);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSuperAdmin && editingDepartment === userItem.id ? (
                      <div className="flex gap-2">
                        <Select
                          value={editDepartmentValue}
                          onValueChange={setEditDepartmentValue}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border">
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Supply Chain">Supply Chain</SelectItem>
                            <SelectItem value="IT">IT</SelectItem>
                            <SelectItem value="Procurement">Procurement</SelectItem>
                            <SelectItem value="Management">Management</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateDepartment(userItem.id, editDepartmentValue)}
                          className="h-8 w-8 p-0"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingDepartment(null)}
                          className="h-8 w-8 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{userItem.department || 'Not set'}</span>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDepartment(userItem.id);
                              setEditDepartmentValue(userItem.department || '');
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(userItem.role || 'no_role')}>
                      {userItem.role?.replace('_', ' ').toUpperCase() || 'NO ROLE'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(userItem.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={userItem.role || 'no_role'}
                        onValueChange={(value) => handleUpdateRole(userItem.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="uploader">Uploader</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {isSuperAdmin && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPassword(userItem.id)}
                            className="h-8 w-8 p-0"
                            title="Reset Password"
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(userItem.id)}
                            className="h-8 w-8 p-0"
                            title="Delete User"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Assignment Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Role Templates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Use these templates to quickly assign appropriate roles to users based on their responsibilities.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleTemplates.map((template) => (
              <Card key={template.name} className={`${template.color} border-2 hover:shadow-md transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <template.icon className="h-5 w-5" />
                    <h3 className="font-semibold text-sm">{template.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                  <Badge className={getRoleBadgeColor(template.role)}>
                    {template.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">How to Use Templates</h4>
                <p className="text-sm text-blue-800">
                  Select a user from the table above and use the role dropdown to assign the appropriate permission level. 
                  Templates help you choose the right role based on common job responsibilities.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports and Email Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Reports & Email Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate reports and send email notifications for invoice management.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Weekly Report */}
            <Card className="bg-blue-50 border-blue-200 border-2 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Weekly Report</h3>
                </div>
                <p className="text-sm text-blue-800 mb-4">
                  Generate and email a comprehensive weekly invoice report covering the last 7 days.
                </p>
                <Button
                  onClick={() => openReportDialog('weekly')}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Weekly Report
                </Button>
              </CardContent>
            </Card>

            {/* Monthly Report */}
            <Card className="bg-green-50 border-green-200 border-2 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold text-green-900">Monthly Report</h3>
                </div>
                <p className="text-sm text-green-800 mb-4">
                  Generate and email a detailed monthly report with comprehensive analytics.
                </p>
                <Button
                  onClick={() => openReportDialog('monthly')}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Monthly Report
                </Button>
              </CardContent>
            </Card>

            {/* Overdue Email Alerts */}
            <Card className="bg-red-50 border-red-200 border-2 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-6 w-6 text-red-600" />
                  <h3 className="font-semibold text-red-900">Overdue Alerts</h3>
                </div>
                <p className="text-sm text-red-800 mb-4">
                  Send email notifications for all overdue invoices with attachments.
                </p>
                <Button
                  onClick={handleSendOverdueEmails}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {loading ? "Sending..." : "Send Overdue Emails"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Settings className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Automated Scheduling</h4>
                <p className="text-sm text-yellow-800">
                  • Weekly reports are automatically generated every Monday<br />
                  • Monthly reports are automatically sent on the 1st of each month<br />
                  • Overdue email alerts can be manually triggered or automated
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Format Selection Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="bg-card text-card-foreground" aria-describedby="report-format-description">
          <DialogHeader>
            <DialogTitle>Select Report Format</DialogTitle>
            <p id="report-format-description" className="text-sm text-muted-foreground">
              Choose between Excel (CSV) or PDF format for your report
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Choose the format for your {reportType} report:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleGenerateReport('excel')}
                disabled={loading}
                className="h-20 flex flex-col gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <FileText className="h-6 w-6" />
                Excel (CSV)
              </Button>
              <Button
                onClick={() => handleGenerateReport('pdf')}
                disabled={loading}
                className="h-20 flex flex-col gap-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <FileText className="h-6 w-6" />
                PDF (HTML)
              </Button>
            </div>
            {loading && (
              <p className="text-center text-muted-foreground">
                Generating {reportType} report...
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}