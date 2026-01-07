import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ShoppingCart, ArrowLeft, Loader2, Plus, X, Trash2, Package } from "lucide-react";
import { AppLayout } from "./AppLayout";

interface Product {
  id: string;
  sku: string;
  name: string;
  unitPrice: number | string;
  batches: Batch[];
}

interface Batch {
  id: string;
  batchNumber: string;
  availableQuantity: number;
  quantity: number;
  expiryDate?: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface SaleItem {
  productId: string;
  batchId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productName: string;
  batchNumber: string;
}

export function SalesForm() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("none");
  const [paymentType, setPaymentType] = useState<string>("cash");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  useEffect(() => {
    // Recalculate total when items change
    const total = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
    setTotalAmount(total);
  }, [saleItems]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [productsResult, customersResult] = await Promise.all([
        (window as any).electronAPI?.getProductsWithBatches(companyId!),
        (window as any).electronAPI?.getCustomers(companyId!),
      ]);

      if (productsResult?.success && productsResult.data) {
        setProducts(productsResult.data);
      }

      if (customersResult?.success && customersResult.data) {
        setCustomers(customersResult.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddItem = () => {
    setSaleItems([
      ...saleItems,
      {
        productId: "",
        batchId: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        productName: "",
        batchNumber: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // Start with 0 unit price - user must enter it manually
    // Prices are tracked at batch level, not product level
    const updatedItems = [...saleItems];
    updatedItems[index] = {
      ...updatedItems[index],
      productId,
      batchId: "",
      unitPrice: 0,
      productName: product.name,
      batchNumber: "",
      totalPrice: 0,
    };
    setSaleItems(updatedItems);
  };

  const handleBatchChange = (index: number, batchId: string) => {
    const item = saleItems[index];
    const product = products.find((p) => p.id === item.productId);
    if (!product) return;

    const batch = product.batches.find((b) => b.id === batchId);
    if (!batch) return;

    const updatedItems = [...saleItems];
    updatedItems[index] = {
      ...updatedItems[index],
      batchId,
      batchNumber: batch.batchNumber,
      // Ensure quantity doesn't exceed available
      quantity: Math.min(updatedItems[index].quantity, batch.availableQuantity),
      totalPrice: updatedItems[index].quantity * updatedItems[index].unitPrice,
    };
    setSaleItems(updatedItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const item = saleItems[index];
    const product = products.find((p) => p.id === item.productId);
    if (!product || !item.batchId) return;

    const batch = product.batches.find((b) => b.id === item.batchId);
    if (!batch) return;

    const qty = Math.min(Math.max(1, quantity), batch.availableQuantity);

    const updatedItems = [...saleItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: qty,
      totalPrice: qty * updatedItems[index].unitPrice,
    };
    setSaleItems(updatedItems);
  };

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    const updatedItems = [...saleItems];
    updatedItems[index] = {
      ...updatedItems[index],
      unitPrice,
      totalPrice: updatedItems[index].quantity * unitPrice,
    };
    setSaleItems(updatedItems);
  };

  const getAvailableBatches = (productId: string): Batch[] => {
    const product = products.find((p) => p.id === productId);
    if (!product) return [];
    return product.batches.filter((b) => b.availableQuantity > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (saleItems.length === 0) {
      setError("Please add at least one item to the sale");
      return;
    }

    for (let i = 0; i < saleItems.length; i++) {
      const item = saleItems[i];
      if (!item.productId || !item.batchId) {
        setError(`Item ${i + 1}: Please select both product and batch`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Item ${i + 1}: Quantity must be greater than 0`);
        return;
      }

      const product = products.find((p) => p.id === item.productId);
      const batch = product?.batches.find((b) => b.id === item.batchId);
      if (batch && item.quantity > batch.availableQuantity) {
        setError(
          `Item ${i + 1}: Quantity (${item.quantity}) exceeds available quantity (${batch.availableQuantity})`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const result = await (window as any).electronAPI?.createSale({
        companyId: companyId!,
        customerId: selectedCustomerId && selectedCustomerId !== "none" ? selectedCustomerId : undefined,
        items: saleItems.map((item) => ({
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      if (result?.success) {
        navigate(`/company/${companyId}/sales`);
      } else {
        setError(result?.error || "Failed to create sale");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error creating sale:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading products and customers...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/company/${companyId}/sales`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ShoppingCart className="h-8 w-8" />
                New Sale
              </h1>
              <p className="text-muted-foreground mt-1">
                Create a new sales transaction with batch tracking
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <CardDescription>Select a customer (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer</Label>
                  <SearchableSelect
                    id="customer"
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                    disabled={loading}
                    placeholder="Select customer (optional)"
                    searchPlaceholder="Search customers..."
                  >
                    <SelectItem value="none">Walk-in Customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.phone && ` - ${customer.phone}`}
                      </SelectItem>
                    ))}
                  </SearchableSelect>
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Select
                    value={paymentType}
                    onValueChange={setPaymentType}
                    disabled={loading}
                  >
                    <SelectTrigger id="paymentType">
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash (By Hand)</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cod">COD (Cash on Delivery)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Sale Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sale Items</CardTitle>
                    <CardDescription>
                      Add products with batch selection for accurate inventory tracking
                    </CardDescription>
                  </div>
                  <Button type="button" onClick={handleAddItem} disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded mb-4">
                    {error}
                  </div>
                )}

                {saleItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items added yet. Click "Add Item" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {saleItems.map((item, index) => {
                      const availableBatches = getAvailableBatches(item.productId);
                      const selectedBatch = availableBatches.find((b) => b.id === item.batchId);

                      return (
                        <Card key={index} className="border-2">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">Item {index + 1}</CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Product Selection */}
                              <div className="space-y-2">
                                <Label>
                                  Product <span className="text-red-500">*</span>
                                </Label>
                                <SearchableSelect
                                  value={item.productId}
                                  onValueChange={(value) => handleProductChange(index, value)}
                                  disabled={loading}
                                  placeholder="Select product"
                                  searchPlaceholder="Search products..."
                                >
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} ({product.sku})
                                    </SelectItem>
                                  ))}
                                </SearchableSelect>
                              </div>

                              {/* Batch Selection */}
                              <div className="space-y-2">
                                <Label>
                                  Batch <span className="text-red-500">*</span>
                                </Label>
                                <SearchableSelect
                                  value={item.batchId}
                                  onValueChange={(value) => handleBatchChange(index, value)}
                                  disabled={loading || !item.productId}
                                  placeholder="Select batch"
                                  searchPlaceholder="Search batches..."
                                >
                                  {availableBatches.length === 0 ? (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      No available batches
                                    </div>
                                  ) : (
                                    availableBatches.map((batch) => (
                                      <SelectItem key={batch.id} value={batch.id}>
                                        {batch.batchNumber} (Available: {batch.availableQuantity}
                                        {batch.expiryDate &&
                                          `, Exp: ${new Date(batch.expiryDate).toLocaleDateString()}`}
                                        )
                                      </SelectItem>
                                    ))
                                  )}
                                </SearchableSelect>
                                {selectedBatch && (
                                  <p className="text-xs text-muted-foreground">
                                    Available: {selectedBatch.availableQuantity} units
                                  </p>
                                )}
                              </div>

                              {/* Quantity */}
                              <div className="space-y-2">
                                <Label>
                                  Quantity <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max={selectedBatch?.availableQuantity || 0}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(index, parseInt(e.target.value) || 1)
                                  }
                                  disabled={loading || !item.batchId}
                                  required
                                />
                              </div>

                              {/* Unit Price */}
                              <div className="space-y-2">
                                <Label>
                                  Unit Price <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleUnitPriceChange(index, parseFloat(e.target.value) || 0)
                                  }
                                  disabled={loading}
                                  required
                                />
                              </div>
                            </div>

                            {/* Total Price for Item */}
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Item Total:</span>
                                <span className="text-lg font-bold">
                                  ${item.totalPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total and Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-2xl font-bold">Total Amount:</span>
                  <span className="text-3xl font-bold text-primary">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/company/${companyId}/sales`)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || saleItems.length === 0}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Create Sale"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

