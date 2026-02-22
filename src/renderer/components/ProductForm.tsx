import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ArrowLeft, Loader2, DollarSign, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppLayout } from "./AppLayout";

interface Vendor {
  id: string;
  name: string;
}

const UNIT_OPTIONS = ["pcs", "kg", "g", "liter", "ml", "box", "pack", "dozen", "meter", "sqm", "bottle", "can"];

interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  category: string;
  vendorId: string;
  trackByBatch: boolean;
  unitOfMeasurement: string;
  unitPrice: string;
  quantity: string;
}

export function ProductForm() {
  const { companyId, productId } = useParams<{ companyId: string; productId?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    sku: "",
    name: "",
    description: "",
    category: "",
    vendorId: "",
    trackByBatch: true,
    unitOfMeasurement: "pcs",
    unitPrice: "",
    quantity: "",
  });

  useEffect(() => {
    if (companyId) {
      loadVendors();
    }
    if (productId) {
      setIsEditMode(true);
      loadProduct();
    }
  }, [companyId, productId]);

  const loadVendors = async () => {
    setLoadingVendors(true);
    try {
      const result = await (window as any).electronAPI?.getVendors(companyId!);
      if (result?.success && result.data) {
        setVendors(result.data);
      }
    } catch (error) {
      console.error("Error loading vendors:", error);
    } finally {
      setLoadingVendors(false);
    }
  };

  const loadProduct = async () => {
    setLoadingProduct(true);
    try {
      const result = await (window as any).electronAPI?.getProduct(productId!);
      if (result?.success && result.data) {
        const product = result.data;
        setFormData({
          sku: product.sku || "",
          name: product.name || "",
          description: product.description || "",
          category: product.category || "",
          vendorId: product.vendor?.id || "",
          trackByBatch: product.trackByBatch !== false,
          unitOfMeasurement: product.unitOfMeasurement || "pcs",
          unitPrice: product.unitPrice != null ? String(product.unitPrice) : "",
          quantity: product.quantity != null ? String(product.quantity) : "",
        });
      } else {
        setError(result?.error || "Failed to load product");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading product:", error);
    } finally {
      setLoadingProduct(false);
    }
  };

  const categories = [
    "Beverages",
    "Confectionery",
    "Health",
    "Electronics",
    "Clothing",
    "Food",
    "Other",
  ];

  const handleChange = (field: keyof ProductFormData, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.sku.trim()) {
      setError("SKU is required");
      return;
    }
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isEditMode && productId) {
        // Update existing product
        result = await (window as any).electronAPI?.updateProduct(productId, {
          sku: formData.sku.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category || undefined,
          vendorId: formData.vendorId || undefined,
          trackByBatch: formData.trackByBatch,
          unitOfMeasurement: formData.unitOfMeasurement || undefined,
          unitPrice: !formData.trackByBatch && formData.unitPrice.trim()
            ? parseFloat(formData.unitPrice) : undefined,
        });
      } else {
        // Create new product
        result = await (window as any).electronAPI?.createProduct({
          companyId: companyId!,
          sku: formData.sku.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category || undefined,
          vendorId: formData.vendorId || undefined,
          trackByBatch: formData.trackByBatch,
          unitOfMeasurement: formData.unitOfMeasurement || undefined,
          unitPrice: !formData.trackByBatch && formData.unitPrice.trim()
            ? parseFloat(formData.unitPrice) : undefined,
          quantity: !formData.trackByBatch && formData.quantity.trim()
            ? parseInt(formData.quantity, 10) : undefined,
          availableQuantity: !formData.trackByBatch && formData.quantity.trim()
            ? parseInt(formData.quantity, 10) : undefined,
        });
      }

      if (result?.success) {
        // Navigate back to product detail if editing, or products list if creating
        if (isEditMode && productId) {
          navigate(`/company/${companyId}/products/${productId}`);
        } else {
          navigate(`/company/${companyId}/products`);
        }
      } else {
        setError(result?.error || `Failed to ${isEditMode ? 'update' : 'create'} product`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} product:`, error);
    } finally {
      setLoading(false);
    }
  };

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
                <Package className="h-8 w-8" />
                {isEditMode ? "Edit Product" : "New Product"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditMode ? "Update product information" : "Add a new product to your inventory"}
              </p>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                {isEditMode ? "Update the product details" : "Enter the details for the new product"}
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
                  <Label htmlFor="sku">
                    SKU <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sku"
                    placeholder="e.g., PROD-001"
                    value={formData.sku}
                    onChange={(e) => handleChange("sku", e.target.value)}
                    required
                    disabled={loading || loadingProduct || isEditMode}
                  />
                  {isEditMode && (
                    <p className="text-xs text-muted-foreground">
                      SKU cannot be changed after creation
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Unique product identifier
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Premium Coffee Beans"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                    disabled={loading || loadingProduct}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Product description..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    disabled={loading || loadingProduct}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleChange("category", value)}
                    disabled={loading || loadingProduct}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitOfMeasurement">Unit of measurement</Label>
                  <Select
                    value={formData.unitOfMeasurement || "pcs"}
                    onValueChange={(value) => handleChange("unitOfMeasurement", value)}
                    disabled={loading || loadingProduct}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How this product is measured (e.g., pcs, kg, liter)
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="trackByBatch">Inventory tracking</Label>
                      <Badge variant={formData.trackByBatch ? "secondary" : "outline"} className="text-xs">
                        {formData.trackByBatch ? "Batch" : "Item"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formData.trackByBatch
                        ? "Stock tracked per batch (expiry, manufacturing dates)."
                        : "Stock tracked at product level. Requires unit price for sales."}
                    </p>
                  </div>
                  <Switch
                    id="trackByBatch"
                    checked={formData.trackByBatch}
                    onCheckedChange={(checked) => handleChange("trackByBatch", !!checked)}
                    disabled={loading || loadingProduct}
                  />
                </div>

                {!formData.trackByBatch && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                    <Alert className="border-primary/30 bg-background">
                      <Layers className="h-4 w-4" />
                      <AlertDescription>
                        Item-level products need a default selling price and optional initial stock.
                      </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice" className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Unit price (retail)
                        </Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g., 29.99"
                          value={formData.unitPrice}
                          onChange={(e) => handleChange("unitPrice", e.target.value)}
                          disabled={loading || loadingProduct}
                        />
                        <p className="text-xs text-muted-foreground">
                          Default selling price (pre-filled in sales)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          Initial stock ({formData.unitOfMeasurement || "pcs"})
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.quantity}
                          onChange={(e) => handleChange("quantity", e.target.value)}
                          disabled={loading || loadingProduct}
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional; add more via purchases
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="vendorId">Vendor</Label>
                  <Select
                    value={formData.vendorId || "none"}
                    onValueChange={(value) => handleChange("vendorId", value === "none" ? "" : value)}
                    disabled={loading || loadingProduct || loadingVendors}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Vendor</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link this product to a vendor (optional)
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (isEditMode && productId) {
                        navigate(`/company/${companyId}/products/${productId}`);
                      } else {
                        navigate(`/company/${companyId}/products`);
                      }
                    }}
                    disabled={loading || loadingProduct}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || loadingProduct}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      isEditMode ? "Update Product" : "Create Product"
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

