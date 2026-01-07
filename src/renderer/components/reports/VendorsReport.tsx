import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Loader2, ShoppingBag, CreditCard } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface VendorsReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
}

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  purchaseDate: string;
  vendor?: Vendor;
}

export function VendorsReport({ companyId }: VendorsReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalVendors: 0,
    totalPurchases: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let filtered = [...purchases];

    // Vendor filter
    if (vendorFilter !== "all") {
      filtered = filtered.filter((p) => p.vendor?.id === vendorFilter);
    }

    // Balance filter
    if (balanceFilter === "with_balance") {
      filtered = filtered.filter((p) => {
        const total = typeof p.totalAmount === 'number' ? p.totalAmount : parseFloat(p.totalAmount.toString());
        const paid = p.paidAmount !== undefined
          ? (typeof p.paidAmount === 'number' ? p.paidAmount : parseFloat(p.paidAmount.toString()))
          : 0;
        return total - paid > 0;
      });
    } else if (balanceFilter === "paid_full") {
      filtered = filtered.filter((p) => {
        const total = typeof p.totalAmount === 'number' ? p.totalAmount : parseFloat(p.totalAmount.toString());
        const paid = p.paidAmount !== undefined
          ? (typeof p.paidAmount === 'number' ? p.paidAmount : parseFloat(p.paidAmount.toString()))
          : 0;
        return total - paid <= 0;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.purchaseNumber.toLowerCase().includes(query) ||
        (p.vendor && p.vendor.name.toLowerCase().includes(query))
      );
    }

    setFilteredPurchases(filtered);

    // Recalculate summary
    const summaryData = filtered.reduce(
      (acc: any, purchase: Purchase) => {
        const total = typeof purchase.totalAmount === 'number' 
          ? purchase.totalAmount 
          : parseFloat(purchase.totalAmount.toString());
        const paid = purchase.paidAmount !== undefined
          ? (typeof purchase.paidAmount === 'number' ? purchase.paidAmount : parseFloat(purchase.paidAmount.toString()))
          : 0;
        const outstanding = total - paid;

        acc.totalPurchases += total;
        acc.totalPaid += paid;
        acc.totalOutstanding += outstanding;
        return acc;
      },
      { totalVendors: new Set(filtered.map(p => p.vendor?.id).filter(Boolean)).size, totalPurchases: 0, totalPaid: 0, totalOutstanding: 0 }
    );
    setSummary(summaryData);
  }, [purchases, vendorFilter, balanceFilter, searchQuery]);

  const getTableData = () => {
    return filteredPurchases.map((purchase) => {
      const total = typeof purchase.totalAmount === 'number' 
        ? purchase.totalAmount 
        : parseFloat(purchase.totalAmount.toString());
      const paid = purchase.paidAmount !== undefined
        ? (typeof purchase.paidAmount === 'number' ? purchase.paidAmount : parseFloat(purchase.paidAmount.toString()))
        : 0;
      const outstanding = total - paid;

      return {
        purchaseNumber: purchase.purchaseNumber,
        date: new Date(purchase.purchaseDate).toLocaleDateString(),
        vendor: purchase.vendor?.name || '-',
        total: total,
        paid: paid,
        outstanding: outstanding,
      };
    });
  };

  const getPDFOptions = () => {
    return {
      title: 'Vendors Report',
      subtitle: 'Vendor Purchases and Payment Status',
      company: company || undefined,
      summary: [
        { label: 'Total Vendors', value: summary.totalVendors },
        { label: 'Total Purchases', value: format(summary.totalPurchases) },
        { label: 'Total Paid', value: format(summary.totalPaid) },
        { label: 'Outstanding', value: format(summary.totalOutstanding) },
      ],
      columns: [
        { header: 'Purchase #', dataKey: 'purchaseNumber', align: 'left' },
        { header: 'Date', dataKey: 'date', align: 'left' },
        { header: 'Vendor', dataKey: 'vendor', align: 'left' },
        { header: 'Total', dataKey: 'total', align: 'right' },
        { header: 'Paid', dataKey: 'paid', align: 'right' },
        { header: 'Outstanding', dataKey: 'outstanding', align: 'right' },
      ],
      data: getTableData(),
      footer: 'This report contains vendor purchase data only.',
    };
  };

  const handleShowPreview = () => {
    setPreviewOpen(true);
  };

  const handleGeneratePDF = () => {
    setPreviewOpen(false);
    generatePDFReport(getPDFOptions());
  };

  useEffect(() => {
    loadVendorsReport();
    loadCompany();
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

  // Expose PDF preview function
  useEffect(() => {
    (window as any).currentReportPDF = handleShowPreview;
    return () => {
      delete (window as any).currentReportPDF;
    };
  }, [filteredPurchases, summary]);

  const loadVendorsReport = async () => {
    setLoading(true);
    try {
      const [vendorsResult, purchasesResult] = await Promise.all([
        (window as any).electronAPI?.getVendors(companyId),
        (window as any).electronAPI?.getPurchases(companyId),
      ]);

      if (vendorsResult?.success && vendorsResult.data) {
        setVendors(vendorsResult.data);
      }

      if (purchasesResult?.success && purchasesResult.data) {
        setPurchases(purchasesResult.data);
        setFilteredPurchases(purchasesResult.data);
      }
    } catch (error) {
      console.error("Error loading vendors report:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Report Header */}
      <div className="text-center border-b pb-4 print:border-b-2">
        <h2 className="text-2xl font-bold">Vendors Report</h2>
        <p className="text-muted-foreground mt-1">
          Vendor Purchases and Payment Status
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Generated on {new Date().toLocaleString()}
        </p>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by purchase # or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Vendor Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="vendorFilter" className="whitespace-nowrap text-sm">
                Vendor:
              </Label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger id="vendorFilter" className="w-full">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Balance Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="balanceFilter" className="whitespace-nowrap text-sm">
                Balance:
              </Label>
              <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                <SelectTrigger id="balanceFilter" className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purchases</SelectItem>
                  <SelectItem value="with_balance">With Balance</SelectItem>
                  <SelectItem value="paid_full">Paid in Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{summary.totalVendors}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{format(summary.totalPurchases)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">{format(summary.totalPaid)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{format(summary.totalOutstanding)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b print:border-b-2">
                  <th className="text-left p-2 font-medium">Purchase #</th>
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Vendor</th>
                  <th className="text-right p-2 font-medium">Total</th>
                  <th className="text-right p-2 font-medium">Paid</th>
                  <th className="text-right p-2 font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No purchases found
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => {
                    const total = typeof purchase.totalAmount === 'number' 
                      ? purchase.totalAmount 
                      : parseFloat(purchase.totalAmount.toString());
                    const paid = purchase.paidAmount !== undefined
                      ? (typeof purchase.paidAmount === 'number' ? purchase.paidAmount : parseFloat(purchase.paidAmount.toString()))
                      : 0;
                    const outstanding = total - paid;

                    return (
                      <tr key={purchase.id} className="border-b print:border-b">
                        <td className="p-2">{purchase.purchaseNumber}</td>
                        <td className="p-2">{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                        <td className="p-2">{purchase.vendor?.name || "-"}</td>
                        <td className="p-2 text-right">{format(total)}</td>
                        <td className="p-2 text-right text-green-600">{format(paid)}</td>
                        <td className="p-2 text-right text-orange-600">{format(outstanding)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 print:border-t-2 font-bold">
                <tr>
                  <td colSpan={3} className="p-2">Total</td>
                  <td className="p-2 text-right">{format(summary.totalPurchases)}</td>
                  <td className="p-2 text-right">{format(summary.totalPaid)}</td>
                  <td className="p-2 text-right">{format(summary.totalOutstanding)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem;
          }
          .print\\:p-4 {
            padding: 1rem;
          }
          .print\\:border-b-2 {
            border-bottom-width: 2px;
          }
          .print\\:border-t-2 {
            border-top-width: 2px;
          }
          .print\\:grid-cols-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onGenerate={handleGeneratePDF}
        title={getPDFOptions().title}
        subtitle={getPDFOptions().subtitle}
        summary={getPDFOptions().summary}
        columns={getPDFOptions().columns}
        data={getPDFOptions().data}
      />
    </div>
  );
}

