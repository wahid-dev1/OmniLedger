import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Boxes, ArrowLeft, Loader2, Package } from "lucide-react";
import { AppLayout } from "./AppLayout";

interface BatchFormData {
  batchNumber: string;
  quantity: string;
  availableQuantity: string;
  manufacturingDate: string;
  expiryDate: string;
  purchasePrice: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
}

export function BatchForm() {
  const { companyId, productId, batchId } = useParams<{ companyId: string; productId: string; batchId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<BatchFormData>({
    batchNumber: "",
    quantity: "",
    availableQuantity: "",
    manufacturingDate: "",
    expiryDate: "",
    purchasePrice: "",
  });

  // Get productId from URL params or location state
  const actualProductId = productId || (location.state as any)?.productId;
  const actualBatchId = batchId || (location.state as any)?.batchId;

  useEffect(() => {
    if (actualBatchId) {
      setIsEditMode(true);
      loadBatch();
    } else if (actualProductId && companyId) {
      loadProduct();
    }
  }, [actualBatchId, actualProductId, companyId]);

  const loadProduct = async () => {
    setLoadingProduct(true);
    try {
      const result = await (window as any).electronAPI?.getProduct(actualProductId);
      if (result?.success && result.data) {
        setProduct(result.data);
      } else {
        setError("Product not found");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoadingProduct(false);
    }
  };

  const loadBatch = async () => {
    setLoadingProduct(true);
    try {
      const batchResult = await (window as any).electronAPI?.getBatch(actualBatchId!);
      if (batchResult?.success && batchResult.data) {
        const batch = batchResult.data;
        setProduct(batch.product);
        
        // Format dates for input fields (YYYY-MM-DD)
        const formatDateForInput = (date: string | Date | null | undefined): string => {
          if (!date) return "";
          const d = date instanceof Date ? date : new Date(date);
          if (isNaN(d.getTime())) return "";
          return d.toISOString().split('T')[0];
        };

        setFormData({
          batchNumber: batch.batchNumber || "",
          quantity: String(batch.quantity || ""),
          availableQuantity: String(batch.availableQuantity || ""),
          manufacturingDate: formatDateForInput(batch.manufacturingDate),
          expiryDate: formatDateForInput(batch.expiryDate),
          purchasePrice: batch.purchasePrice ? String(batch.purchasePrice) : "",
        });
      } else {
        setError("Batch not found");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleChange = (field: keyof BatchFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.batchNumber.trim()) {
      setError("Batch number is required");
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      setError("Valid quantity is required");
      return;
    }
    if (!formData.availableQuantity || parseInt(formData.availableQuantity) <= 0) {
      setError("Valid available quantity is required");
      return;
    }
    if (parseInt(formData.availableQuantity) > parseInt(formData.quantity)) {
      setError("Available quantity cannot exceed total quantity");
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isEditMode && actualBatchId) {
        // Update existing batch
        result = await (window as any).electronAPI?.updateBatch(actualBatchId, {
          batchNumber: formData.batchNumber.trim(),
          quantity: parseInt(formData.quantity),
          availableQuantity: parseInt(formData.availableQuantity),
          manufacturingDate: formData.manufacturingDate || undefined,
          expiryDate: formData.expiryDate || undefined,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        });
      } else {
        // Create new batch
        result = await (window as any).electronAPI?.createBatch({
          companyId: companyId!,
          productId: actualProductId!,
          batchNumber: formData.batchNumber.trim(),
          quantity: parseInt(formData.quantity),
          availableQuantity: parseInt(formData.availableQuantity),
          manufacturingDate: formData.manufacturingDate || undefined,
          expiryDate: formData.expiryDate || undefined,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        });
      }

      if (result?.success) {
        // Navigate back to product detail
        navigate(`/company/${companyId}/products/${actualProductId || product?.id}`);
      } else {
        setError(result?.error || `Failed to ${isEditMode ? 'update' : 'create'} batch`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} batch:`, error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct) {
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

  if (!product) {
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
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
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
                <Boxes className="h-8 w-8" />
                {isEditMode ? "Edit Batch" : "New Batch"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditMode ? `Edit batch details for ${product.name}` : `Add a new batch for ${product.name}`}
              </p>
            </div>
          </div>

          {/* Product Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">SKU:</span>{" "}
                  <span className="text-sm text-muted-foreground">{product.sku}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Name:</span>{" "}
                  <span className="text-sm text-muted-foreground">{product.name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batch Form */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Information</CardTitle>
              <CardDescription>
                Enter batch details including quantities and dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="batchNumber">
                    Batch Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="batchNumber"
                    placeholder="e.g., BATCH-001"
                    value={formData.batchNumber}
                    onChange={(e) => handleChange("batchNumber", e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier for this batch
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">
                      Total Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="0"
                      value={formData.quantity}
                      onChange={(e) => handleChange("quantity", e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availableQuantity">
                      Available Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="availableQuantity"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.availableQuantity}
                      onChange={(e) => handleChange("availableQuantity", e.target.value)}
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantity available for sale
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
                    <Input
                      id="manufacturingDate"
                      type="date"
                      value={formData.manufacturingDate}
                      onChange={(e) => handleChange("manufacturingDate", e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => handleChange("expiryDate", e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Critical for inventory tracking
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.purchasePrice}
                    onChange={(e) => handleChange("purchasePrice", e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cost price for this batch (optional)
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/company/${companyId}/products/${actualProductId || product?.id}`)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      isEditMode ? "Update Batch" : "Create Batch"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

