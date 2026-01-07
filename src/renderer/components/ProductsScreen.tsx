import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Tag, Loader2, Plus, AlertTriangle, CheckCircle, Calendar, Filter, Trash2, Edit, Search } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
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

  useEffect(() => {
    if (companyId) {
      loadProducts();
    }
  }, [companyId, location.pathname]); // Reload when pathname changes (e.g., returning from form)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

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
      <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Package className="h-8 w-8" />
              Products & Inventory
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your product catalog and inventory
            </p>
          </div>
          <Button onClick={() => navigate(`/company/${companyId}/products/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </div>

        {/* Filter Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Stock Filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="stockFilter" className="whitespace-nowrap text-sm">
                  Stock:
                </Label>
                <Select
                  value={stockFilter}
                  onValueChange={(value) => setStockFilter(value as StockFilter)}
                >
                  <SelectTrigger id="stockFilter" className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
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
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger id="categoryFilter" className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.from(new Set(allProducts.map(p => p.category).filter(Boolean))).map(category => (
                      <SelectItem key={category} value={category!}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(stockFilter !== "all" || categoryFilter !== "all" || searchQuery.trim()) && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {products.length} of {allProducts.length} product{allProducts.length !== 1 ? "s" : ""}
              </div>
            )}
          </CardContent>
        </Card>

        {products.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Products</CardTitle>
              <CardDescription>
                Get started by adding your first product.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 text-sm font-medium">SKU</th>
                      <th className="text-left p-4 text-sm font-medium">Name</th>
                      <th className="text-left p-4 text-sm font-medium">Category</th>
                      <th className="text-left p-4 text-sm font-medium">Vendor</th>
                      <th className="text-right p-4 text-sm font-medium">Stock Status</th>
                      <th className="text-right p-4 text-sm font-medium">Available</th>
                      <th className="text-left p-4 text-sm font-medium">Nearest Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const availableStock = product.availableStock ?? 0;
                      const isInStock = product.isInStock ?? false;
                      const nearestExpiry = product.nearestExpiryDate 
                        ? new Date(product.nearestExpiryDate)
                        : null;
                      
                      // Calculate days until expiry
                      let daysUntilExpiry: number | null = null;
                      if (nearestExpiry) {
                        const diffTime = nearestExpiry.getTime() - new Date().getTime();
                        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      }

                      return (
                        <tr
                          key={product.id}
                          className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                            !isInStock ? 'bg-red-50/50' : product.hasExpiringSoon ? 'bg-yellow-50/50' : ''
                          }`}
                          onClick={() => navigate(`/company/${companyId}/products/${product.id}`)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2 font-medium">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              {product.sku}
                            </div>
                          </td>
                          <td className="p-4 font-medium">
                            {product.name}
                          </td>
                          <td className="p-4 text-sm">
                            {product.category ? (
                              <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{product.category}</span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-4 text-sm">
                            {product.vendor ? (
                              <span className="text-muted-foreground">{product.vendor.name}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {isInStock ? (
                              <div className="flex items-center justify-end gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-semibold">In Stock</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-semibold">Out of Stock</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-semibold ${isInStock ? 'text-green-600' : 'text-red-600'}`}>
                              {availableStock}
                            </span>
                          </td>
                          <td className="p-4 text-sm">
                            {nearestExpiry ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {nearestExpiry.toLocaleDateString()}
                                  </div>
                                  {daysUntilExpiry !== null && (
                                    <div className={`text-xs ${
                                      daysUntilExpiry < 0 
                                        ? 'text-red-600 font-semibold' 
                                        : daysUntilExpiry <= 7 
                                        ? 'text-orange-600 font-semibold'
                                        : daysUntilExpiry <= 30
                                        ? 'text-yellow-600'
                                        : 'text-muted-foreground'
                                    }`}>
                                      {daysUntilExpiry < 0 
                                        ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                                        : daysUntilExpiry === 0
                                        ? 'Expires today'
                                        : daysUntilExpiry === 1
                                        ? 'Expires tomorrow'
                                        : `${daysUntilExpiry} days left`
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/company/${companyId}/products/${product.id}`);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(product.id, product.name);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </AppLayout>
  );
}

