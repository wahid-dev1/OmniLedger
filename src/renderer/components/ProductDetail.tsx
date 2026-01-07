import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Boxes, Tag, ArrowLeft, Plus, Calendar, Loader2, Edit, Trash2, Search, Filter, X } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  availableQuantity: number;
  manufacturingDate?: string;
  expiryDate?: string;
  purchasePrice?: number | string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  vendor?: {
    id: string;
    name: string;
  };
}

export function ProductDetail() {
  const { companyId, productId } = useParams<{ companyId: string; productId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [product, setProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [stockStatus, setStockStatus] = useState<string>("all");
  const [expiryStatus, setExpiryStatus] = useState<string>("all");

  useEffect(() => {
    if (productId && companyId) {
      loadProductDetail();
    }
  }, [productId, companyId]);

  const loadProductDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const productResult = await (window as any).electronAPI?.getProduct(productId!);
      const batchesResult = await (window as any).electronAPI?.getBatches(productId!);

      if (productResult?.success && productResult.data) {
        setProduct(productResult.data);
      } else {
        setError(productResult?.error || "Failed to load product");
      }

      if (batchesResult?.success && batchesResult.data) {
        setBatches(batchesResult.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading product detail:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter batches based on filters
  const filteredBatches = useMemo(() => {
    let filtered = [...batches];

    // Search by batch number
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((batch) =>
        batch.batchNumber.toLowerCase().includes(query)
      );
    }

    // Filter by stock status
    if (stockStatus !== "all") {
      filtered = filtered.filter((batch) => {
        const available = batch.availableQuantity;
        const total = batch.quantity;
        const percentage = total > 0 ? (available / total) * 100 : 0;

        switch (stockStatus) {
          case "in_stock":
            return available > 0;
          case "low_stock":
            return available > 0 && available <= total * 0.2; // Less than 20% available
          case "out_of_stock":
            return available === 0;
          default:
            return true;
        }
      });
    }

    // Filter by expiry status
    if (expiryStatus !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((batch) => {
        if (!batch.expiryDate) {
          return expiryStatus === "no_date";
        }

        const expiryDate = new Date(batch.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        switch (expiryStatus) {
          case "expired":
            return daysUntilExpiry < 0;
          case "expiring_soon":
            return daysUntilExpiry >= 0 && daysUntilExpiry <= 30; // Within 30 days
          case "not_expired":
            return daysUntilExpiry > 30;
          case "no_date":
            return false;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [batches, searchQuery, stockStatus, expiryStatus]);

  const hasActiveFilters = searchQuery.trim() || stockStatus !== "all" || expiryStatus !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStockStatus("all");
    setExpiryStatus("all");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading product...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !product) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Product not found"}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/company/${companyId}/products`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Package className="h-8 w-8" />
                  {product.name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  SKU: {product.sku}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/company/${companyId}/products/${productId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
                    try {
                      const result = await (window as any).electronAPI?.deleteProduct(productId!);
                      if (result?.success) {
                        navigate(`/company/${companyId}/products`);
                      } else {
                        alert(result?.error || "Failed to delete product");
                      }
                    } catch (error) {
                      alert(error instanceof Error ? error.message : "Unknown error");
                    }
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Product
              </Button>
              <Button
                onClick={() =>
                  navigate(`/company/${companyId}/products/${productId}/batches/new`, {
                    state: { productId },
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Batch
              </Button>
            </div>
          </div>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-semibold">{product.sku}</p>
                </div>
                {product.category && (
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-semibold flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      {product.category}
                    </p>
                  </div>
                )}
                {product.vendor && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-semibold">{product.vendor.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Total Batches</p>
                  <p className="font-semibold flex items-center gap-2">
                    <Boxes className="h-4 w-4" />
                    {batches.length}
                  </p>
                </div>
              </div>
              {product.description && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{product.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batches */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Boxes className="h-6 w-6" />
                Batches
                {hasActiveFilters && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({filteredBatches.length} of {batches.length})
                  </span>
                )}
              </h2>
            </div>

            {/* Filters */}
            {batches.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <CardTitle className="text-lg">Filters</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search by Batch Number */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Search Batch Number
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search batches..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Stock Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Stock Status
                      </label>
                      <Select value={stockStatus} onValueChange={setStockStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="in_stock">In Stock</SelectItem>
                          <SelectItem value="low_stock">Low Stock</SelectItem>
                          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Expiry Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Expiry Status
                      </label>
                      <Select value={expiryStatus} onValueChange={setExpiryStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="expiring_soon">Expiring Soon (≤30 days)</SelectItem>
                          <SelectItem value="not_expired">Not Expired</SelectItem>
                          <SelectItem value="no_date">No Expiry Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear Filters */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground opacity-0">
                        Actions
                      </label>
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {batches.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Batches</CardTitle>
                  <CardDescription>
                    Add a batch to start tracking inventory for this product.
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
                          <th className="text-left p-4 font-semibold">Batch Number</th>
                          <th className="text-left p-4 font-semibold">Total Quantity</th>
                          <th className="text-left p-4 font-semibold">Available</th>
                          <th className="text-left p-4 font-semibold">Manufacturing Date</th>
                          <th className="text-left p-4 font-semibold">Expiry Date</th>
                          <th className="text-left p-4 font-semibold">Purchase Price</th>
                          <th className="text-right p-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBatches.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <Boxes className="h-8 w-8 opacity-50" />
                                <p>No batches match the current filters.</p>
                                {hasActiveFilters && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="mt-2"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Clear Filters
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredBatches.map((batch) => (
                          <tr key={batch.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Boxes className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{batch.batchNumber}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold">{batch.quantity}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold">{batch.availableQuantity}</span>
                            </td>
                            <td className="p-4">
                              {batch.manufacturingDate ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{new Date(batch.manufacturingDate).toLocaleDateString()}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              {batch.expiryDate ? (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{new Date(batch.expiryDate).toLocaleDateString()}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              {batch.purchasePrice ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold">
                                    {format(batch.purchasePrice)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/company/${companyId}/products/${productId}/batches/${batch.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Are you sure you want to delete batch "${batch.batchNumber}"? This action cannot be undone.`)) {
                                      try {
                                        const result = await (window as any).electronAPI?.deleteBatch(batch.id);
                                        if (result?.success) {
                                          loadProductDetail(); // Reload batches
                                        } else {
                                          alert(result?.error || "Failed to delete batch");
                                        }
                                      } catch (error) {
                                        alert(error instanceof Error ? error.message : "Unknown error");
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

