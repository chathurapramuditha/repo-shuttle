import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Truck, User, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoice_number: string;
  supplier: string;
  amount: number;
  received_date: string;
  status: string;
  description: string;
  assigned_to_person?: string;
  supply_chain_notes?: string;
}

interface SupplyChainInterfaceProps {
  invoice: Invoice;
  onUpdate: (invoiceId: string, updates: Partial<Invoice>) => void;
  onClose: () => void;
}


export function SupplyChainInterface({ invoice, onUpdate, onClose }: SupplyChainInterfaceProps) {
  const [assignedPerson, setAssignedPerson] = useState(invoice.assigned_to_person || '');
  const [supplyChainNotes, setSupplyChainNotes] = useState(invoice.supply_chain_notes || '');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAssignToSupplyChain = async () => {
    if (!assignedPerson) {
      alert('Please enter a name to assign this invoice');
      return;
    }

    setLoading(true);
    try {
      await onUpdate(invoice.id, {
        status: 'assigned_to_supply_chain',
        assigned_to_person: assignedPerson,
        supply_chain_notes: supplyChainNotes
      });
      onClose();
    } catch (error) {
      console.error('Error assigning invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotes = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ supply_chain_notes: supplyChainNotes })
        .eq('id', invoice.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notes updated successfully",
      });

      onUpdate(invoice.id, { supply_chain_notes: supplyChainNotes });
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendToFinance = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent_to_finance',
          supply_chain_notes: supplyChainNotes
        })
        .eq('id', invoice.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice sent to finance department successfully",
      });

      onUpdate(invoice.id, { 
        status: 'sent_to_finance', 
        supply_chain_notes: supplyChainNotes 
      });
      onClose();
    } catch (error) {
      console.error('Error sending to finance:', error);
      toast({
        title: "Error",
        description: "Failed to send invoice to finance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isAssigned = invoice.status === 'assigned_to_supply_chain';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Truck className="h-5 w-5" />
          Supply Chain Interface
        </CardTitle>
        <div className="text-sm text-blue-600">
          Invoice #{invoice.invoice_number} - {invoice.supplier}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 p-6">
        {/* Invoice Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label className="text-sm font-medium text-gray-600">Amount</Label>
            <div className="text-2xl font-bold text-blue-600">
              ${invoice.amount.toLocaleString()}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Assignment Status</Label>
            <Badge className={isAssigned ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
              {isAssigned ? 'ASSIGNED' : 'UNASSIGNED'}
            </Badge>
          </div>
        </div>

        {/* Assignment Section */}
        <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="font-semibold text-blue-800 flex items-center gap-2">
            <User className="h-4 w-4" />
            Team Assignment
          </h3>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="assigned-person">Assign to Team Member</Label>
              <Input
                id="assigned-person"
                placeholder="Type a name"
                value={assignedPerson}
                onChange={(e) => setAssignedPerson(e.target.value)}
              />
            </div>

            {!isAssigned && (
              <Button 
                onClick={handleAssignToSupplyChain}
                disabled={loading || !assignedPerson}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Assigning...' : 'Assign to Supply Chain'}
              </Button>
            )}
          </div>
        </div>

        {/* Current Assignment (if assigned) */}
        {isAssigned && invoice.assigned_to_person && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Current Assignment</h3>
            <div className="text-sm">
              <span className="font-medium">Assigned to:</span> {invoice.assigned_to_person}
            </div>
          </div>
        )}

        {/* Supply Chain Notes */}
        <div className="space-y-3">
          <Label htmlFor="supply-chain-notes" className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Supply Chain Notes
          </Label>
          <Textarea
            id="supply-chain-notes"
            value={supplyChainNotes}
            onChange={(e) => setSupplyChainNotes(e.target.value)}
            placeholder="Add notes about delivery schedules, vendor coordination, logistics planning, or other supply chain information..."
            className="min-h-[100px]"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleUpdateNotes}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? 'Saving...' : 'Save Notes'}
            </Button>
            {(invoice.status === 'assigned_to_supply_chain' || invoice.status === 'pending') && (
              <Button
                onClick={handleSendToFinance}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : "Send to Finance"}
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800">Invoice Details</h3>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">Supplier:</span> {invoice.supplier}</div>
            <div><span className="font-medium">Description:</span> {invoice.description}</div>
            <div><span className="font-medium">Received:</span> {new Date(invoice.received_date).toLocaleDateString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}