import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, DollarSign, CreditCard, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoice_number: string;
  supplier: string;
  amount: number;
  received_date: string;
  status: string;
  description: string;
  payment_date?: string;
  finance_notes?: string;
}

interface FinanceInterfaceProps {
  invoice: Invoice;
  onUpdate: (invoiceId: string, updates: Partial<Invoice>) => void;
  onClose: () => void;
}

export function FinanceInterface({ invoice, onUpdate, onClose }: FinanceInterfaceProps) {
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(
    invoice.payment_date ? new Date(invoice.payment_date) : undefined
  );
  const [financeNotes, setFinanceNotes] = useState(invoice.finance_notes || '');
  const [loading, setLoading] = useState(false);

  const handleMarkAsPaid = async () => {
    if (!paymentDate) {
      alert('Please select a payment date');
      return;
    }

    setLoading(true);
    try {
      await onUpdate(invoice.id, {
        status: 'paid',
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        finance_notes: financeNotes
      });
      onClose();
    } catch (error) {
      console.error('Error updating payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotes = async () => {
    setLoading(true);
    try {
      await onUpdate(invoice.id, {
        finance_notes: financeNotes
      });
    } catch (error) {
      console.error('Error updating notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPaid = invoice.status === 'paid';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <DollarSign className="h-5 w-5" />
          Finance Team Interface
        </CardTitle>
        <div className="text-sm text-green-600">
          Invoice #{invoice.invoice_number} - {invoice.supplier}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 p-6">
        {/* Invoice Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-sm font-medium text-gray-600">Amount</Label>
            <div className="text-2xl font-bold text-green-600">
              ${invoice.amount.toLocaleString()}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Current Status</Label>
            <Badge className={isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {isPaid ? 'PAID' : 'PENDING PAYMENT'}
            </Badge>
          </div>
        </div>

        {/* Payment Section */}
        {!isPaid && (
          <div className="space-y-4 p-4 border border-green-200 rounded-lg bg-green-50">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Mark as Paid
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="payment-date">Payment Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !paymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, "PPP") : "Select payment date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={setPaymentDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                onClick={handleMarkAsPaid}
                disabled={loading || !paymentDate}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : 'Confirm Payment Processed'}
              </Button>
            </div>
          </div>
        )}

        {/* Payment Info (if paid) */}
        {isPaid && invoice.payment_date && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Payment Information</h3>
            <div className="text-sm">
              <span className="font-medium">Paid on:</span> {format(new Date(invoice.payment_date), "PPP")}
            </div>
          </div>
        )}

        {/* Finance Notes */}
        <div className="space-y-3">
          <Label htmlFor="finance-notes" className="text-sm font-medium">
            Finance Team Notes
          </Label>
          <Textarea
            id="finance-notes"
            value={financeNotes}
            onChange={(e) => setFinanceNotes(e.target.value)}
            placeholder="Add notes about payment processing, accounting codes, or other finance-related information..."
            className="min-h-[100px]"
          />
          <Button 
            onClick={handleUpdateNotes}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Saving...' : 'Save Notes'}
          </Button>
        </div>

        {/* Invoice Details */}
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800">Invoice Details</h3>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">Supplier:</span> {invoice.supplier}</div>
            <div><span className="font-medium">Description:</span> {invoice.description}</div>
            <div><span className="font-medium">Received:</span> {format(new Date(invoice.received_date), "PPP")}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}