import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface CustomerStatementPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: () => void;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    areaCode?: string;
  };
  sales: Array<{
    saleNumber: string;
    saleDate: string;
    totalAmount: number;
    paidAmount: number;
    remainingBalance: number;
    status: string;
    paymentType: string;
  }>;
  summary: {
    totalSales: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  };
}

export function CustomerStatementPreviewDialog({
  open,
  onClose,
  onGenerate,
  customer,
  sales,
  summary,
}: CustomerStatementPreviewDialogProps) {
  const { companyId } = useParams<{ companyId: string }>();
  const { format } = useCompanyCurrency(companyId);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Customer Statement Preview - {customer.name}
          </DialogTitle>
          <DialogDescription>
            Review the customer statement before generating the PDF
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Document Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">CUSTOMER STATEMENT</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Statement Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-semibold">{customer.name}</p>
                {customer.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
                {customer.phone && <p className="text-sm text-muted-foreground">Phone: {customer.phone}</p>}
                {customer.email && <p className="text-sm text-muted-foreground">Email: {customer.email}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Account Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-lg font-bold">{summary.totalSales}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">${summary.totalAmount.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">{format(summary.totalPaid)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                  <p className={`text-lg font-bold ${summary.totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {format(summary.totalRemaining)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 text-sm font-medium">Sale #</th>
                      <th className="text-left p-3 text-sm font-medium">Date</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Payment</th>
                      <th className="text-right p-3 text-sm font-medium">Total</th>
                      <th className="text-right p-3 text-sm font-medium">Paid</th>
                      <th className="text-right p-3 text-sm font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-muted-foreground">
                          No sales found
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale, index) => (
                        <tr key={index} className={`border-b ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                          <td className="p-3 text-sm font-mono">{sale.saleNumber}</td>
                          <td className="p-3 text-sm">{new Date(sale.saleDate).toLocaleDateString()}</td>
                          <td className="p-3 text-sm">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                              sale.status === 'returned' ? 'bg-red-100 text-red-800' :
                              sale.status === 'partial_return' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {sale.status.charAt(0).toUpperCase() + sale.status.slice(1).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-sm capitalize">{sale.paymentType}</td>
                          <td className="p-3 text-sm text-right font-semibold">{format(sale.totalAmount)}</td>
                          <td className="p-3 text-sm text-right text-green-600">{format(sale.paidAmount)}</td>
                          <td className="p-3 text-sm text-right font-semibold text-orange-600">
                            {format(sale.remainingBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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

