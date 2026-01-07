import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Loader2, Users, CreditCard } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface CustomersReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
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
  areaCode?: string;
  totalAmount?: number;
  paidAmount?: number;
  remainingBalance?: number;
}

export function CustomersReport({ companyId }: CustomersReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalOwed: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadAreas();
    }
  }, [companyId]);

  useEffect(() => {
    let filtered = [...customers];

    // Customer filter
    if (customerFilter !== "all") {
      if (customerFilter === "none") {
        filtered = filtered.filter((c) => !c.id);
      } else {
        filtered = filtered.filter((c) => c.id === customerFilter);
      }
    }

    // Area filter
    if (areaFilter !== "all") {
      if (areaFilter === "none") {
        filtered = filtered.filter((c) => !c.areaCode || c.areaCode === null || c.areaCode === "");
      } else {
        filtered = filtered.filter((c) => c.areaCode === areaFilter);
      }
    }

    // Balance filter
    if (balanceFilter === "with_balance") {
      filtered = filtered.filter((c) => (c.remainingBalance ?? 0) > 0);
    } else if (balanceFilter === "paid_full") {
      filtered = filtered.filter((c) => (c.remainingBalance ?? 0) <= 0);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query))
      );
    }

    setFilteredCustomers(filtered);

    // Recalculate summary
    const summaryData = filtered.reduce(
      (acc: any, customer: Customer) => {
        acc.totalCustomers += 1;
        acc.totalOwed += customer.totalAmount || 0;
        acc.totalPaid += customer.paidAmount || 0;
        acc.totalOutstanding += customer.remainingBalance || 0;
        return acc;
      },
      { totalCustomers: 0, totalOwed: 0, totalPaid: 0, totalOutstanding: 0 }
    );
    setSummary(summaryData);
  }, [customers, customerFilter, areaFilter, balanceFilter, searchQuery]);

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

  const getTableData = () => {
    return filteredCustomers.map((customer) => ({
      name: customer.name,
      email: customer.email || '-',
      phone: customer.phone || '-',
      totalOwed: customer.totalAmount || 0,
      paid: customer.paidAmount || 0,
      outstanding: customer.remainingBalance || 0,
    }));
  };

  const getPDFOptions = () => {
    return {
      title: 'Customers Report',
      subtitle: 'Customer Balances and Outstanding Amounts',
      company: company || undefined,
      summary: [
        { label: 'Total Customers', value: summary.totalCustomers },
        { label: 'Total Owed', value: format(summary.totalOwed) },
        { label: 'Total Paid', value: format(summary.totalPaid) },
        { label: 'Outstanding', value: format(summary.totalOutstanding) },
      ],
      columns: [
        { header: 'Name', dataKey: 'name', align: 'left' },
        { header: 'Email', dataKey: 'email', align: 'left' },
        { header: 'Phone', dataKey: 'phone', align: 'left' },
        { header: 'Total Owed', dataKey: 'totalOwed', align: 'right' },
        { header: 'Paid', dataKey: 'paid', align: 'right' },
        { header: 'Outstanding', dataKey: 'outstanding', align: 'right' },
      ],
      data: getTableData(),
      footer: 'This report contains customer balance data only.',
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
    loadCustomersReport();
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
  }, [filteredCustomers, summary]);

  const loadCustomersReport = async () => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI?.getCustomers(companyId);
      
      if (result?.success && result.data) {
        setCustomers(result.data);
        setFilteredCustomers(result.data);
      }
    } catch (error) {
      console.error("Error loading customers report:", error);
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
        <h2 className="text-2xl font-bold">Customers Report</h2>
        <p className="text-muted-foreground mt-1">
          Customer Balances and Outstanding Amounts
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Customer Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="customerFilter" className="whitespace-nowrap text-sm">
                Customer:
              </Label>
              <SearchableSelect
                value={customerFilter}
                onValueChange={setCustomerFilter}
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
                  <SelectItem value="all">All</SelectItem>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{summary.totalCustomers}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{format(summary.totalOwed)}</span>
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

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b print:border-b-2">
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Email</th>
                  <th className="text-left p-2 font-medium">Phone</th>
                  <th className="text-right p-2 font-medium">Total Owed</th>
                  <th className="text-right p-2 font-medium">Paid</th>
                  <th className="text-right p-2 font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b print:border-b">
                      <td className="p-2">{customer.name}</td>
                      <td className="p-2">{customer.email || "-"}</td>
                      <td className="p-2">{customer.phone || "-"}</td>
                      <td className="p-2 text-right">{format(customer.totalAmount || 0)}</td>
                      <td className="p-2 text-right text-green-600">{format(customer.paidAmount || 0)}</td>
                      <td className="p-2 text-right text-orange-600">{format(customer.remainingBalance || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 print:border-t-2 font-bold">
                <tr>
                  <td colSpan={3} className="p-2">Total</td>
                  <td className="p-2 text-right">{format(summary.totalOwed)}</td>
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

