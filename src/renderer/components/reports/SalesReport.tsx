import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, ShoppingCart, Calendar } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface SalesReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
}

interface Area {
  id: string;
  code: string;
  name: string;
}

interface Sale {
  id: string;
  saleNumber: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  saleDate: string;
  status: string;
  paymentType?: string;
  customer?: {
    id: string;
    name: string;
    areaCode?: string;
  };
  _count: {
    items: number;
  };
}

type SaleStatus = "all" | "in_progress" | "completed" | "returned" | "partial_return";

interface Customer {
  id: string;
  name: string;
}

export function SalesReport({ companyId, dateRange, onPrintPDF }: SalesReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [sales, setSales] = useState<Sale[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<SaleStatus>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalPaid: 0,
    totalRemaining: 0,
    totalTransactions: 0,
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadAreas();
      loadCustomers();
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
      loadSalesReport();
    }
  }, [companyId, dateRange, areaFilter, statusFilter, paymentTypeFilter, customerFilter]);

  const loadAreas = async () => {
    setLoadingAreas(true);
    try {
      const result = await (window as any).electronAPI?.getAreas(companyId);
      if (result?.success && result.data) {
        setAreas(result.data);
      }
    } catch (error) {
      console.error("Error loading areas:", error);
    } finally {
      setLoadingAreas(false);
    }
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const result = await (window as any).electronAPI?.getCustomers(companyId);
      if (result?.success && result.data) {
        setCustomers(result.data);
      }
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadSalesReport = async () => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI?.getSales(companyId);
      
      if (result?.success && result.data) {
        let filteredSales = result.data.filter((sale: Sale) => {
          const saleDate = new Date(sale.saleDate);
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return saleDate >= fromDate && saleDate <= toDate;
        });

        // Apply status filter
        if (statusFilter !== "all") {
          filteredSales = filteredSales.filter((sale: Sale) => sale.status === statusFilter);
        }

        // Apply payment type filter
        if (paymentTypeFilter !== "all") {
          filteredSales = filteredSales.filter((sale: Sale) => sale.paymentType === paymentTypeFilter);
        }

        // Apply customer filter
        if (customerFilter !== "all") {
          const beforeCustomerFilter = filteredSales.length;
          if (customerFilter === "none") {
            // Filter sales with no customer
            filteredSales = filteredSales.filter((sale: Sale) => !sale.customer);
          } else {
            // Filter sales by specific customer
            filteredSales = filteredSales.filter((sale: Sale) => {
              if (!sale.customer) {
                return false;
              }
              
              // Check if customer has id
              if (!sale.customer.id) {
                console.warn("[SalesReport] Sale customer missing id:", {
                  saleNumber: sale.saleNumber,
                  customer: sale.customer
                });
                return false;
              }
              
              const matches = sale.customer.id === customerFilter;
              
              // Debug logging for first few
              if (filteredSales.length < 3) {
                console.log("[SalesReport] Customer filter check:", {
                  filterValue: customerFilter,
                  customerId: sale.customer.id,
                  customerName: sale.customer.name,
                  matches: matches,
                  typeCheck: typeof sale.customer.id === typeof customerFilter
                });
              }
              
              return matches;
            });
          }
          console.log("[SalesReport] Customer filter applied:", {
            filterValue: customerFilter,
            beforeCount: beforeCustomerFilter,
            afterCount: filteredSales.length
          });
        }

        // Apply area filter
        if (areaFilter !== "all") {
          if (areaFilter === "none") {
            // Filter sales with no customer or customer with no areaCode
            filteredSales = filteredSales.filter((sale: Sale) => {
              if (!sale.customer) return true;
              return !sale.customer.areaCode || sale.customer.areaCode === null || sale.customer.areaCode === "";
            });
          } else {
            // Filter sales by specific area code
            filteredSales = filteredSales.filter((sale: Sale) => {
              if (!sale.customer) return false;
              return sale.customer.areaCode === areaFilter;
            });
          }
        }

        setSales(filteredSales);

        // Calculate summary
        const summaryData = filteredSales.reduce(
          (acc: any, sale: Sale) => {
            const total = typeof sale.totalAmount === 'number' 
              ? sale.totalAmount 
              : parseFloat(sale.totalAmount.toString());
            const paid = sale.paidAmount !== undefined
              ? (typeof sale.paidAmount === 'number' ? sale.paidAmount : parseFloat(sale.paidAmount.toString()))
              : 0;
            
            acc.totalSales += total;
            acc.totalPaid += paid;
            acc.totalRemaining += (total - paid);
            acc.totalTransactions += 1;
            return acc;
          },
          { totalSales: 0, totalPaid: 0, totalRemaining: 0, totalTransactions: 0 }
        );

        setSummary(summaryData);
      }
    } catch (error) {
      console.error("Error loading sales report:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTableData = () => {
    return sales.map((sale) => {
      const total = typeof sale.totalAmount === 'number' 
        ? sale.totalAmount 
        : parseFloat(sale.totalAmount.toString());
      const paid = sale.paidAmount !== undefined
        ? (typeof sale.paidAmount === 'number' ? sale.paidAmount : parseFloat(sale.paidAmount.toString()))
        : 0;
      const remaining = total - paid;

      return {
        saleNumber: sale.saleNumber,
        date: new Date(sale.saleDate).toLocaleDateString(),
        customer: sale.customer?.name || '-',
        total: total,
        paid: paid,
        remaining: remaining,
        status: sale.status.charAt(0).toUpperCase() + sale.status.slice(1),
      };
    });
  };

  const getPDFOptions = () => {
    return {
      title: 'Sales Report',
      subtitle: 'Sales Transactions Summary',
      dateRange: dateRange,
      company: company || undefined,
      summary: [
        { label: 'Total Sales', value: format(summary.totalSales) },
        { label: 'Total Paid', value: format(summary.totalPaid) },
        { label: 'Outstanding', value: format(summary.totalRemaining) },
        { label: 'Transactions', value: summary.totalTransactions },
      ],
      columns: [
        { header: 'Sale #', dataKey: 'saleNumber', align: 'left' },
        { header: 'Date', dataKey: 'date', align: 'left' },
        { header: 'Customer', dataKey: 'customer', align: 'left' },
        { header: 'Total', dataKey: 'total', align: 'right' },
        { header: 'Paid', dataKey: 'paid', align: 'right' },
        { header: 'Remaining', dataKey: 'remaining', align: 'right' },
        { header: 'Status', dataKey: 'status', align: 'left' },
      ],
      data: getTableData(),
      footer: 'This report contains sales transaction data only.',
    };
  };

  const handleShowPreview = () => {
    setPreviewOpen(true);
  };

  const handleGeneratePDF = () => {
    setPreviewOpen(false);
    generatePDFReport(getPDFOptions());
  };

  // Expose PDF preview function
  useEffect(() => {
    (window as any).currentReportPDF = handleShowPreview;
    return () => {
      delete (window as any).currentReportPDF;
    };
  }, [sales, summary, dateRange, handleShowPreview]);

  if (loading || loadingCustomers) {
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
        <h2 className="text-2xl font-bold">Sales Report</h2>
        <p className="text-muted-foreground mt-1">
          {new Date(dateRange.from).toLocaleDateString()} - {new Date(dateRange.to).toLocaleDateString()}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="statusFilter" className="whitespace-nowrap text-sm">
                Status:
              </Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SaleStatus)}>
                <SelectTrigger id="statusFilter" className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="partial_return">Partial Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Type Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="paymentFilter" className="whitespace-nowrap text-sm">
                Payment:
              </Label>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger id="paymentFilter" className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cod">COD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="customerFilter" className="whitespace-nowrap text-sm">
                Customer:
              </Label>
              <SearchableSelect
                value={customerFilter}
                onValueChange={setCustomerFilter}
                disabled={loadingCustomers}
                id="customerFilter"
                placeholder="All Customers"
                searchPlaceholder="Search customers..."
                className="w-full"
              >
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="none">No Customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SearchableSelect>
            </div>

            {/* Area Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="areaFilter" className="whitespace-nowrap text-sm">
                Area:
              </Label>
              <Select value={areaFilter} onValueChange={setAreaFilter} disabled={loadingAreas}>
                <SelectTrigger id="areaFilter" className="w-full">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  <SelectItem value="none">No Area</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.code}>
                      {area.code} - {area.name}
                    </SelectItem>
                  ))}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{format(summary.totalSales)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
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
              <ShoppingCart className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{format(summary.totalRemaining)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{summary.totalTransactions}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b print:border-b-2">
                  <th className="text-left p-2 font-medium">Sale #</th>
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Customer</th>
                  <th className="text-right p-2 font-medium">Total</th>
                  <th className="text-right p-2 font-medium">Paid</th>
                  <th className="text-right p-2 font-medium">Remaining</th>
                  <th className="text-left p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      No sales found for the selected date range
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => {
                    const total = typeof sale.totalAmount === 'number' 
                      ? sale.totalAmount 
                      : parseFloat(sale.totalAmount.toString());
                    const paid = sale.paidAmount !== undefined
                      ? (typeof sale.paidAmount === 'number' ? sale.paidAmount : parseFloat(sale.paidAmount.toString()))
                      : 0;
                    const remaining = total - paid;

                    return (
                      <tr key={sale.id} className="border-b print:border-b">
                        <td className="p-2">{sale.saleNumber}</td>
                        <td className="p-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                        <td className="p-2">{sale.customer?.name || "-"}</td>
                        <td className="p-2 text-right">{format(total)}</td>
                        <td className="p-2 text-right text-green-600">{format(paid)}</td>
                        <td className="p-2 text-right text-orange-600">{format(remaining)}</td>
                        <td className="p-2 capitalize">{sale.status}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 print:border-t-2 font-bold">
                <tr>
                  <td colSpan={3} className="p-2">Total</td>
                  <td className="p-2 text-right">{format(summary.totalSales)}</td>
                  <td className="p-2 text-right">{format(summary.totalPaid)}</td>
                  <td className="p-2 text-right">{format(summary.totalRemaining)}</td>
                  <td className="p-2"></td>
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
        dateRange={getPDFOptions().dateRange}
        summary={getPDFOptions().summary}
        columns={getPDFOptions().columns}
        data={getPDFOptions().data}
      />
    </div>
  );
}

