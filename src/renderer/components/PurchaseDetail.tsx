import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingBag, ArrowLeft, Building2, Calendar, Loader2, Package, Receipt, Plus, Wallet, CreditCard, FileText, ArrowRight, CheckCircle, Printer } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { generateInvoicePDF } from "@/lib/invoicePDFGenerator";
import { InvoicePreviewDialog } from "./InvoicePreviewDialog";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface PurchaseItem {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate?: string;
  product: {
    id: string;
    sku: string;
    name: string;
  };
  batch: {
    id: string;
    batchNumber: string;
    quantity: number;
    availableQuantity: number;
  };
}

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface PurchasePayment {
  id: string;
  amount: number | string;
  paymentDate: string;
  paymentType: string;
  notes?: string;
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

interface Purchase {
  id: string;
  purchaseNumber: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  purchaseDate: string;
  status: string;
  paymentType: string;
  notes?: string;
  vendor: Vendor;
  items: PurchaseItem[];
  payments?: PurchasePayment[];
  transactions?: Transaction[];
}

export function PurchaseDetail() {
  const { companyId, purchaseId } = useParams<{ companyId: string; purchaseId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentType: "cash",
    notes: "",
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (purchaseId && companyId) {
      loadPurchaseDetail();
      loadCompany();
    }
  }, [purchaseId, companyId]);

  const loadCompany = async () => {
    try {
      const result = await (window as any).electronAPI?.getCompany(companyId!);
      if (result?.success && result.data) {
        setCompany({
          name: result.data.name,
          address: result.data.address,
          phone: result.data.phone,
          email: result.data.email,
        });
      }
    } catch (error) {
      console.error("Error loading company:", error);
    }
  };

  const loadPurchaseDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getPurchase(purchaseId!);

      if (result?.success && result.data) {
        setPurchase(result.data);
      } else {
        setError(result?.error || "Failed to load purchase");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading purchase detail:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading purchase details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !purchase) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Purchase not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(`/company/${companyId}/purchases`)}>
                Back to Purchases
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const totalAmount = typeof purchase.totalAmount === 'number' 
    ? purchase.totalAmount 
    : parseFloat(purchase.totalAmount.toString());
  
  const paidAmount = purchase.paidAmount !== undefined
    ? (typeof purchase.paidAmount === 'number' ? purchase.paidAmount : parseFloat(purchase.paidAmount.toString()))
    : 0;
  const remainingBalance = totalAmount - paidAmount;

  const handleAddPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    setAddingPayment(true);
    try {
      const result = await (window as any).electronAPI?.addPurchasePayment(purchaseId!, {
        amount: parseFloat(paymentForm.amount),
        paymentType: paymentForm.paymentType,
        notes: paymentForm.notes || undefined,
      });

      if (result?.success) {
        setPaymentDialogOpen(false);
        setPaymentForm({ amount: "", paymentType: "cash", notes: "" });
        loadPurchaseDetail(); // Reload purchase details
      } else {
        alert(result?.error || "Failed to add payment");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setAddingPayment(false);
    }
  };

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
                onClick={() => navigate(`/company/${companyId}/purchases`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <ShoppingBag className="h-8 w-8" />
                  {purchase.purchaseNumber}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Purchase Details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewOpen(true)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Preview & Print
              </Button>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                purchase.status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : purchase.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : purchase.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Purchase Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-semibold">{purchase.vendor.name}</p>
                  </div>
                </div>
                {purchase.vendor.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{purchase.vendor.email}</p>
                  </div>
                )}
                {purchase.vendor.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-semibold">{purchase.vendor.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Purchase Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                    <p className="font-semibold">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Type</p>
                  <p className="font-semibold capitalize">{purchase.paymentType}</p>
                </div>
                {purchase.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-semibold">{purchase.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-semibold text-2xl text-primary">
                    {format(totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid Amount</p>
                  <p className="font-semibold text-xl text-green-600">
                    {format(paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining Balance</p>
                  <p className={`font-semibold text-xl ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {format(remainingBalance)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  Payment Summary
                </CardTitle>
                {remainingBalance > 0 && (
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
                          Record a payment for this purchase. Remaining balance: {format(remainingBalance)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="paymentAmount">Amount *</Label>
                          <Input
                            id="paymentAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            max={remainingBalance}
                            placeholder="0.00"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            disabled={addingPayment}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentType">Payment Type *</Label>
                          <Select
                            value={paymentForm.paymentType}
                            onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentType: value })}
                            disabled={addingPayment}
                          >
                            <SelectTrigger id="paymentType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank">Bank</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentNotes">Notes</Label>
                          <Textarea
                            id="paymentNotes"
                            placeholder="Optional notes about this payment"
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            disabled={addingPayment}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setPaymentDialogOpen(false)}
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
                            "Add Payment"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">{format(totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold text-green-600">{format(paidAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {format(remainingBalance)}
                  </p>
                  {remainingBalance <= 0 && (
                    <div className="flex items-center gap-1 text-green-600 mt-1">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Fully Paid</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          {purchase.payments && purchase.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-6 w-6" />
                  Payments ({purchase.payments.length})
                </CardTitle>
                <CardDescription>
                  Payment history for this purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchase.payments.map((payment) => {
                    const paymentAmount = typeof payment.amount === 'number' 
                      ? payment.amount 
                      : parseFloat(payment.amount.toString());
                    return (
                      <Card key={payment.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Receipt className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-semibold">
                                    {new Date(payment.paymentDate).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {payment.paymentType === 'cash' ? (
                                      <span className="flex items-center gap-1">
                                        <Wallet className="h-4 w-4" />
                                        Cash
                                      </span>
                                    ) : payment.paymentType === 'bank' ? (
                                      <span className="flex items-center gap-1">
                                        <CreditCard className="h-4 w-4" />
                                        Bank
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1">
                                        <FileText className="h-4 w-4" />
                                        Credit
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              {payment.notes && (
                                <p className="text-sm text-muted-foreground mt-2">{payment.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-600">
                                {format(paymentAmount)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions */}
          {purchase.transactions && purchase.transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Ledger Transactions ({purchase.transactions.length})
                </CardTitle>
                <CardDescription>
                  Double-entry accounting transactions for this purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchase.transactions.map((transaction) => {
                    const amount = typeof transaction.amount === 'number' 
                      ? transaction.amount 
                      : parseFloat(transaction.amount.toString());
                    return (
                      <Card key={transaction.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-semibold">{transaction.transactionNumber}</p>
                                  <p className="text-sm text-muted-foreground">{transaction.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(transaction.transactionDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Dr:</span>
                                  <span className="font-medium">{transaction.debitAccount.code} - {transaction.debitAccount.name}</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Cr:</span>
                                  <span className="font-medium">{transaction.creditAccount.code} - {transaction.creditAccount.name}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {format(amount)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Purchase Items */}
          {purchase.items && purchase.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  Purchase Items ({purchase.items.length})
                </CardTitle>
                <CardDescription>
                  Products and batches created from this purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {purchase.items.map((item) => {
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
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold">{item.product.name}</span>
                                <span className="text-sm text-muted-foreground">({item.product.sku})</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                <div>
                                  <p>Batch Number</p>
                                  <p className="font-semibold text-foreground">{item.batchNumber}</p>
                                </div>
                                <div>
                                  <p>Quantity</p>
                                  <p className="font-semibold text-foreground">{item.quantity}</p>
                                </div>
                                <div>
                                  <p>Unit Price</p>
                                  <p className="font-semibold text-foreground">{format(unitPrice)}</p>
                                </div>
                                {item.manufacturingDate && (
                                  <div>
                                    <p>Manufacturing Date</p>
                                    <p className="font-semibold text-foreground">
                                      {new Date(item.manufacturingDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}
                                {item.expiryDate && (
                                  <div>
                                    <p>Expiry Date</p>
                                    <p className="font-semibold text-foreground">
                                      {new Date(item.expiryDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Item Total</p>
                              <p className="text-xl font-bold">
                                {format(itemTotal)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Purchase Order Preview Dialog */}
        {purchase && (
          <InvoicePreviewDialog
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            onGenerate={() => {
              setPreviewOpen(false);
              const items = purchase.items.map((item) => {
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

              const subtotal = typeof purchase.totalAmount === 'number' 
                ? purchase.totalAmount 
                : parseFloat(purchase.totalAmount.toString());

              console.log('Generating PDF with company:', company);
              generateInvoicePDF({
                type: 'purchase',
                documentNumber: purchase.purchaseNumber,
                date: purchase.purchaseDate,
                company: company && company.name ? company : undefined,
                customerOrVendor: {
                  name: purchase.vendor.name,
                  email: purchase.vendor.email,
                  phone: purchase.vendor.phone,
                  address: purchase.vendor.address,
                },
                items: items,
                subtotal: subtotal,
                total: subtotal,
                paidAmount: paidAmount,
                remainingBalance: remainingBalance,
                paymentType: purchase.paymentType,
                notes: purchase.notes,
              });
            }}
            type="purchase"
            documentNumber={purchase.purchaseNumber}
            date={purchase.purchaseDate}
            customerOrVendor={{
              name: purchase.vendor.name,
              email: purchase.vendor.email,
              phone: purchase.vendor.phone,
              address: purchase.vendor.address,
            }}
            items={purchase.items.map((item) => {
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
            remainingBalance={remainingBalance}
            paymentType={purchase.paymentType}
            notes={purchase.notes}
          />
        )}
      </div>
    </AppLayout>
  );
}

