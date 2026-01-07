import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ArrowLeft, Mail, Phone, MapPin, Edit, Loader2, ShoppingBag, Calendar, Package, Receipt, ArrowRight } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PurchaseItem {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  batchNumber: string;
  product: {
    id: string;
    sku: string;
    name: string;
  };
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
  items: PurchaseItem[];
  payments?: PurchasePayment[];
  transactions?: Transaction[];
}

export function VendorDetail() {
  const { companyId, vendorId } = useParams<{ companyId: string; vendorId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vendorId && companyId) {
      loadVendorDetail();
    }
  }, [vendorId, companyId]);

  const loadVendorDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const [vendorResult, purchasesResult] = await Promise.all([
        (window as any).electronAPI?.getVendor(vendorId!),
        (window as any).electronAPI?.getVendorPurchases(vendorId!),
      ]);

      if (vendorResult?.success && vendorResult.data) {
        setVendor(vendorResult.data);
      } else {
        setError(vendorResult?.error || "Failed to load vendor");
      }

      if (purchasesResult?.success && purchasesResult.data) {
        setPurchases(purchasesResult.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading vendor detail:", error);
    } finally {
      setLoading(false);
      setLoadingPurchases(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading vendor details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !vendor) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Vendor not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(`/company/${companyId}/vendors`)}>
                Back to Vendors
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

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
                onClick={() => navigate(`/company/${companyId}/vendors`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Building2 className="h-8 w-8" />
                  {vendor.name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Vendor Details
                </p>
              </div>
            </div>
            <Button onClick={() => navigate(`/company/${companyId}/vendors/${vendorId}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Vendor
            </Button>
          </div>

          {/* Vendor Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vendor.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold">{vendor.email}</p>
                    </div>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{vendor.phone}</p>
                    </div>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-semibold">{vendor.address}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vendor.createdAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-semibold">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {vendor.updatedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-semibold">
                      {new Date(vendor.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          {purchases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const totalAmount = purchases.reduce((sum, p) => {
                    const amount = typeof p.totalAmount === 'number' ? p.totalAmount : parseFloat(p.totalAmount.toString());
                    return sum + amount;
                  }, 0);
                  const paidAmount = purchases.reduce((sum, p) => {
                    const amount = typeof p.paidAmount === 'number' ? (p.paidAmount || 0) : parseFloat(p.paidAmount?.toString() || '0');
                    return sum + amount;
                  }, 0);
                  const remainingBalance = totalAmount - paidAmount;

                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Purchases</p>
                        <p className="text-2xl font-bold">{format(totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Paid Amount</p>
                        <p className="text-2xl font-bold text-green-600">{format(paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining Balance</p>
                        <p className={`text-2xl font-bold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {format(remainingBalance)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Purchases */}
          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              Purchases ({purchases.length})
            </h2>

            {loadingPurchases ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading purchases...</p>
                  </div>
                </CardContent>
              </Card>
            ) : purchases.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Purchases</CardTitle>
                  <CardDescription>
                    No purchase transactions found for this vendor.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="space-y-4">
                {purchases.map((purchase) => {
                  const totalAmount = typeof purchase.totalAmount === 'number' 
                    ? purchase.totalAmount 
                    : parseFloat(purchase.totalAmount.toString());
                  const paidAmount = purchase.paidAmount !== undefined
                    ? (typeof purchase.paidAmount === 'number' ? purchase.paidAmount : parseFloat(purchase.paidAmount.toString()))
                    : 0;
                  const remaining = totalAmount - paidAmount;

                  return (
                    <Card key={purchase.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/company/${companyId}/purchases/${purchase.id}`)}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <CardTitle className="text-lg">{purchase.purchaseNumber}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(purchase.purchaseDate).toLocaleDateString()}
                              </CardDescription>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            purchase.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : purchase.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Financial Summary */}
                          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Amount</p>
                              <p className="font-semibold">{format(totalAmount)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Paid</p>
                              <p className="font-semibold text-green-600">{format(paidAmount)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Remaining</p>
                              <p className={`font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {format(remaining)}
                              </p>
                            </div>
                          </div>

                          {/* Items Summary */}
                          {purchase.items && purchase.items.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-muted-foreground mb-2">Items ({purchase.items.length})</p>
                              <div className="space-y-1">
                                {purchase.items.slice(0, 3).map((item) => (
                                  <div key={item.id} className="flex items-center gap-2 text-sm">
                                    <Package className="h-3 w-3 text-muted-foreground" />
                                    <span>{item.product.name}</span>
                                    <span className="text-muted-foreground">x{item.quantity}</span>
                                  </div>
                                ))}
                                {purchase.items.length > 3 && (
                                  <p className="text-xs text-muted-foreground">+{purchase.items.length - 3} more items</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Payments Summary */}
                          {purchase.payments && purchase.payments.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-muted-foreground mb-2">Payments ({purchase.payments.length})</p>
                              <div className="space-y-1">
                                {purchase.payments.slice(0, 3).map((payment) => {
                                  const paymentAmount = typeof payment.amount === 'number' 
                                    ? payment.amount 
                                    : parseFloat(payment.amount.toString());
                                  return (
                                    <div key={payment.id} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        <Receipt className="h-3 w-3 text-muted-foreground" />
                                        <span>{new Date(payment.paymentDate).toLocaleDateString()}</span>
                                        <span className="text-muted-foreground capitalize">({payment.paymentType})</span>
                                      </div>
                                      <span className="font-semibold">{format(paymentAmount)}</span>
                                    </div>
                                  );
                                })}
                                {purchase.payments.length > 3 && (
                                  <p className="text-xs text-muted-foreground">+{purchase.payments.length - 3} more payments</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Transactions Summary */}
                          {purchase.transactions && purchase.transactions.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-sm text-muted-foreground mb-2">Ledger Transactions ({purchase.transactions.length})</p>
                              <div className="space-y-1">
                                {purchase.transactions.slice(0, 2).map((transaction) => {
                                  const amount = typeof transaction.amount === 'number' 
                                    ? transaction.amount 
                                    : parseFloat(transaction.amount.toString());
                                  return (
                                    <div key={transaction.id} className="flex items-center gap-2 text-sm">
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">{transaction.debitAccount.code}</span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-muted-foreground">{transaction.creditAccount.code}</span>
                                      <span className="font-semibold ml-auto">{format(amount)}</span>
                                    </div>
                                  );
                                })}
                                {purchase.transactions.length > 2 && (
                                  <p className="text-xs text-muted-foreground">+{purchase.transactions.length - 2} more transactions</p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/company/${companyId}/purchases/${purchase.id}`);
                              }}
                            >
                              View Details
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

