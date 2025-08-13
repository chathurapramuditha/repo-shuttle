import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, FileText, Users, Clock, CheckCircle, XCircle, AlertCircle, Upload, Eye, Edit, Trash2, User, Building, Filter, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdminPanel } from '@/components/AdminPanel';
import { FinanceInterface } from '@/components/FinanceInterface';
import { SupplyChainInterface } from '@/components/SupplyChainInterface';
import { SettingsDialog } from '@/components/SettingsDialog';

// Complete department list matching the Auth component
const ALL_DEPARTMENTS = [
  // Core departments
  { value: 'IT', label: 'IT' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Supply Chain', label: 'Supply Chain' },
  { value: 'Procurement', label: 'Procurement' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Management', label: 'Management' },
  { value: 'HR', label: 'HR' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },

  // Hospital-specific departments
  { value: 'OPD', label: 'OPD' },
  { value: 'FINANCE', label: 'FINANCE' },
  { value: 'PR', label: 'PR' },
  { value: 'ETU', label: 'ETU' },
  { value: 'PHARMACY', label: 'PHARMACY' },
  { value: 'PHLEBOTOMY', label: 'PHLEBOTOMY' },
  { value: 'Kitchen', label: 'Kitchen' },
  { value: 'Ultra Sound', label: 'Ultra Sound' },
  { value: 'Araliya Ward', label: 'Araliya Ward' },
  { value: 'Radiology', label: 'Radiology' },
  { value: 'Call Center', label: 'Call Center' },
  { value: 'Health Check', label: 'Health Check' },
  { value: 'Medical Services', label: 'Medical Services' },
  { value: 'Assistant Manager Operations', label: 'Assistant Manager Operations' },
  { value: 'Nelum Ward', label: 'Nelum Ward' },
  { value: 'Physiotheraphy', label: 'Physiotheraphy' },
  { value: 'Billing', label: 'Billing' },
  { value: 'Lab', label: 'Lab' },
  { value: 'Drug Store', label: 'Drug Store' },
  { value: 'ENG', label: 'ENG' },
  { value: 'Stores', label: 'Stores' },
  { value: 'ADMINISTRATION', label: 'ADMINISTRATION' },
  { value: 'DTU', label: 'DTU' },
  { value: 'MICU', label: 'MICU' },
  { value: 'ICU', label: 'ICU' },
  { value: 'Orchid', label: 'Orchid' },
  { value: 'Theater', label: 'Theater' },
  { value: 'Home Care', label: 'Home Care' },
  { value: 'Facility', label: 'Facility' },
  { value: 'Quality', label: 'Quality' },
  { value: 'Adora', label: 'Adora' },
  { value: 'EHR', label: 'EHR' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Kitchen Store', label: 'Kitchen Store' },
];

interface Invoice {
  id: string;
  invoice_number: string;
  supplier: string;
  amount: number;
  description: string;
  received_date: string;
  payment_date?: string;
  status: string;
  department?: string;
  assigned_to_person?: string;
  file_url?: string;
  finance_notes?: string;
  supply_chain_notes?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  designation?: string;
}

interface UserRole {
  role: 'super_admin' | 'admin' | 'lite_admin' | 'editor' | 'uploader' | 'viewer';
}

export function InvoiceTracker() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // State for forms
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    invoice_number: '',
    supplier: '',
    amount: '',
    description: '',
    received_date: '',
    department: '',
    assigned_to_person: ''
  });

  // Fetch user profile and role
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id
  });

  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as UserRole | null;
    },
    enabled: !!user?.id
  });

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, departmentFilter, searchTerm, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (departmentFilter !== 'all') {
        query = query.eq('department', departmentFilter);
      }

      if (searchTerm) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%,supplier.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (dateFilter) {
        query = query.gte('received_date', dateFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    }
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = invoices.length;
    const pending = invoices.filter(inv => inv.status === 'pending').length;
    const approved = invoices.filter(inv => inv.status === 'approved').length;
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

    return { total, pending, approved, paid, totalAmount };
  }, [invoices]);

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .insert({
          ...newInvoice,
          amount: parseFloat(newInvoice.amount),
          status: 'pending',
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Invoice Added",
        description: "Invoice has been successfully added.",
      });

      setNewInvoice({
        invoice_number: '',
        supplier: '',
        amount: '',
        description: '',
        received_date: '',
        department: '',
        assigned_to_person: ''
      });
      setIsAddingInvoice(false);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Invoice Updated",
        description: "Invoice has been successfully updated.",
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Invoice Deleted",
        description: "Invoice has been successfully deleted.",
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'paid':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isSuperAdmin = userRole?.role === 'super_admin';
  const canEdit = userRole?.role && ['super_admin', 'admin', 'lite_admin', 'editor'].includes(userRole.role);
  const canDelete = userRole?.role && ['super_admin', 'admin'].includes(userRole.role);
  const canUpload = userRole?.role && ['super_admin', 'admin', 'lite_admin', 'editor', 'uploader'].includes(userRole.role);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Invoice Tracker</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {profile?.first_name} {profile?.last_name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {userRole?.role && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {userRole.role}
                    </Badge>
                  )}
                  {profile?.department && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {profile.department}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SettingsDialog />
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
              <TabsTrigger value="supply-chain">Supply Chain</TabsTrigger>
              {isSuperAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
            </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="department-filter">Department</Label>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 overflow-y-auto">
                        <SelectItem value="all">All Departments</SelectItem>
                        {ALL_DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="date-filter">From Date</Label>
                    <Input
                      id="date-filter"
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Paid</CardTitle>
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.totalAmount.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Add Invoice Button */}
            {canUpload && (
              <div className="flex justify-end">
                <Dialog open={isAddingInvoice} onOpenChange={setIsAddingInvoice}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Add Invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Invoice</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddInvoice} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="invoice_number">Invoice Number</Label>
                          <Input
                            id="invoice_number"
                            value={newInvoice.invoice_number}
                            onChange={(e) => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="supplier">Supplier</Label>
                          <Input
                            id="supplier"
                            value={newInvoice.supplier}
                            onChange={(e) => setNewInvoice({ ...newInvoice, supplier: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={newInvoice.amount}
                            onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="received_date">Received Date</Label>
                          <Input
                            id="received_date"
                            type="date"
                            value={newInvoice.received_date}
                            onChange={(e) => setNewInvoice({ ...newInvoice, received_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="department">Department</Label>
                          <Select
                            value={newInvoice.department}
                            onValueChange={(value) => setNewInvoice({ ...newInvoice, department: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent className="max-h-48 overflow-y-auto">
                              {ALL_DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept.value} value={dept.value}>
                                  {dept.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="assigned_to_person">Assigned To</Label>
                          <Input
                            id="assigned_to_person"
                            value={newInvoice.assigned_to_person}
                            onChange={(e) => setNewInvoice({ ...newInvoice, assigned_to_person: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newInvoice.description}
                          onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsAddingInvoice(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Invoice</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Invoices Table */}
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading invoices...</div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No invoices found matching your criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Invoice #</th>
                          <th className="text-left p-2">Supplier</th>
                          <th className="text-left p-2">Amount</th>
                          <th className="text-left p-2">Department</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Received Date</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{invoice.invoice_number}</td>
                            <td className="p-2">{invoice.supplier}</td>
                            <td className="p-2">${invoice.amount.toLocaleString()}</td>
                            <td className="p-2">
                              {invoice.department && (
                                <Badge variant="outline" className="text-xs">
                                  {invoice.department}
                                </Badge>
                              )}
                            </td>
                            <td className="p-2">
                              <Badge className={`${getStatusColor(invoice.status)} flex items-center gap-1 w-fit`}>
                                {getStatusIcon(invoice.status)}
                                {invoice.status}
                              </Badge>
                            </td>
                            <td className="p-2">{new Date(invoice.received_date).toLocaleDateString()}</td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {canEdit && (
                                  <Button size="sm" variant="ghost">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance">
            {invoices.length > 0 ? (
              <FinanceInterface
                invoice={invoices[0]}
                onUpdate={(id, updates) => handleUpdateInvoice(id, updates as any)}
                onClose={() => {}}
              />
            ) : (
              <Card>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No invoices available.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="supply-chain">
            {invoices.length > 0 ? (
              <SupplyChainInterface
                invoice={invoices[0]}
                onUpdate={(id, updates) => handleUpdateInvoice(id, updates as any)}
                onClose={() => {}}
              />
            ) : (
              <Card>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No invoices available.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="admin">
              <AdminPanel />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
