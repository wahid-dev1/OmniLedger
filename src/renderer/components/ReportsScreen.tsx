import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Package, DollarSign, Users, ShoppingBag, Calendar, Printer, Receipt, BarChart3, AlertTriangle, Activity } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { SalesReport } from "./reports/SalesReport";
import { InventoryReport } from "./reports/InventoryReport";
import { FinancialReport } from "./reports/FinancialReport";
import { CustomersReport } from "./reports/CustomersReport";
import { VendorsReport } from "./reports/VendorsReport";
import { PurchaseReport } from "./reports/PurchaseReport";
import { ProfitLossReport } from "./reports/ProfitLossReport";
import { BatchExpiryReport } from "./reports/BatchExpiryReport";
import { ProductPerformanceReport } from "./reports/ProductPerformanceReport";

type ReportType = "sales" | "inventory" | "financial" | "customers" | "vendors" | "purchases" | "profitloss" | "batchexpiry" | "productperformance" | null;

export function ReportsScreen() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const reportTypes = [
    {
      id: "sales" as const,
      title: "Sales Report",
      description: "View sales transactions, revenue, and performance metrics",
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      id: "purchases" as const,
      title: "Purchase Report",
      description: "Purchase transactions, vendor payments, and outstanding balances",
      icon: ShoppingBag,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      id: "inventory" as const,
      title: "Inventory Report",
      description: "Stock levels, batch information, and expiry tracking",
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      id: "productperformance" as const,
      title: "Product Performance",
      description: "Top selling products, revenue analysis, and sales metrics",
      icon: BarChart3,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
    {
      id: "batchexpiry" as const,
      title: "Batch Expiry Report",
      description: "Track batches expiring soon, expired items, and expiry dates",
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      id: "financial" as const,
      title: "Financial Report",
      description: "Ledger transactions, account balances, and financial summary",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      id: "profitloss" as const,
      title: "Profit & Loss",
      description: "Income statement showing revenue, expenses, and net profit/loss",
      icon: Receipt,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      id: "customers" as const,
      title: "Customers Report",
      description: "Customer balances, transaction history, and outstanding amounts",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      id: "vendors" as const,
      title: "Vendors Report",
      description: "Vendor purchases, payments, and outstanding balances",
      icon: Activity,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  // Print functionality will be handled by individual report components

  if (selectedReport) {
    const ReportComponent = {
      sales: SalesReport,
      purchases: PurchaseReport,
      inventory: InventoryReport,
      productperformance: ProductPerformanceReport,
      batchexpiry: BatchExpiryReport,
      financial: FinancialReport,
      profitloss: ProfitLossReport,
      customers: CustomersReport,
      vendors: VendorsReport,
    }[selectedReport];

    return (
      <AppLayout>
        <div className="min-h-screen bg-background p-8 print:p-4">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header with Print Button */}
            <div className="flex items-center justify-between print:hidden">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedReport(null)}
                >
                  ←
                </Button>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-3">
                    <FileText className="h-8 w-8" />
                    {reportTypes.find(r => r.id === selectedReport)?.title}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {reportTypes.find(r => r.id === selectedReport)?.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
                <Button onClick={() => {
                  // Trigger PDF preview from the report component
                  if ((window as any).currentReportPDF) {
                    (window as any).currentReportPDF();
                  }
                }}>
                  <Printer className="h-4 w-4 mr-2" />
                  Preview & Generate PDF
                </Button>
              </div>
            </div>

            {/* Report Content */}
            <div className="print:block">
              <ReportComponent companyId={companyId!} dateRange={dateRange} />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate and print reports for your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <Card
                  key={report.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedReport(report.id)}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 ${report.bgColor} rounded-lg flex items-center justify-center mb-2`}>
                      <Icon className={`h-6 w-6 ${report.color}`} />
                    </div>
                    <CardTitle>{report.title}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

