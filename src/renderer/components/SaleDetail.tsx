import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ShoppingCart, ArrowLeft, Calendar, User, Package, Boxes, Loader2, Receipt, Edit, CreditCard, Wallet, Truck, FileText, ArrowRight, Plus, CheckCircle, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AppLayout } from "./AppLayout";
import { generateInvoicePDF } from "@/lib/invoicePDFGenerator";
import { InvoicePreviewDialog } from "./InvoicePreviewDialog";

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  product: {
    id: string;
    sku: string;
    name: string;
  };
  batch: {
    id: string;
    batchNumber: string;
    expiryDate?: string;
  };
}

interface Transaction {
  id: string;
  transactionNumber: string;
  description: string;
  amount: number | string;
  transactionDate: string;
  debitAccount: {
    code: string;
    name: string;
  };
  creditAccount: {
    code: string;
    name: string;
  };
}

interface SalePayment {
  id: string;
  amount: number | string;
  paymentDate: string;
  paymentType: string;
  notes?: string;
}

interface Sale {
  id: string;
  saleNumber: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  saleDate: string;
  status: string;
  paymentType: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: SaleItem[];
  payments?: SalePayment[];
  transactions?: Transaction[];
}

export function SaleDetail() {
  const { companyId, saleId } = useParams<{ companyId: string; saleId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [sale, setSale] = useState<Sale | null>(null);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusEditMode, setStatusEditMode] = useState(false);
  const [paymentTypeEditMode, setPaymentTypeEditMode] = useState(false);
  const [creatingTransactions, setCreatingTransactions] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentType: "cash",
    notes: "",
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (saleId && companyId) {
      loadSaleDetail();
      loadCompany();
    }
  }, [saleId, companyId]);

  const loadCompany = async () => {
    try {
      const result = await (window as any).electronAPI?.getCompany(companyId!);
      console.log("Company API result:", result);
      if (result?.success && result.data) {
        const companyData = {
          name: result.data.name || '',
          address: result.data.address || undefined,
          phone: result.data.phone || undefined,
          email: result.data.email || undefined,
        };
        console.log("Setting company data:", companyData);
        setCompany(companyData);
      } else {
        console.warn("Company data not loaded:", result);
      }
    } catch (error) {
      console.error("Error loading company:", error);
    }
  };

  const loadSaleDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getSale(saleId!);

      if (result?.success && result.data) {
        setSale(result.data);
      } else {
        setError(result?.error || "Failed to load sale");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading sale detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!sale || newStatus === sale.status) {
      setStatusEditMode(false);
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.updateSaleStatus(sale.id, newStatus);

      if (result?.success) {
        setSale({ ...sale, status: newStatus });
        setStatusEditMode(false);
      } else {
        setError(result?.error || "Failed to update status");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error updating sale status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentTypeUpdate = async (newPaymentType: string) => {
    if (!sale || newPaymentType === sale.paymentType) {
      setPaymentTypeEditMode(false);
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.updateSalePaymentType(sale.id, newPaymentType);

      if (result?.success) {
        setSale({ ...sale, paymentType: newPaymentType });
        setPaymentTypeEditMode(false);
      } else {
        setError(result?.error || "Failed to update payment type");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error updating payment type:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateTransactions = async () => {
    if (!sale) return;

    if (!confirm("Create ledger transactions for this sale? This will create accounting entries for the sale amount.")) {
      return;
    }

    setCreatingTransactions(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.createSaleTransactions(sale.id);

      if (result?.success) {
        // Reload sale to get updated transactions
        await loadSaleDetail();
        alert(result?.message || "Transactions created successfully!");
      } else {
        setError(result?.error || "Failed to create transactions");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error creating transactions:", error);
    } finally {
      setCreatingTransactions(false);
    }
  };

  const handleAddPayment = async () => {
    if (!sale) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }

    if (amount > remainingAmount) {
      setError(`Payment amount cannot exceed remaining balance of ${format(remainingAmount)}`);
      return;
    }

    setAddingPayment(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.addSalePayment(sale.id, {
        amount: amount,
        paymentType: paymentForm.paymentType,
        notes: paymentForm.notes.trim() || undefined,
      });

      if (result?.success) {
        // Reload sale to get updated payment info
        await loadSaleDetail();
        setPaymentDialogOpen(false);
        setPaymentForm({ amount: "", paymentType: "cash", notes: "" });
        alert("Payment added successfully!");
      } else {
        setError(result?.error || "Failed to add payment");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error adding payment:", error);
    } finally {
      setAddingPayment(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading sale details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !sale) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Sale not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(`/company/${companyId}/sales`)}>
                Back to Sales
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const totalAmount = typeof sale.totalAmount === 'number' 
    ? sale.totalAmount 
    : parseFloat(sale.totalAmount.toString());
  const paidAmount = sale.paidAmount !== undefined
    ? (typeof sale.paidAmount === 'number' ? sale.paidAmount : parseFloat(sale.paidAmount.toString()))
    : 0;
  const remainingAmount = totalAmount - paidAmount;

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/company/${companyId}/sales`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Receipt className="h-8 w-8" />
                  {sale.saleNumber}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Sale Details
                </p>
              </div>
            </div>
            {statusEditMode ? (
              <div className="flex items-center gap-2">
                <Select
                  value={sale.status}
                  onValueChange={handleStatusUpdate}
                  disabled={updating}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="partial_return">Partial Return</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusEditMode(false)}
                  disabled={updating}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Preview & Print
                </Button>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  sale.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : sale.status === 'returned'
                    ? 'bg-red-100 text-red-800'
                    : sale.status === 'partial_return'
                    ? 'bg-orange-100 text-orange-800'
                    : sale.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {sale.status === 'partial_return' 
                    ? 'Partial Return' 
                    : sale.status === 'in_progress'
                    ? 'In Progress'
                    : sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusEditMode(true)}
                  disabled={updating}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-sm text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Sale Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sale Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sale Date</p>
                    <p className="font-semibold">
                      {new Date(sale.saleDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sale Number</p>
                    <p className="font-semibold">{sale.saleNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-semibold text-2xl">{format(totalAmount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="font-semibold text-xl text-green-600">{format(paidAmount)}</p>
                  </div>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining Balance</p>
                      <p className="font-semibold text-xl text-orange-600">{format(remainingAmount)}</p>
                    </div>
                  </div>
                )}
                {remainingAmount <= 0 && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <p className="font-semibold text-green-600">Fully Paid</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {paymentTypeEditMode ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={sale.paymentType}
                        onValueChange={handlePaymentTypeUpdate}
                        disabled={updating}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash (By Hand)</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="cod">COD (Cash on Delivery)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPaymentTypeEditMode(false)}
                        disabled={updating}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      {sale.paymentType === 'cash' ? (
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                      ) : sale.paymentType === 'bank' ? (
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Truck className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Type</p>
                          <p className="font-semibold">
                            {sale.paymentType === 'cash' 
                              ? 'Cash (By Hand)' 
                              : sale.paymentType === 'bank'
                              ? 'Bank Transfer'
                              : 'COD (Cash on Delivery)'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPaymentTypeEditMode(true)}
                          disabled={updating}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {sale.customer && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Customer Name</p>
                      <p className="font-semibold">{sale.customer.name}</p>
                    </div>
                  </div>
                  {sale.customer.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold">{sale.customer.email}</p>
                    </div>
                  )}
                  {sale.customer.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{sale.customer.phone}</p>
                    </div>
                  )}
                  {sale.customer.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-semibold">{sale.customer.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sale Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                Sale Items ({sale.items.length})
              </CardTitle>
              <CardDescription>
                Products sold with batch tracking information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sale.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No items in this sale.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sale.items.map((item, index) => {
                    const unitPrice = typeof item.unitPrice === 'number' 
                      ? item.unitPrice 
                      : parseFloat(item.unitPrice.toString());
                    const itemTotal = typeof item.totalPrice === 'number' 
                      ? item.totalPrice 
                      : parseFloat(item.totalPrice.toString());

                    return (
                      <Card key={item.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Item #{index + 1}
                                  </span>
                                </div>
                                <h3 className="text-lg font-semibold">{item.product.name}</h3>
                                <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                                  <p className="font-semibold flex items-center gap-1">
                                    <Package className="h-4 w-4" />
                                    {item.quantity}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Unit Price</p>
                                  <p className="font-semibold flex items-center gap-1">
                                    {format(unitPrice)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Batch Number</p>
                                  <p className="font-semibold flex items-center gap-1">
                                    <Boxes className="h-4 w-4" />
                                    {item.batch.batchNumber}
                                  </p>
                                </div>
                                {item.batch.expiryDate && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Expiry Date</p>
                                    <p className="font-semibold flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {new Date(item.batch.expiryDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="ml-6 text-right">
                              <p className="text-sm text-muted-foreground mb-1">Item Total</p>
                              <p className="text-2xl font-bold text-primary">
                                {format(itemTotal)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                  Payments
                    {sale.payments && sale.payments.length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({sale.payments.length})
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Payment history for this sale
                  </CardDescription>
                </div>
                {remainingAmount > 0 && (
                  <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Payment</DialogTitle>
                        <DialogDescription>
                          Record a payment for this sale. Remaining balance: {format(remainingAmount)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment-amount">Amount *</Label>
                          <Input
                            id="payment-amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remainingAmount}
                            placeholder="0.00"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            disabled={addingPayment}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-type">Payment Type *</Label>
                          <Select
                            value={paymentForm.paymentType}
                            onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentType: value })}
                            disabled={addingPayment}
                          >
                            <SelectTrigger id="payment-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash (By Hand)</SelectItem>
                              <SelectItem value="bank">Bank Transfer</SelectItem>
                              <SelectItem value="cod">COD (Cash on Delivery)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-notes">Notes (Optional)</Label>
                          <Textarea
                            id="payment-notes"
                            placeholder="Payment notes or reference..."
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            disabled={addingPayment}
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPaymentDialogOpen(false);
                            setPaymentForm({ amount: "", paymentType: "cash", notes: "" });
                          }}
                          disabled={addingPayment}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleAddPayment} disabled={addingPayment}>
                          {addingPayment ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Payment
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!sale.payments || sale.payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No payments recorded for this sale.</p>
                  {remainingAmount > 0 && (
                    <p className="text-xs mt-2">
                      Add a payment to track partial payments.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sale.payments.map((payment) => {
                    const paymentAmount = typeof payment.amount === 'number'
                      ? payment.amount
                      : parseFloat(payment.amount.toString());

                    return (
                      <Card key={payment.id} className="border-2">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-lg">
                                  {format(paymentAmount)}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  payment.paymentType === 'cash'
                                    ? 'bg-green-100 text-green-800'
                                    : payment.paymentType === 'bank'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {payment.paymentType === 'cash' ? 'Cash' : payment.paymentType === 'bank' ? 'Bank' : 'COD'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(payment.paymentDate).toLocaleDateString()}
                                </div>
                                {payment.notes && (
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {payment.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Transactions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Ledger Transactions
                    {sale.transactions && sale.transactions.length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({sale.transactions.length})
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Accounting entries created for this sale
                  </CardDescription>
                </div>
                {(!sale.transactions || sale.transactions.length === 0) && (
                  <Button
                    onClick={handleCreateTransactions}
                    disabled={creatingTransactions}
                    variant="outline"
                  >
                    {creatingTransactions ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Create Transactions
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!sale.transactions || sale.transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No ledger transactions found for this sale.</p>
                  <p className="text-xs mt-2">
                    Transactions are automatically created when a sale is completed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sale.transactions.map((transaction) => {
                    const txAmount = typeof transaction.amount === 'number' 
                      ? transaction.amount 
                      : parseFloat(transaction.amount.toString());

                    return (
                      <Card key={transaction.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-semibold">
                                  {transaction.transactionNumber}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(transaction.transactionDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Amount</p>
                              <p className="text-xl font-bold">
                                {format(txAmount)}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Debit Account</p>
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-green-600" />
                                <div>
                                  <p className="font-mono text-sm font-semibold">
                                    {transaction.debitAccount.code}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {transaction.debitAccount.name}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Credit Account</p>
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-4 w-4 text-red-600 rotate-180" />
                                <div>
                                  <p className="font-mono text-sm font-semibold">
                                    {transaction.creditAccount.code}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {transaction.creditAccount.name}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/company/${companyId}/ledger/${transaction.id}`)}
                              className="w-full"
                            >
                              View Transaction Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">Total Amount</span>
                <span className="text-3xl font-bold text-primary">
                  {format(totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Preview Dialog */}
        {sale && (
          <InvoicePreviewDialog
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            onGenerate={() => {
              setPreviewOpen(false);
              const items = sale.items.map((item) => {
                const unitPrice = typeof item.unitPrice === 'number' 
                  ? item.unitPrice 
                  : parseFloat(item.unitPrice.toString());
                const totalPrice = typeof item.totalPrice === 'number' 
                  ? item.totalPrice 
                  : parseFloat(item.totalPrice.toString());
                
                return {
                  sku: item.product.sku,
                  name: item.product.name,
                  batchNumber: item.batch.batchNumber,
                  quantity: item.quantity,
                  unitPrice: unitPrice,
                  totalPrice: totalPrice,
                };
              });

              const subtotal = typeof sale.totalAmount === 'number' 
                ? sale.totalAmount 
                : parseFloat(sale.totalAmount.toString());

              console.log('Generating PDF with company:', company);
              generateInvoicePDF({
                type: 'sale',
                documentNumber: sale.saleNumber,
                date: sale.saleDate,
                company: company && company.name ? company : undefined,
                customerOrVendor: {
                  name: sale.customer?.name || 'Walk-in Customer',
                  email: sale.customer?.email,
                  phone: sale.customer?.phone,
                  address: sale.customer?.address,
                },
                items: items,
                subtotal: subtotal,
                total: subtotal,
                paidAmount: paidAmount,
                remainingBalance: remainingAmount,
                paymentType: sale.paymentType,
              });
            }}
            type="sale"
            documentNumber={sale.saleNumber}
            date={sale.saleDate}
            customerOrVendor={{
              name: sale.customer?.name || 'Walk-in Customer',
              email: sale.customer?.email,
              phone: sale.customer?.phone,
              address: sale.customer?.address,
            }}
            items={sale.items.map((item) => {
              const unitPrice = typeof item.unitPrice === 'number' 
                ? item.unitPrice 
                : parseFloat(item.unitPrice.toString());
              const totalPrice = typeof item.totalPrice === 'number' 
                ? item.totalPrice 
                : parseFloat(item.totalPrice.toString());
              
              return {
                sku: item.product.sku,
                name: item.product.name,
                batchNumber: item.batch.batchNumber,
                quantity: item.quantity,
                unitPrice: unitPrice,
                totalPrice: totalPrice,
              };
            })}
            subtotal={totalAmount}
            total={totalAmount}
            paidAmount={paidAmount}
            remainingBalance={remainingAmount}
            paymentType={sale.paymentType}
          />
        )}
      </div>
    </AppLayout>
  );
}

