import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Loader2, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface InventoryReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category?: string;
  totalStock: number;
  availableStock: number;
  isInStock: boolean;
  nearestExpiryDate?: string;
  hasExpiringSoon: boolean;
}

type StockFilter = "all" | "in_stock" | "out_of_stock" | "expiring_soon";

export function InventoryReport({ companyId, dateRange }: InventoryReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    inStock: 0,
    outOfStock: 0,
    expiringSoon: 0,
    totalValue: 0,
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return "Expired";
    if (daysUntilExpiry <= 30) return `${daysUntilExpiry} days`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    let filtered = [...products];

    // Stock status filter
    if (stockFilter !== "all") {
      if (stockFilter === "in_stock") {
        filtered = filtered.filter((p) => p.isInStock);
      } else if (stockFilter === "out_of_stock") {
        filtered = filtered.filter((p) => !p.isInStock);
      } else if (stockFilter === "expiring_soon") {
        filtered = filtered.filter((p) => p.hasExpiringSoon);
      }
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.sku.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query))
      );
    }

    setFilteredProducts(filtered);

    // Recalculate summary based on filtered products
    const recalculatedSummary = filtered.reduce(
      (acc, product) => {
        acc.totalProducts += 1;
        if (product.isInStock) acc.inStock += 1;
        else acc.outOfStock += 1;
        if (product.hasExpiringSoon) acc.expiringSoon += 1;
        // Note: Total value calculation removed as prices are tracked at batch level
        return acc;
      },
      { totalProducts: 0, inStock: 0, outOfStock: 0, expiringSoon: 0, totalValue: 0 }
    );
    setSummary(recalculatedSummary);
  }, [products, stockFilter, categoryFilter, searchQuery]);

  const getTableData = () => {
    return filteredProducts.map((product) => {
      let expiryText = '-';
      if (product.nearestExpiryDate) {
        expiryText = formatExpiryDate(product.nearestExpiryDate);
      }

      return {
        sku: product.sku,
        name: product.name,
        category: product.category || '-',
        totalStock: product.totalStock,
        available: product.availableStock,
        status: product.isInStock ? 'In Stock' : 'Out of Stock',
        nearestExpiry: expiryText,
      };
    });
  };

  const getPDFOptions = () => {
    return {
      title: 'Inventory Report',
      subtitle: 'Current Stock Levels',
      company: company || undefined,
      summary: [
        { label: 'Total Products', value: summary.totalProducts },
        { label: 'In Stock', value: summary.inStock },
        { label: 'Out of Stock', value: summary.outOfStock },
        { label: 'Expiring Soon', value: summary.expiringSoon },
      ],
      columns: [
        { header: 'SKU', dataKey: 'sku', align: 'left' },
        { header: 'Product Name', dataKey: 'name', align: 'left' },
        { header: 'Category', dataKey: 'category', align: 'left' },
        { header: 'Total Stock', dataKey: 'totalStock', align: 'right' },
        { header: 'Available', dataKey: 'available', align: 'right' },
        { header: 'Status', dataKey: 'status', align: 'left' },
        { header: 'Nearest Expiry', dataKey: 'nearestExpiry', align: 'left' },
      ],
      data: getTableData(),
      footer: 'This report contains current inventory data only.',
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
    loadInventoryReport();
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
  }, [filteredProducts, summary]);

  const loadInventoryReport = async () => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI?.getProducts(companyId);
      
      if (result?.success && result.data) {
        setProducts(result.data);
        setFilteredProducts(result.data);

        // Extract unique categories
        const uniqueCategories = [...new Set(result.data.map((p: Product) => p.category).filter(Boolean))];
        setCategories(uniqueCategories as string[]);
      }
    } catch (error) {
      console.error("Error loading inventory report:", error);
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
        <h2 className="text-2xl font-bold">Inventory Report</h2>
        <p className="text-muted-foreground mt-1">
          Current Stock Levels
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
                placeholder="Search by SKU, name, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Stock Status Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="stockFilter" className="whitespace-nowrap text-sm">
                Status:
              </Label>
              <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as StockFilter)}>
                <SelectTrigger id="stockFilter" className="w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="categoryFilter" className="whitespace-nowrap text-sm">
                Category:
              </Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="categoryFilter" className="w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{summary.totalProducts}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{summary.inStock}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{summary.outOfStock}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">{summary.expiringSoon}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b print:border-b-2">
                  <th className="text-left p-2 font-medium">SKU</th>
                  <th className="text-left p-2 font-medium">Product Name</th>
                  <th className="text-left p-2 font-medium">Category</th>
                  <th className="text-right p-2 font-medium">Total Stock</th>
                  <th className="text-right p-2 font-medium">Available</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Nearest Expiry</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-muted-foreground">
                      No products found
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b print:border-b">
                      <td className="p-2">{product.sku}</td>
                      <td className="p-2">{product.name}</td>
                      <td className="p-2">{product.category || "-"}</td>
                      <td className="p-2 text-right">{product.totalStock}</td>
                      <td className="p-2 text-right">{product.availableStock}</td>
                      <td className="p-2">
                        {product.isInStock ? (
                          <span className="text-green-600">In Stock</span>
                        ) : (
                          <span className="text-red-600">Out of Stock</span>
                        )}
                      </td>
                      <td className="p-2">
                        {product.hasExpiringSoon ? (
                          <span className="text-orange-600">{formatExpiryDate(product.nearestExpiryDate)}</span>
                        ) : (
                          formatExpiryDate(product.nearestExpiryDate)
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
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
          .print\\:grid-cols-5 {
            grid-template-columns: repeat(5, minmax(0, 1fr));
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

