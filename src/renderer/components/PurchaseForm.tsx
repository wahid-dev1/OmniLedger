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
import { ShoppingBag, ArrowLeft, Loader2, Plus, X, Trash2, Package, Building2 } from "lucide-react";
import { AppLayout } from "./AppLayout";

interface Product {
  id: string;
  sku: string;
  name: string;
  unitPrice: number | string;
}

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PurchaseItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  productName: string;
  productSku: string;
}

export function PurchaseForm() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("none");
  const [paymentType, setPaymentType] = useState<string>("cash");
  const [notes, setNotes] = useState<string>("");
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  useEffect(() => {
    // Recalculate total when items change
    const total = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
    setTotalAmount(total);
  }, [purchaseItems]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [productsResult, vendorsResult] = await Promise.all([
        (window as any).electronAPI?.getProducts(companyId!),
        (window as any).electronAPI?.getVendors(companyId!),
      ]);

      if (productsResult?.success && productsResult.data) {
        setProducts(productsResult.data);
      }

      if (vendorsResult?.success && vendorsResult.data) {
        setVendors(vendorsResult.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      {
        productId: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        batchNumber: "",
        manufacturingDate: "",
        expiryDate: "",
        productName: "",
        productSku: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // Start with 0 unit price - user must enter it manually
    // Prices are tracked at batch level, not product level
    const updatedItems = [...purchaseItems];
    updatedItems[index] = {
      ...updatedItems[index],
      productId,
      unitPrice: 0,
      productName: product.name,
      productSku: product.sku,
      totalPrice: 0,
      // Auto-generate batch number if empty
      batchNumber: updatedItems[index].batchNumber || `BATCH-${product.sku}-${Date.now()}`,
    };
    setPurchaseItems(updatedItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const qty = Math.max(1, quantity);
    const updatedItems = [...purchaseItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: qty,
      totalPrice: qty * updatedItems[index].unitPrice,
    };
    setPurchaseItems(updatedItems);
  };

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index] = {
      ...updatedItems[index],
      unitPrice,
      totalPrice: updatedItems[index].quantity * unitPrice,
    };
    setPurchaseItems(updatedItems);
  };

  const handleBatchNumberChange = (index: number, batchNumber: string) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index] = {
      ...updatedItems[index],
      batchNumber,
    };
    setPurchaseItems(updatedItems);
  };

  const handleDateChange = (index: number, field: "manufacturingDate" | "expiryDate", value: string) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setPurchaseItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (selectedVendorId === "none" || !selectedVendorId) {
      setError("Please select a vendor");
      return;
    }

    if (purchaseItems.length === 0) {
      setError("Please add at least one item to the purchase");
      return;
    }

    for (let i = 0; i < purchaseItems.length; i++) {
      const item = purchaseItems[i];
      if (!item.productId) {
        setError(`Item ${i + 1}: Please select a product`);
        return;
      }
      if (!item.batchNumber.trim()) {
        setError(`Item ${i + 1}: Batch number is required`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Item ${i + 1}: Quantity must be greater than 0`);
        return;
      }
      if (item.unitPrice <= 0) {
        setError(`Item ${i + 1}: Unit price must be greater than 0`);
        return;
      }
    }

    setLoading(true);

    try {
      const result = await (window as any).electronAPI?.createPurchase({
        companyId: companyId!,
        vendorId: selectedVendorId,
        paymentType,
        notes: notes.trim() || undefined,
        items: purchaseItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          batchNumber: item.batchNumber.trim(),
          manufacturingDate: item.manufacturingDate || undefined,
          expiryDate: item.expiryDate || undefined,
        })),
      });

      if (result?.success) {
        navigate(`/company/${companyId}/purchases`);
      } else {
        setError(result?.error || "Failed to create purchase");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error creating purchase:", error);
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
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/company/${companyId}/purchases`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ShoppingBag className="h-8 w-8" />
                New Purchase
              </h1>
              <p className="text-muted-foreground mt-1">
                Record a purchase from a vendor to add inventory
              </p>
            </div>
          </div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vendor and Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor">
                      Vendor <span className="text-destructive">*</span>
                    </Label>
                    <SearchableSelect
                      id="vendor"
                      value={selectedVendorId}
                      onValueChange={setSelectedVendorId}
                      placeholder="Select vendor"
                      searchPlaceholder="Search vendors..."
                    >
                      <SelectItem value="none">Select a vendor...</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {vendor.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SearchableSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentType">Payment Type</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger id="paymentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    type="text"
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Purchase Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Purchase Items</CardTitle>
                  <Button type="button" variant="outline" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                <CardDescription>
                  Add products to purchase. Each item will create a new batch in inventory.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {purchaseItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No items added yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {purchaseItems.map((item, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <h4 className="font-semibold">Item {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>
                                Product <span className="text-destructive">*</span>
                              </Label>
                              <SearchableSelect
                                value={item.productId}
                                onValueChange={(value) => handleProductChange(index, value)}
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

                            <div className="space-y-2">
                              <Label>
                                Batch Number <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="text"
                                placeholder="BATCH-001"
                                value={item.batchNumber}
                                onChange={(e) => handleBatchNumberChange(index, e.target.value)}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>
                                Quantity <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(index, parseInt(e.target.value) || 1)
                                }
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>
                                Unit Price <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUnitPriceChange(index, parseFloat(e.target.value) || 0)
                                }
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Manufacturing Date</Label>
                              <Input
                                type="date"
                                value={item.manufacturingDate}
                                onChange={(e) =>
                                  handleDateChange(index, "manufacturingDate", e.target.value)
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Expiry Date</Label>
                              <Input
                                type="date"
                                value={item.expiryDate}
                                onChange={(e) =>
                                  handleDateChange(index, "expiryDate", e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t">
                            <div className="flex justify-end">
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Item Total</p>
                                <p className="text-lg font-bold">${item.totalPrice.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total and Submit */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Purchase Amount</p>
                    <p className="text-3xl font-bold">${totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/company/${companyId}/purchases`)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || purchaseItems.length === 0 || selectedVendorId === "none"}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-4 w-4 mr-2" />
                          Create Purchase
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

