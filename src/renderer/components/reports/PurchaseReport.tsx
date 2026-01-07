import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { Loader2, ShoppingBag, Calendar } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface PurchaseReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  purchaseDate: string;
  status: string;
  paymentType?: string;
  vendor?: {
    id: string;
    name: string;
  };
  _count: {
    items: number;
  };
}

type PurchaseStatus = "all" | "completed" | "pending" | "cancelled";

interface Vendor {
  id: string;
  name: string;
}

export function PurchaseReport({ companyId, dateRange, onPrintPDF }: PurchaseReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalPaid: 0,
    totalRemaining: 0,
    totalTransactions: 0,
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadVendors();
      loadCompany();
    }
  }, [companyId]);

  const loadCompany = async () => {
    try {
      const result = await (window as any).electronAPI?.getCompany(companyId);
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

  useEffect(() => {
    if (companyId) {
      loadPurchaseReport();
    }
  }, [companyId, dateRange, statusFilter, paymentTypeFilter, vendorFilter]);

  const loadVendors = async () => {
    try {
      const result = await (window as any).electronAPI?.getVendors(companyId);
      if (result?.success && result.data) {
        setVendors(result.data);
      }
    } catch (error) {
      console.error("Error loading vendors:", error);
    }
  };

  const loadPurchaseReport = async () => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI?.getPurchases(companyId);
      
      if (result?.success && result.data) {
        let filtered = result.data;

        // Date filter
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((p: Purchase) => new Date(p.purchaseDate) >= fromDate);
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter((p: Purchase) => new Date(p.purchaseDate) <= toDate);
        }

        // Status filter
        if (statusFilter !== "all") {
          filtered = filtered.filter((p: Purchase) => p.status === statusFilter);
        }

        // Payment type filter
        if (paymentTypeFilter !== "all") {
          filtered = filtered.filter((p: Purchase) => p.paymentType === paymentTypeFilter);
        }

        // Vendor filter
        if (vendorFilter !== "all") {
          filtered = filtered.filter((p: Purchase) => p.vendor?.id === vendorFilter);
        }

        setPurchases(filtered);

        // Calculate summary
        const totalPurchases = filtered.reduce((sum: number, p: Purchase) => {
          const amount = typeof p.totalAmount === 'number' ? p.totalAmount : parseFloat(p.totalAmount.toString());
          return sum + amount;
        }, 0);

        const totalPaid = filtered.reduce((sum: number, p: Purchase) => {
          const paid = typeof p.paidAmount === 'number' ? p.paidAmount : parseFloat((p.paidAmount || 0).toString());
          return sum + paid;
        }, 0);

        setSummary({
          totalPurchases,
          totalPaid,
          totalRemaining: totalPurchases - totalPaid,
          totalTransactions: filtered.length,
        });
      }
    } catch (error) {
      console.error("Error loading purchase report:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTableData = () => {
    return purchases.map((p) => {
      const totalAmount = typeof p.totalAmount === 'number' ? p.totalAmount : parseFloat(p.totalAmount.toString());
      const paidAmount = typeof p.paidAmount === 'number' ? p.paidAmount : parseFloat((p.paidAmount || 0).toString());
      const remaining = totalAmount - paidAmount;
      return {
        purchaseNumber: p.purchaseNumber,
        date: new Date(p.purchaseDate).toLocaleDateString(),
        vendor: p.vendor?.name || "N/A",
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        remaining: remaining,
        status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
        paymentType: p.paymentType || "N/A",
        items: p._count?.items || 0,
      };
    });
  };

  const getPDFOptions = () => {
    return {
      title: 'Purchase Report',
      subtitle: 'Purchase Transactions Summary',
      dateRange: dateRange,
      company: company || undefined,
      summary: [
        { label: 'Total Purchases', value: format(summary.totalPurchases) },
        { label: 'Total Paid', value: format(summary.totalPaid) },
        { label: 'Outstanding', value: format(summary.totalRemaining) },
        { label: 'Transactions', value: summary.totalTransactions },
      ],
      columns: [
        { header: 'Purchase #', dataKey: 'purchaseNumber', align: 'left' },
        { header: 'Date', dataKey: 'date', align: 'left' },
        { header: 'Vendor', dataKey: 'vendor', align: 'left' },
        { header: 'Total Amount', dataKey: 'totalAmount', align: 'right' },
        { header: 'Paid', dataKey: 'paidAmount', align: 'right' },
        { header: 'Remaining', dataKey: 'remaining', align: 'right' },
        { header: 'Status', dataKey: 'status', align: 'left' },
        { header: 'Payment Type', dataKey: 'paymentType', align: 'left' },
        { header: 'Items', dataKey: 'items', align: 'center' },
      ],
      data: getTableData(),
      footer: 'This report contains purchase transaction data only.',
    };
  };

  const handleShowPreview = () => {
    setPreviewOpen(true);
  };

  const handleGeneratePDF = () => {
    setPreviewOpen(false);
    generatePDFReport(getPDFOptions());
  };

  // Register PDF handler
  useEffect(() => {
    (window as any).currentReportPDF = handleShowPreview;
    return () => {
      delete (window as any).currentReportPDF;
    };
  }, [purchases, summary, company, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PurchaseStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Types</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vendor</Label>
                <SearchableSelect
                  value={vendorFilter}
                  onValueChange={setVendorFilter}
                  placeholder="All Vendors"
                  searchPlaceholder="Search vendors..."
                >
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SearchableSelect>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(summary.totalPurchases)}</div>
              <p className="text-xs text-muted-foreground mt-1">{summary.totalTransactions} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{format(summary.totalPaid)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{format(summary.totalRemaining)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTransactions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Purchase Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No purchases found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Date</th>
                      <th className="text-left p-3 text-sm font-medium">Purchase #</th>
                      <th className="text-left p-3 text-sm font-medium">Vendor</th>
                      <th className="text-right p-3 text-sm font-medium">Total Amount</th>
                      <th className="text-right p-3 text-sm font-medium">Paid</th>
                      <th className="text-right p-3 text-sm font-medium">Outstanding</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Payment Type</th>
                      <th className="text-center p-3 text-sm font-medium">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => {
                      const totalAmount = typeof purchase.totalAmount === 'number' 
                        ? purchase.totalAmount 
                        : parseFloat(purchase.totalAmount.toString());
                      const paidAmount = typeof purchase.paidAmount === 'number' 
                        ? purchase.paidAmount 
                        : parseFloat((purchase.paidAmount || 0).toString());
                      const remaining = totalAmount - paidAmount;

                      return (
                        <tr key={purchase.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(purchase.purchaseDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-3 text-sm font-mono">{purchase.purchaseNumber}</td>
                          <td className="p-3 text-sm">{purchase.vendor?.name || "N/A"}</td>
                          <td className="p-3 text-sm text-right font-semibold">{format(totalAmount)}</td>
                          <td className="p-3 text-sm text-right text-green-600">{format(paidAmount)}</td>
                          <td className="p-3 text-sm text-right text-red-600">{format(remaining)}</td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              purchase.status === 'completed' ? 'bg-green-100 text-green-800' :
                              purchase.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {purchase.status}
                            </span>
                          </td>
                          <td className="p-3 text-sm capitalize">{purchase.paymentType || "N/A"}</td>
                          <td className="p-3 text-sm text-center">{purchase._count?.items || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PDFPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onGenerate={handleGeneratePDF}
        title={getPDFOptions().title}
        subtitle={getPDFOptions().subtitle}
        dateRange={getPDFOptions().dateRange}
        summary={getPDFOptions().summary}
        columns={getPDFOptions().columns}
        data={getPDFOptions().data}
      />
    </>
  );
}

