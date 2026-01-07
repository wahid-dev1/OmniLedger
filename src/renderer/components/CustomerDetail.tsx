import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft, Mail, Phone, MapPin, Edit, ShoppingCart, Calendar, Loader2, Map, Wallet, AlertCircle, Printer } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { generateCustomerStatementPDF } from "@/lib/customerStatementPDFGenerator";
import { CustomerStatementPreviewDialog } from "./CustomerStatementPreviewDialog";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Sale {
  id: string;
  saleNumber: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  saleDate: string;
  status: string;
  paymentType: string;
}

interface Area {
  id: string;
  code: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  areaCode?: string;
  area?: Area;
  sales?: Sale[];
  totalAmount?: number;
  paidAmount?: number;
  remainingBalance?: number;
  _count?: {
    sales: number;
  };
}

export function CustomerDetail() {
  const { companyId, customerId } = useParams<{ companyId: string; customerId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (customerId && companyId) {
      loadCustomerDetail();
      loadCompany();
    }
  }, [customerId, companyId]);

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

  const loadCustomerDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getCustomer(customerId!);

      if (result?.success && result.data) {
        setCustomer(result.data);
      } else {
        setError(result?.error || "Failed to load customer");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading customer detail:", error);
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
            <p className="text-muted-foreground">Loading customer details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !customer) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Customer not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(`/company/${companyId}/customers`)}>
                Back to Customers
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const totalSales = customer.totalAmount ?? (customer.sales?.reduce((sum, sale) => {
    const amount = typeof sale.totalAmount === 'number' 
      ? sale.totalAmount 
      : parseFloat(sale.totalAmount.toString());
    return sum + amount;
  }, 0) || 0);
  
  const paidAmount = customer.paidAmount ?? 0;
  const remainingBalance = customer.remainingBalance ?? (totalSales - paidAmount);

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
                onClick={() => navigate(`/company/${companyId}/customers`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Users className="h-8 w-8" />
                  {customer.name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Customer Details
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
                Preview & Print Statement
              </Button>
              <Button onClick={() => navigate(`/company/${companyId}/customers/${customerId}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Customer
              </Button>
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold">{customer.email}</p>
                    </div>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{customer.phone}</p>
                    </div>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-semibold">{customer.address}</p>
                    </div>
                  </div>
                )}
                {customer.area && (
                  <div className="flex items-center gap-3">
                    <Map className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Area</p>
                      <p className="font-semibold">{customer.area.code} - {customer.area.name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                    <p className="font-semibold text-lg">
                      {customer._count?.sales || customer.sales?.length || 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-semibold text-2xl text-primary">
                      {format(totalSales)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="font-semibold text-xl text-green-600">
                      {format(paidAmount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {remainingBalance > 0 ? (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  ) : null}
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining Balance</p>
                    <p className={`font-semibold text-xl ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {format(remainingBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Sales */}
          {customer.sales && customer.sales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  Sales History ({customer.sales.length})
                </CardTitle>
                <CardDescription>
                  All sales transactions for this customer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customer.sales.map((sale) => {
                    const amount = typeof sale.totalAmount === 'number' 
                      ? sale.totalAmount 
                      : parseFloat(sale.totalAmount.toString());
                    const paid = sale.paidAmount !== undefined 
                      ? (typeof sale.paidAmount === 'number' ? sale.paidAmount : parseFloat(sale.paidAmount.toString()))
                      : amount; // If paidAmount not provided, assume fully paid if completed
                    const remaining = amount - paid;

                    return (
                      <Card key={sale.id} className="border-2 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/company/${companyId}/sales/${sale.id}`)}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono font-semibold">{sale.saleNumber}</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
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
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(sale.saleDate).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  {sale.paymentType === 'cash' ? (
                                    <span>Cash</span>
                                  ) : sale.paymentType === 'bank' ? (
                                    <span>Bank</span>
                                  ) : (
                                    <span>COD</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <div>
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="text-lg font-bold">
                                  {format(amount)}
                                </p>
                              </div>
                              {remaining > 0 && (
                                <div className="pt-1">
                                  <p className="text-xs text-muted-foreground">Paid</p>
                                  <p className="text-sm font-semibold text-green-600">
                                    {format(paid)}
                                  </p>
                                  <p className="text-xs text-orange-600 font-medium">
                                    {format(remaining)} remaining
                                  </p>
                                </div>
                              )}
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

          {(!customer.sales || customer.sales.length === 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6" />
                  Sales History
                </CardTitle>
                <CardDescription>
                  No sales found for this customer
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Customer Statement Preview Dialog */}
          {customer && (
            <CustomerStatementPreviewDialog
              open={previewOpen}
              onClose={() => setPreviewOpen(false)}
              onGenerate={() => {
                setPreviewOpen(false);
                const salesData = (customer.sales || []).map((sale) => {
                  const amount = typeof sale.totalAmount === 'number' 
                    ? sale.totalAmount 
                    : parseFloat(sale.totalAmount.toString());
                  const paid = sale.paidAmount !== undefined
                    ? (typeof sale.paidAmount === 'number' ? sale.paidAmount : parseFloat(sale.paidAmount.toString()))
                    : 0;
                  const remaining = amount - paid;

                  return {
                    saleNumber: sale.saleNumber,
                    saleDate: sale.saleDate,
                    totalAmount: amount,
                    paidAmount: paid,
                    remainingBalance: remaining,
                    status: sale.status,
                    paymentType: sale.paymentType,
                  };
                });

                console.log('Generating PDF with company:', company);
                generateCustomerStatementPDF({
                  company: company && company.name ? company : undefined,
                  customer: {
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address,
                    areaCode: customer.areaCode,
                  },
                  sales: salesData,
                  summary: {
                    totalSales: customer._count?.sales || customer.sales?.length || 0,
                    totalAmount: totalSales,
                    totalPaid: paidAmount,
                    totalRemaining: remainingBalance,
                  },
                });
              }}
              customer={{
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                areaCode: customer.areaCode,
              }}
              sales={(customer.sales || []).map((sale) => {
                const amount = typeof sale.totalAmount === 'number' 
                  ? sale.totalAmount 
                  : parseFloat(sale.totalAmount.toString());
                const paid = sale.paidAmount !== undefined
                  ? (typeof sale.paidAmount === 'number' ? sale.paidAmount : parseFloat(sale.paidAmount.toString()))
                  : 0;
                const remaining = amount - paid;

                return {
                  saleNumber: sale.saleNumber,
                  saleDate: sale.saleDate,
                  totalAmount: amount,
                  paidAmount: paid,
                  remainingBalance: remaining,
                  status: sale.status,
                  paymentType: sale.paymentType,
                };
              })}
              summary={{
                totalSales: customer._count?.sales || customer.sales?.length || 0,
                totalAmount: totalSales,
                totalPaid: paidAmount,
                totalRemaining: remainingBalance,
              }}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

