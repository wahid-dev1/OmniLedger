import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, TrendingDown, Package, BarChart3 } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface ProductPerformanceReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
}

interface ProductPerformance {
  productId: string;
  sku: string;
  name: string;
  category: string | null;
  totalQuantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  saleCount: number;
  stockLevel: number;
  availableStock: number;
}

type SortBy = "revenue" | "quantity" | "sales" | "name";

export function ProductPerformanceReport({ companyId, dateRange, onPrintPDF }: ProductPerformanceReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadProductPerformance();
    }
  }, [companyId, dateRange, sortBy, sortOrder, limit]);

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

  const loadProductPerformance = async () => {
    setLoading(true);
    try {
      const [productsResult, salesResult] = await Promise.all([
        (window as any).electronAPI?.getProducts(companyId),
        (window as any).electronAPI?.getSales(companyId),
      ]);

      if (!productsResult?.success || !salesResult?.success) {
        return;
      }

      let filteredSales = salesResult.data;

      // Date filter
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        filteredSales = filteredSales.filter((s: any) => new Date(s.saleDate) >= fromDate);
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        filteredSales = filteredSales.filter((s: any) => new Date(s.saleDate) <= toDate);
      }

      // Only completed sales
      filteredSales = filteredSales.filter((s: any) => s.status === 'completed');

      // Get detailed sales with items
      const salesWithItems = await Promise.all(
        filteredSales.map(async (sale: any) => {
          const result = await (window as any).electronAPI?.getSale(sale.id);
          return result?.success ? result.data : null;
        })
      );

      // Aggregate by product
      const productMap = new Map<string, ProductPerformance>();

      // Initialize with all products
      productsResult.data.forEach((product: any) => {
        productMap.set(product.id, {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          totalQuantitySold: 0,
          totalRevenue: 0,
          averagePrice: 0,
          saleCount: 0,
          stockLevel: typeof product.totalStock === 'number' ? product.totalStock : parseFloat(product.totalStock?.toString() || '0'),
          availableStock: typeof product.availableStock === 'number' ? product.availableStock : parseFloat(product.availableStock?.toString() || '0'),
        });
      });

      // Aggregate sales data
      salesWithItems.forEach((sale: any) => {
        if (!sale || !sale.items) return;

        sale.items.forEach((item: any) => {
          const productId = item.productId;
          const perf = productMap.get(productId);
          
          if (perf) {
            const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity.toString());
            const price = typeof item.price === 'number' ? item.price : parseFloat(item.price.toString());
            const amount = quantity * price;

            perf.totalQuantitySold += quantity;
            perf.totalRevenue += amount;
            perf.saleCount += 1;
          }
        });
      });

      // Calculate averages and filter
      const performanceData = Array.from(productMap.values())
        .map((perf) => ({
          ...perf,
          averagePrice: perf.totalQuantitySold > 0 ? perf.totalRevenue / perf.totalQuantitySold : 0,
        }))
        .filter((perf) => perf.totalQuantitySold > 0 || perf.stockLevel > 0); // Show products with sales or stock

      // Sort
      performanceData.sort((a, b) => {
        let aVal: number, bVal: number;
        
        switch (sortBy) {
          case "revenue":
            aVal = a.totalRevenue;
            bVal = b.totalRevenue;
            break;
          case "quantity":
            aVal = a.totalQuantitySold;
            bVal = b.totalQuantitySold;
            break;
          case "sales":
            aVal = a.saleCount;
            bVal = b.saleCount;
            break;
          case "name":
            aVal = a.name.localeCompare(b.name);
            bVal = 0;
            return sortOrder === "asc" ? aVal : -aVal;
          default:
            return 0;
        }

        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });

      // Apply limit
      setProducts(performanceData.slice(0, limit));
    } catch (error) {
      console.error("Error loading product performance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!company) return;

    const reportData = {
      title: "Product Performance Report",
      company: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      dateRange: {
        from: dateRange.from ? new Date(dateRange.from).toLocaleDateString() : "All",
        to: dateRange.to ? new Date(dateRange.to).toLocaleDateString() : "All",
      },
      data: products.map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category || "N/A",
        quantitySold: p.totalQuantitySold,
        revenue: format(p.totalRevenue),
        averagePrice: format(p.averagePrice),
        sales: p.saleCount,
        stockLevel: p.stockLevel,
        availableStock: p.availableStock,
      })),
    };

    await generatePDFReport(reportData);
    setPreviewOpen(true);
  };

  // Register PDF handler
  useEffect(() => {
    (window as any).currentReportPDF = handlePrintPDF;
    return () => {
      delete (window as any).currentReportPDF;
    };
  }, [products, company, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalQuantity = products.reduce((sum, p) => sum + p.totalQuantitySold, 0);
  const totalSales = products.reduce((sum, p) => sum + p.saleCount, 0);

  return (
    <>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters & Sort</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="quantity">Quantity Sold</SelectItem>
                    <SelectItem value="sales">Number of Sales</SelectItem>
                    <SelectItem value="name">Product Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order</Label>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Limit</Label>
                <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="25">Top 25</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                    <SelectItem value="100">Top 100</SelectItem>
                    <SelectItem value="999">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{format(totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuantity}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSales}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Product Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Product Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No product performance data found for the selected period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">SKU</th>
                      <th className="text-left p-3 text-sm font-medium">Product Name</th>
                      <th className="text-left p-3 text-sm font-medium">Category</th>
                      <th className="text-right p-3 text-sm font-medium">Quantity Sold</th>
                      <th className="text-right p-3 text-sm font-medium">Revenue</th>
                      <th className="text-right p-3 text-sm font-medium">Avg Price</th>
                      <th className="text-center p-3 text-sm font-medium">Sales</th>
                      <th className="text-right p-3 text-sm font-medium">Stock</th>
                      <th className="text-right p-3 text-sm font-medium">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.productId} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm font-mono">{product.sku}</td>
                        <td className="p-3 text-sm font-semibold">{product.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">{product.category || "N/A"}</td>
                        <td className="p-3 text-sm text-right">{product.totalQuantitySold}</td>
                        <td className="p-3 text-sm text-right font-semibold text-green-600">
                          {format(product.totalRevenue)}
                        </td>
                        <td className="p-3 text-sm text-right text-muted-foreground">
                          {format(product.averagePrice)}
                        </td>
                        <td className="p-3 text-sm text-center">{product.saleCount}</td>
                        <td className="p-3 text-sm text-right">{product.stockLevel}</td>
                        <td className={`p-3 text-sm text-right ${
                          product.availableStock === 0 ? 'text-red-600 font-semibold' : 
                          product.availableStock < 10 ? 'text-yellow-600' : ''
                        }`}>
                          {product.availableStock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}



