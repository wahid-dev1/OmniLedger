import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, X } from "lucide-react";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";
import { useParams } from "react-router-dom";

interface InvoicePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: () => void;
  type: 'sale' | 'purchase';
  documentNumber: string;
  date: string;
  customerOrVendor: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: Array<{
    sku: string;
    name: string;
    batchNumber?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paidAmount?: number;
  remainingBalance?: number;
  paymentType: string;
  notes?: string;
}

export function InvoicePreviewDialog({
  open,
  onClose,
  onGenerate,
  type,
  documentNumber,
  date,
  customerOrVendor,
  items,
  subtotal,
  tax,
  total,
  paidAmount,
  remainingBalance,
  paymentType,
  notes,
}: InvoicePreviewDialogProps) {
  const { companyId } = useParams<{ companyId: string }>();
  const { format } = useCompanyCurrency(companyId);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            {type === 'sale' ? 'Invoice' : 'Purchase Order'} Preview - {documentNumber}
          </DialogTitle>
          <DialogDescription>
            Review the document before generating the PDF
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Document Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">{type === 'sale' ? 'INVOICE' : 'PURCHASE ORDER'}</h2>
            <div className="flex justify-between mt-4 text-sm">
              <div className="text-left">
                <p className="font-semibold">Document #:</p>
                <p>{documentNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Date:</p>
                <p>{new Date(date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Customer/Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{type === 'sale' ? 'Bill To:' : 'From:'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-semibold">{customerOrVendor.name}</p>
                {customerOrVendor.address && <p className="text-sm text-muted-foreground">{customerOrVendor.address}</p>}
                {customerOrVendor.phone && <p className="text-sm text-muted-foreground">Phone: {customerOrVendor.phone}</p>}
                {customerOrVendor.email && <p className="text-sm text-muted-foreground">Email: {customerOrVendor.email}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 text-sm font-medium">SKU</th>
                      <th className="text-left p-3 text-sm font-medium">Product Name</th>
                      <th className="text-left p-3 text-sm font-medium">Batch #</th>
                      <th className="text-center p-3 text-sm font-medium">Qty</th>
                      <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                      <th className="text-right p-3 text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                        <td className="p-3 text-sm">{item.sku}</td>
                        <td className="p-3 text-sm">{item.name}</td>
                        <td className="p-3 text-sm">{item.batchNumber || '-'}</td>
                        <td className="p-3 text-sm text-center">{item.quantity}</td>
                        <td className="p-3 text-sm text-right">${item.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-sm text-right font-semibold">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal:</span>
                  <span className="text-sm font-semibold">{format(subtotal)}</span>
                </div>
                {tax && tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">Tax:</span>
                    <span className="text-sm font-semibold">{format(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-lg">{format(total)}</span>
                </div>
                {paidAmount !== undefined && paidAmount > 0 && (
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-green-600">Paid:</span>
                    <span className="text-sm font-semibold text-green-600">{format(paidAmount)}</span>
                  </div>
                )}
                {remainingBalance !== undefined && remainingBalance > 0 && (
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-orange-600">Balance Due:</span>
                    <span className="text-sm font-semibold text-orange-600">${remainingBalance.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm">Payment Type:</span>
                  <span className="text-sm font-semibold capitalize">{paymentType}</span>
                </div>
                {notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold mb-1">Notes:</p>
                    <p className="text-sm text-muted-foreground italic">{notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onGenerate}>
            <Printer className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

