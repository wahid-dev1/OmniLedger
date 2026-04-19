import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, AlertTriangle, CheckCircle, Trash2, Edit, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "./AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  trackByBatch?: boolean;
  unitOfMeasurement?: string | null;
  unitPrice?: number | string | null;
  totalStock?: number;
  availableStock?: number;
  isInStock?: boolean;
  nearestExpiryDate?: string | null;
  hasExpiringSoon?: boolean;
  vendor?: {
    id: string;
    name: string;
  };
}

type StockFilter = "all" | "in_stock" | "out_of_stock" | "expiring_soon";

export function ProductsScreen() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { format } = useCompanyCurrency(companyId);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(() => {
    try {
      return !sessionStorage.getItem("products-scroll-hint-dismissed");
    } catch {
      return true;
    }
  });
  const [showRightGradient, setShowRightGradient] = useState(true);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  const handleTableScroll = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    setShowScrollHint(false);
    try {
      sessionStorage.setItem("products-scroll-hint-dismissed", "1");
    } catch {
      // sessionStorage may be unavailable (e.g. private mode); ignore.
    }
    const scrolledToEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setShowRightGradient(!scrolledToEnd);
  }, []);

  useEffect(() => {
    if (companyId) {
      loadProducts();
    }
  }, [companyId, location.pathname]);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el || loading || products.length === 0) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setShowRightGradient(hasOverflow);
  }, [loading, products.length]);

  useEffect(() => {
    // Filter products based on all filters
    let filtered = allProducts;
    
    // Stock status filter
    if (stockFilter === "in_stock") {
      filtered = filtered.filter(p => p.isInStock);
    } else if (stockFilter === "out_of_stock") {
      filtered = filtered.filter(p => !p.isInStock);
    } else if (stockFilter === "expiring_soon") {
      filtered = filtered.filter(p => p.hasExpiringSoon);
    }
    
    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }
    
    // Sort: Out of stock first, then expiring soon, then by name
    const sorted = [...filtered].sort((a, b) => {
      // Out of stock items first
      if (!a.isInStock && b.isInStock) return -1;
      if (a.isInStock && !b.isInStock) return 1;
      
      // Expiring soon items next
      if (a.hasExpiringSoon && !b.hasExpiringSoon) return -1;
      if (!a.hasExpiringSoon && b.hasExpiringSoon) return 1;
      
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
    
    setProducts(sorted);
  }, [stockFilter, categoryFilter, searchQuery, allProducts]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getProducts(companyId!);
      
      if (result?.success && result.data) {
        // Debug: Log first product to see what we're receiving
        if (result.data.length > 0) {
          console.log("Received product data:", {
            name: result.data[0].name,
            totalStock: result.data[0].totalStock,
            availableStock: result.data[0].availableStock,
            isInStock: result.data[0].isInStock,
            nearestExpiryDate: result.data[0].nearestExpiryDate,
            hasExpiringSoon: result.data[0].hasExpiringSoon,
          });
        }
        setAllProducts(result.data);
        setProducts(result.data);
      } else {
        setError(result?.error || "Failed to load products");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await (window as any).electronAPI?.deleteProduct(productId);
      if (result?.success) {
        loadProducts(); // Reload products
      } else {
        alert(result?.error || "Failed to delete product");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <Package className="h-6 w-6 sm:h-8 sm:w-8" />
              Products & Inventory
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm sm:text-base">
              Manage your product catalog and inventory
            </p>
          </div>
          <Button onClick={() => navigate(`/company/${companyId}/products/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          <Select
            value={stockFilter}
            onValueChange={(value) => setStockFilter(value as StockFilter)}
            disabled={loading}
          >
            <SelectTrigger id="stockFilter" className="w-[160px] shrink-0">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={loading}>
            <SelectTrigger id="categoryFilter" className="w-[180px] shrink-0">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Array.from(new Set(allProducts.map(p => p.category).filter(Boolean))).map(category => (
                <SelectItem key={category} value={category!}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(stockFilter !== "all" || categoryFilter !== "all" || searchQuery.trim()) && (
            <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
              {products.length} of {allProducts.length}
            </span>
          )}
        </div>

        {/* Table Container */}
        <div className="rounded-lg sm:rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
          {showScrollHint && !loading && products.length > 0 && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-b border-gray-100">
              Scroll horizontally to see more product details →
            </p>
          )}
          {loading ? (
            <div
              ref={tableScrollRef}
              className="products-table-scroll w-full relative"
              onScroll={handleTableScroll}
            >
              <div
                className="absolute right-0 top-0 h-full w-10 pointer-events-none z-10"
                style={{ background: "linear-gradient(to left, white, transparent)" }}
              />
              <table className="w-full min-w-[880px] sm:min-w-[1000px] md:min-w-[1200px]">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-[#f8fafc]">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky left-0 top-0 z-20 bg-[#f8fafc] min-w-[90px] sm:min-w-[120px] w-[90px] sm:w-[120px] border-r border-gray-100">SKU</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky left-[90px] sm:left-[120px] top-0 z-20 bg-[#f8fafc] min-w-[160px] sm:min-w-[240px] w-[160px] sm:w-[240px] border-r border-gray-100">Name</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky top-0 z-20 bg-[#f8fafc] min-w-[100px] sm:min-w-[140px]">Category</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky top-0 z-20 bg-[#f8fafc] min-w-[80px] sm:min-w-[100px]">Stock Status</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky top-0 z-20 bg-[#f8fafc] min-w-[70px] sm:min-w-[90px]">Available</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-500 sticky top-0 z-20 bg-[#f8fafc] min-w-[80px] sm:min-w-[120px]">Type</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-500 sticky top-0 z-20 bg-[#f8fafc] min-w-[60px] sm:min-w-[80px]">Unit</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-500 sticky top-0 z-20 bg-[#f8fafc] min-w-[90px] sm:min-w-[120px]">Vendor</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-500 sticky top-0 z-20 bg-[#f8fafc] min-w-[110px] sm:min-w-[140px]">Unit Price / Expiry</th>
                    <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky right-0 top-0 z-20 bg-[#f8fafc] min-w-[80px] sm:min-w-[100px] w-[80px] sm:w-[100px] border-l border-gray-200 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[90px] sm:min-w-[120px] w-[90px] sm:w-[120px] sticky left-0 z-10 bg-white border-r border-gray-100"><div className="h-4 w-16 sm:w-20 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[160px] sm:min-w-[240px] w-[160px] sm:w-[240px] sticky left-[90px] sm:left-[120px] z-10 bg-white border-r border-gray-100"><div className="h-4 w-24 sm:w-32 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[100px] sm:min-w-[140px]"><div className="h-4 w-12 sm:w-16 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right min-w-[80px] sm:min-w-[100px]"><div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse ml-auto" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right min-w-[70px] sm:min-w-[90px]"><div className="h-4 w-8 rounded bg-gray-200 animate-pulse ml-auto" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[80px] sm:min-w-[120px]"><div className="h-4 w-10 sm:w-12 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[60px] sm:min-w-[80px]"><div className="h-4 w-8 sm:w-10 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[90px] sm:min-w-[120px]"><div className="h-4 w-20 sm:w-24 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[110px] sm:min-w-[140px]"><div className="h-4 w-16 sm:w-20 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[80px] sm:min-w-[100px] w-[80px] sm:w-[100px] sticky right-0 z-10 bg-white border-l border-gray-100 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]"><div className="h-7 sm:h-8 w-12 sm:w-16 rounded bg-gray-200 animate-pulse mx-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 sm:py-16 px-4 sm:px-6 text-center">
              <p className="text-muted-foreground text-base mb-4">No products yet.</p>
              <Button onClick={() => navigate(`/company/${companyId}/products/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first product
              </Button>
            </div>
          ) : (
            <div
              ref={tableScrollRef}
              className="products-table-scroll w-full relative"
              onScroll={handleTableScroll}
            >
              {showRightGradient && (
                <div
                  className="absolute right-0 top-0 h-full w-10 pointer-events-none z-10"
                  style={{ background: "linear-gradient(to left, white, transparent)" }}
                />
              )}
              <table className="w-full min-w-[880px] sm:min-w-[1000px] md:min-w-[1200px]">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-[#f8fafc]">
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky left-0 top-0 z-20 bg-[#f8fafc] min-w-[90px] sm:min-w-[120px] w-[90px] sm:w-[120px] border-r border-gray-100">SKU</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky left-[90px] sm:left-[120px] top-0 z-20 bg-[#f8fafc] min-w-[160px] sm:min-w-[240px] w-[160px] sm:w-[240px] border-r border-gray-100">Name</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky top-0 z-20 bg-[#f8fafc] min-w-[100px] sm:min-w-[140px]">Category</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky top-0 z-20 bg-[#f8fafc] min-w-[80px] sm:min-w-[100px]">Stock Status</th>
                    <th className="text-right py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky top-0 z-20 bg-[#f8fafc] min-w-[70px] sm:min-w-[90px]">Available</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-500 sticky top-0 z-20 bg-[#f8fafc] min-w-[80px] sm:min-w-[120px]">Type</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-500 sticky top-0 z-20 bg-[#f8fafc] min-w-[60px] sm:min-w-[80px]">Unit</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-500 sticky top-0 z-20 bg-[#f8fafc] min-w-[90px] sm:min-w-[120px]">Vendor</th>
                    <th className="text-left py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-500 sticky top-0 z-20 bg-[#f8fafc] min-w-[110px] sm:min-w-[140px]">Unit Price / Expiry</th>
                    <th className="text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-[13px] font-semibold text-gray-800 sticky right-0 top-0 z-20 bg-[#f8fafc] min-w-[80px] sm:min-w-[100px] w-[80px] sm:w-[100px] border-l border-gray-200 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const availableStock = product.availableStock ?? 0;
                    const isInStock = product.isInStock ?? false;
                    const nearestExpiry = product.nearestExpiryDate
                      ? new Date(product.nearestExpiryDate)
                      : null;

                    let daysUntilExpiry: number | null = null;
                    if (nearestExpiry) {
                      const diffTime = nearestExpiry.getTime() - new Date().getTime();
                      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }

                    const rowBg = !isInStock ? "bg-red-50/50" : product.hasExpiringSoon ? "bg-yellow-50/50" : "bg-white";
                    const stickyCellBg = !isInStock ? "bg-red-50/50 group-hover:bg-[#f9fafb]" : product.hasExpiringSoon ? "bg-yellow-50/50 group-hover:bg-[#f9fafb]" : "bg-white group-hover:bg-[#f9fafb]";

                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-gray-100 last:border-b-0 group cursor-pointer transition-colors hover:bg-[#f9fafb] ${rowBg}`}
                        onClick={() => navigate(`/company/${companyId}/products/${product.id}`)}
                      >
                        <td className={`py-2 sm:py-2.5 px-2 sm:px-3 min-w-[90px] sm:min-w-[120px] w-[90px] sm:w-[120px] sticky left-0 z-10 border-r border-gray-100 ${stickyCellBg}`}>
                          <span className="font-medium text-xs sm:text-sm">{product.sku}</span>
                        </td>
                        <td className={`py-2 sm:py-2.5 px-2 sm:px-3 min-w-[160px] sm:min-w-[240px] w-[160px] sm:w-[240px] sticky left-[90px] sm:left-[120px] z-10 border-r border-gray-100 font-medium text-xs sm:text-sm ${stickyCellBg}`}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-muted-foreground shrink-0 opacity-70" />
                            {product.name}
                          </div>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                          {product.category ? (
                            <span className="text-gray-500">{product.category}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right min-w-[80px] sm:min-w-[100px]">
                          {isInStock ? (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
                              style={{
                                backgroundColor: "rgba(34,197,94,0.1)",
                                color: "#16a34a",
                              }}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              In Stock
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
                              style={{
                                backgroundColor: "rgba(239,68,68,0.1)",
                                color: "#dc2626",
                              }}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right min-w-[70px] sm:min-w-[90px]">
                          <span
                            className={`font-semibold ${isInStock ? "text-[#16a34a]" : "text-red-600"}`}
                          >
                            {availableStock}
                          </span>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 min-w-[80px] sm:min-w-[120px]">
                          {product.trackByBatch === false ? (
                            <Badge variant="outline" className="text-xs text-gray-500">Item</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs text-gray-500">Batch</Badge>
                          )}
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground min-w-[60px] sm:min-w-[80px]">
                          {product.unitOfMeasurement || "pcs"}
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm text-gray-500 min-w-[90px] sm:min-w-[120px]">
                          {product.vendor?.name ?? "—"}
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-xs sm:text-sm min-w-[110px] sm:min-w-[140px]">
                          {product.trackByBatch === false ? (
                            product.unitPrice != null ? (
                              <span className="font-medium">{format(product.unitPrice)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )
                          ) : nearestExpiry ? (
                            <div>
                              <div className="font-medium">
                                {nearestExpiry.toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                              {daysUntilExpiry !== null && (
                                <div
                                  className={`text-xs mt-0.5 ${
                                    daysUntilExpiry < 0
                                      ? "text-red-600 font-medium"
                                      : daysUntilExpiry <= 7
                                      ? "text-orange-600 font-medium"
                                      : daysUntilExpiry <= 30
                                      ? "text-amber-600"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {daysUntilExpiry < 0
                                    ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                                    : daysUntilExpiry === 0
                                    ? "Expires today"
                                    : daysUntilExpiry === 1
                                    ? "Expires tomorrow"
                                    : `${daysUntilExpiry} days left`
                                  }
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td
                          className={`py-2 sm:py-2.5 px-2 sm:px-3 min-w-[80px] sm:min-w-[100px] w-[80px] sm:w-[100px] sticky right-0 z-10 border-l border-gray-100 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] ${stickyCellBg}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit product"
                              onClick={() => navigate(`/company/${companyId}/products/${product.id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete product"
                              onClick={() => handleDelete(product.id, product.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </div>
    </AppLayout>
  );
}

