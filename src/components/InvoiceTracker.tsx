import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CalendarIcon, Clock, AlertTriangle, CheckCircle2, Plus, Eye, Search, LogOut, User, Upload, FileText, Settings, FileBarChart, Trash2, Send } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useMultiTabAuth } from "@/hooks/useMultiTabAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminPanel } from "@/components/AdminPanel";
import { FinanceInterface } from "@/components/FinanceInterface";
import { SupplyChainInterface } from "@/components/SupplyChainInterface";

interface Invoice {
  id: string;
  invoice_number: string;
  supplier: string;
  amount: number;
  received_date: string;
  status: string;
  description: string;
  user_id: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
  assigned_to_person?: string;
  supply_chain_notes?: string;
  payment_date?: string;
  finance_notes?: string;
  user_department?: string;
  user_name?: string;
}

const calculateDaysElapsed = (receivedDate: string) => {
  const received = new Date(receivedDate);
  const now = new Date();
  return Math.floor((now.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatusColor = (status: string, daysElapsed: number) => {
  if (status === 'paid') return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'assigned_to_supply_chain') return 'bg-purple-100 text-purple-800 border-purple-200';
  if (status === 'sent_to_finance') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  if (daysElapsed >= 20) return 'bg-red-100 text-red-800 border-red-200';
  if (daysElapsed >= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-blue-100 text-blue-800 border-blue-200';
};

const getStatusText = (status: string, daysElapsed: number) => {
  if (status === 'paid') return 'Paid';
  if (status === 'sent_to_finance') return 'Sent to Finance';
  if (status === 'assigned_to_supply_chain') return 'Assigned to Supply Chain';
  if (daysElapsed >= 20) return 'Overdue';
  if (daysElapsed >= 10) return 'Alert';
  return status.replace('_', ' ').toUpperCase();
};

export function InvoiceTracker() {
  // Try to use MultiTabAuth first, fallback to regular Auth
  let authHook;
  try {
    authHook = useMultiTabAuth();
  } catch {
    authHook = useAuth();
  }
  
  const { user, signOut } = authHook;
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("invoices");
  const [financeNotes, setFinanceNotes] = useState('');
  const [assignedPerson, setAssignedPerson] = useState('');
  const [supplyChainNotes, setSupplyChainNotes] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState('excel');

  const [newInvoice, setNewInvoice] = useState({
    invoice_number: '',
    supplier: '',
    amount: '',
    description: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchInvoices();
    fetchUserRole();
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setUserRole(data?.role || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchInvoices = async () => {
    if (!user) return;
    
    try {
      // Fetch invoices with user profile data to get department information
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          profiles!user_id (
            first_name,
            last_name,
            email,
            department
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Now we have department information from the profiles table
      const enrichedInvoices = (data || []).map((invoice: any) => ({
        ...invoice,
        user_name: invoice.profiles ? `${invoice.profiles.first_name} ${invoice.profiles.last_name}` : 'Unknown User',
        user_department: invoice.profiles?.department || 'Not Specified'
      }));
      
      setInvoices(enrichedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    }
  };

  const handleAddInvoice = async () => {
    if (!user) return;
    
    // Check if user has upload permission
    if (!hasPermission('uploader')) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to upload invoices",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get user's department from their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('department')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          invoice_number: newInvoice.invoice_number,
          supplier: newInvoice.supplier,
          amount: parseFloat(newInvoice.amount),
          description: newInvoice.description,
          received_date: new Date().toISOString().split('T')[0],
          status: newInvoice.status,
          department: profileData?.department || 'Not Specified'
        })
        .select()
        .single();

      if (error) throw error;

      setInvoices([data, ...invoices]);
      setNewInvoice({ invoice_number: '', supplier: '', amount: '', description: '', status: 'pending' });
      setIsDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Invoice added successfully",
      });
    } catch (error) {
      console.error('Error adding invoice:', error);
      toast({
        title: "Error",
        description: "Failed to add invoice",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type - support images only for now since OpenAI Vision API works with images
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload an image file (JPG, PNG, WebP, or GIF). PDF processing will be available soon.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !user) return;

    // Check if user has upload permission
    if (!hasPermission('uploader')) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to upload invoices",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        try {
          const { data, error } = await supabase.functions.invoke('process-invoice', {
            body: { 
              image: base64,
              userId: user.id 
            }
          });

          if (error) throw error;

          await fetchInvoices(); // Refresh the list
          setIsUploadDialogOpen(false);
          setSelectedFile(null);
          
          toast({
            title: "Success",
            description: "Invoice processed and added successfully!",
          });
        } catch (error) {
          console.error('Error processing invoice:', error);
          toast({
            title: "Error",
            description: "Failed to process invoice. Please try again.",
            variant: "destructive",
          });
        }
      };
      
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const hasPermission = (requiredLevel: string) => {
    if (!userRole) return false;
    
    const roleHierarchy = {
      'viewer': 0,
      'uploader': 1,
      'editor': 2,
      'lite_admin': 3,
      'admin': 4,
      'super_admin': 5
    };
    
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevelNum = roleHierarchy[requiredLevel as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevelNum;
  };

  const isFinanceTeam = () => {
    return userRole === 'admin' || userRole === 'super_admin';
  };

  const isSupplyChain = () => {
    return userRole === 'lite_admin' || userRole === 'editor';
  };

  const handleMarkAsPaid = async (invoiceId: string, financeNotes: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          finance_notes: financeNotes
        })
        .eq('id', invoiceId);

      if (error) throw error;

      await fetchInvoices();
      setSelectedInvoice(null);
      
      toast({
        title: "Success",
        description: "Invoice marked as paid successfully",
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    }
  };

  const handleAssignToSupplyChain = async (invoiceId: string, assignedPerson: string, supplyChainNotes: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'assigned_to_supply_chain',
          assigned_to_person: assignedPerson,
          supply_chain_notes: supplyChainNotes
        })
        .eq('id', invoiceId);

      if (error) throw error;

      await fetchInvoices();
      setSelectedInvoice(null);
      
      toast({
        title: "Success",
        description: "Invoice assigned to supply chain successfully",
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    }
  };

  const handleSendToFinance = async (invoiceId: string, supplyChainNotes: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent_to_finance',
          supply_chain_notes: supplyChainNotes
        })
        .eq('id', invoiceId);

      if (error) throw error;

      await fetchInvoices();
      setSelectedInvoice(null);
      
      toast({
        title: "Success",
        description: "Invoice sent to finance department successfully",
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      await fetchInvoices();
      setSelectedInvoice(null);
      
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async () => {
    try {
      if (reportFormat === 'excel') {
        // Generate Excel/CSV report
        const csvContent = generateCSVContent(filteredInvoices);
        downloadFile(csvContent, 'invoice-report.csv', 'text/csv');
      } else if (reportFormat === 'pdf') {
        // Generate PDF report
        const htmlContent = generateHTMLContent(filteredInvoices);
        downloadFile(htmlContent, 'invoice-report.html', 'text/html');
      }
      
      setIsReportDialogOpen(false);
      toast({
        title: "Success",
        description: `${reportFormat.toUpperCase()} report downloaded successfully`,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    }
  };

  const generateCSVContent = (invoices: Invoice[]) => {
    const headers = ['Invoice Number', 'Supplier', 'Amount', 'Received Date', 'Days Elapsed', 'Status', 'Description', 'Assigned To', 'Payment Date'];
    const csvRows = [headers.join(',')];
    
    invoices.forEach(invoice => {
      const daysElapsed = calculateDaysElapsed(invoice.received_date);
      const row = [
        `"${invoice.invoice_number}"`,
        `"${invoice.supplier}"`,
        invoice.amount,
        invoice.received_date,
        daysElapsed,
        `"${getStatusText(invoice.status, daysElapsed)}"`,
        `"${invoice.description}"`,
        `"${invoice.assigned_to_person || ''}"`,
        invoice.payment_date || ''
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };

  const generateHTMLContent = (invoices: Invoice[]) => {
    const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const overdueInvoices = invoices.filter(inv => calculateDaysElapsed(inv.received_date) >= 20 && inv.status !== 'paid');
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: flex; justify-content: space-around; margin-bottom: 30px; }
        .stat-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f4f4f4; }
        .overdue { background-color: #ffebee; }
        .paid { background-color: #e8f5e8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Invoice Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="stats">
        <div class="stat-card">
            <h3>Total Invoices</h3>
            <p>${invoices.length}</p>
        </div>
        <div class="stat-card">
            <h3>Total Amount</h3>
            <p>Rs. ${totalAmount.toLocaleString()}</p>
        </div>
        <div class="stat-card">
            <h3>Paid Invoices</h3>
            <p>${paidInvoices.length}</p>
        </div>
        <div class="stat-card">
            <h3>Overdue Invoices</h3>
            <p>${overdueInvoices.length}</p>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Invoice #</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Received Date</th>
                <th>Days Elapsed</th>
                <th>Status</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            ${invoices.map(invoice => {
              const daysElapsed = calculateDaysElapsed(invoice.received_date);
              const isOverdue = daysElapsed >= 20 && invoice.status !== 'paid';
              const isPaid = invoice.status === 'paid';
              const rowClass = isOverdue ? 'overdue' : isPaid ? 'paid' : '';
              
              return `
                <tr class="${rowClass}">
                    <td>${invoice.invoice_number}</td>
                    <td>${invoice.supplier}</td>
                    <td>Rs. ${Number(invoice.amount).toLocaleString()}</td>
                    <td>${format(new Date(invoice.received_date), 'MMM dd, yyyy')}</td>
                    <td>${daysElapsed} days</td>
                    <td>${getStatusText(invoice.status, daysElapsed)}</td>
                    <td>${invoice.description}</td>
                </tr>
              `;
            }).join('')}
        </tbody>
    </table>
</body>
</html>
    `;
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const filteredInvoices = invoices.filter(invoice => 
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const overdueCount = invoices.filter(inv => calculateDaysElapsed(inv.received_date) >= 20 && inv.status !== 'paid').length;
  const alertCount = invoices.filter(inv => {
    const days = calculateDaysElapsed(inv.received_date);
    return days >= 10 && days < 20 && inv.status !== 'paid';
  }).length;

  const isAdmin = hasPermission('admin');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Tracker</h1>
          <p className="text-muted-foreground">Track supplier invoices from receipt to payment</p>
          {userRole && (
            <Badge className="mt-1 bg-primary text-primary-foreground">
              {userRole.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-foreground">
            <User className="h-4 w-4" />
            <span className="font-medium">
              {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <SettingsDialog />
            <Button
              variant="outline"
              onClick={signOut}
              className="border-border text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card text-card-foreground">
                <DialogHeader>
                  <DialogTitle>Generate Report</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reportFormat" className="text-sm font-medium">Report Format</Label>
                    <Select value={reportFormat} onValueChange={setReportFormat}>
                      <SelectTrigger className="bg-background text-foreground border-border">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleGenerateReport} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Generate
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {hasPermission('uploader') && (
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Invoice
                  </Button>
                </DialogTrigger>
              <DialogContent className="bg-card text-card-foreground">
                <DialogHeader>
                  <DialogTitle>Upload Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Upload Invoice Image</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload an invoice image (JPG, PNG, WebP, or GIF). Our AI will automatically extract the details.
                    </p>
                    <Input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="bg-background text-foreground border-border"
                    />
                    {selectedFile && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-foreground">
                          <strong>Selected:</strong> {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                    {uploading && (
                      <p className="text-primary mt-2">Processing invoice...</p>
                    )}
                  </div>
                  
                  {selectedFile && !uploading && (
                    <Button 
                      onClick={handleFileUpload} 
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Process Invoice
                    </Button>
                  )}
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Supported formats:</strong> JPG, PNG, WebP, GIF</p>
                    <p><strong>Max file size:</strong> 10MB</p>
                    <p><strong>Note:</strong> PDF processing will be available soon. Please use image formats for now.</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            )}
            
            {hasPermission('uploader') && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manually
                  </Button>
                </DialogTrigger>
            <DialogContent className="bg-card text-card-foreground">
              <DialogHeader>
                <DialogTitle>Add New Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={newInvoice.invoice_number}
                    onChange={(e) => setNewInvoice({...newInvoice, invoice_number: e.target.value})}
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierName">Supplier Name</Label>
                  <Input
                    id="supplierName"
                    value={newInvoice.supplier}
                    onChange={(e) => setNewInvoice({...newInvoice, supplier: e.target.value})}
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newInvoice.amount}
                    onChange={(e) => setNewInvoice({...newInvoice, amount: e.target.value})}
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newInvoice.description}
                    onChange={(e) => setNewInvoice({...newInvoice, description: e.target.value})}
                    className="bg-background text-foreground border-border"
                  />
                </div>
                <Button onClick={handleAddInvoice} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Add Invoice
                </Button>
              </div>
              </DialogContent>
            </Dialog>
            )}
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">User Management</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="invoices" className="space-y-6">
          {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card text-card-foreground border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{invoices.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alerts (10+ days)</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alertCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue (20+ days)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="bg-card text-card-foreground border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search invoices by number, supplier, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background text-foreground border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card className="bg-card text-card-foreground border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Invoice List ({filteredInvoices.length} of {invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">Invoice #</TableHead>
                <TableHead className="text-muted-foreground">Supplier</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Department</TableHead>
                <TableHead className="text-muted-foreground">Received Date</TableHead>
                <TableHead className="text-muted-foreground">Days Elapsed</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const daysElapsed = calculateDaysElapsed(invoice.received_date);
                return (
                  <TableRow key={invoice.id} className="hover:bg-muted/50">
                    <TableCell className="text-foreground font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell className="text-foreground">{invoice.supplier}</TableCell>
                    <TableCell className="text-foreground">Rs. {Number(invoice.amount).toLocaleString()}</TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="outline" className="text-xs">
                        {invoice.user_department || 'Not Specified'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{format(new Date(invoice.received_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-foreground">{daysElapsed} days</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status, daysElapsed)}>
                        {getStatusText(invoice.status, daysElapsed)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="border-border text-foreground hover:bg-muted"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {hasPermission('editor') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="bg-red-500 text-white hover:bg-red-600 border-red-500"
                            title="Delete Invoice"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => {
        setSelectedInvoice(null);
        setFinanceNotes('');
        setAssignedPerson('');
        setSupplyChainNotes('');
      }}>
        <DialogContent className="bg-card text-card-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              {/* Show Finance Interface for Finance Team */}
              {isFinanceTeam() && (
                <FinanceInterface
                  invoice={selectedInvoice}
                  onUpdate={async (invoiceId, updates) => {
                    const { error } = await supabase
                      .from('invoices')
                      .update(updates)
                      .eq('id', invoiceId);

                    if (error) throw error;
                    await fetchInvoices();
                    
                    toast({
                      title: "Success",
                      description: "Invoice updated successfully",
                    });
                  }}
                  onClose={() => setSelectedInvoice(null)}
                />
              )}

              {/* Show Supply Chain Interface for Supply Chain Team */}
              {isSupplyChain() && !isFinanceTeam() && (
                <SupplyChainInterface
                  invoice={selectedInvoice}
                  onUpdate={async (invoiceId, updates) => {
                    const { error } = await supabase
                      .from('invoices')
                      .update(updates)
                      .eq('id', invoiceId);

                    if (error) throw error;
                    await fetchInvoices();
                    
                    toast({
                      title: "Success",
                      description: "Invoice updated successfully",
                    });
                  }}
                  onClose={() => setSelectedInvoice(null)}
                />
              )}

              {/* Show Basic View for Other Users */}
              {!isFinanceTeam() && !isSupplyChain() && (
                <div>
                  <DialogHeader>
                    <DialogTitle>Invoice Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Invoice Number</Label>
                        <p className="text-foreground font-medium">{selectedInvoice.invoice_number}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Supplier</Label>
                        <p className="text-foreground font-medium">{selectedInvoice.supplier}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Amount</Label>
                        <p className="text-foreground font-medium">Rs. {Number(selectedInvoice.amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Days Elapsed</Label>
                        <p className="text-foreground font-medium">{calculateDaysElapsed(selectedInvoice.received_date)} days</p>
                      </div>
                      {selectedInvoice.assigned_to_person && (
                        <div>
                          <Label className="text-muted-foreground">Assigned To</Label>
                          <p className="text-foreground font-medium">{selectedInvoice.assigned_to_person}</p>
                        </div>
                      )}
                      {selectedInvoice.payment_date && (
                        <div>
                          <Label className="text-muted-foreground">Payment Date</Label>
                          <p className="text-foreground font-medium">{format(new Date(selectedInvoice.payment_date), "MMM dd, yyyy")}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="text-foreground">{selectedInvoice.description}</p>
                    </div>
                    {selectedInvoice.supply_chain_notes && (
                      <div>
                        <Label className="text-muted-foreground">Supply Chain Notes</Label>
                        <p className="text-foreground">{selectedInvoice.supply_chain_notes}</p>
                      </div>
                    )}
                    {selectedInvoice.finance_notes && (
                      <div>
                        <Label className="text-muted-foreground">Finance Notes</Label>
                        <p className="text-foreground">{selectedInvoice.finance_notes}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge className={getStatusColor(selectedInvoice.status, calculateDaysElapsed(selectedInvoice.received_date))}>
                        {getStatusText(selectedInvoice.status, calculateDaysElapsed(selectedInvoice.received_date))}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="admin">
            <AdminPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}