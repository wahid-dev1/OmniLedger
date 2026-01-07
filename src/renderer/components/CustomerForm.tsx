import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ArrowLeft, Loader2 } from "lucide-react";
import { AppLayout } from "./AppLayout";

interface Area {
  id: string;
  code: string;
  name: string;
}

export function CustomerForm() {
  const { companyId, customerId } = useParams<{ companyId: string; customerId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(!!customerId);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    areaCode: "",
  });

  useEffect(() => {
    if (companyId) {
      loadAreas();
    }
    if (customerId && companyId) {
      loadCustomer();
    }
  }, [customerId, companyId]);

  const loadAreas = async () => {
    setLoadingAreas(true);
    try {
      const result = await (window as any).electronAPI?.getAreas(companyId!);
      if (result?.success && result.data) {
        setAreas(result.data);
      }
    } catch (error) {
      console.error("Error loading areas:", error);
    } finally {
      setLoadingAreas(false);
    }
  };

  const loadCustomer = async () => {
    setLoadingCustomer(true);
    try {
      const result = await (window as any).electronAPI?.getCustomer(customerId!);
      if (result?.success && result.data) {
        const customer = result.data;
        setFormData({
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
          areaCode: customer.areaCode || customer.area?.code || "",
        });
      } else {
        setError(result?.error || "Customer not found");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Customer name is required");
      return;
    }

    setLoading(true);

    try {
      const data = {
        companyId: companyId!,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        areaCode: formData.areaCode && formData.areaCode !== "none" ? formData.areaCode : undefined,
      };

      let result;
      if (customerId) {
        result = await (window as any).electronAPI?.updateCustomer(customerId, data);
      } else {
        result = await (window as any).electronAPI?.createCustomer(data);
      }

      if (result?.success) {
        navigate(`/company/${companyId}/customers`);
      } else {
        setError(result?.error || `Failed to ${customerId ? "update" : "create"} customer`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error(`Error ${customerId ? "updating" : "creating"} customer:`, error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingCustomer) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading customer...</p>
          </div>
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
              onClick={() => navigate(`/company/${companyId}/customers`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Users className="h-8 w-8" />
                {customerId ? "Edit Customer" : "New Customer"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {customerId ? "Update customer information" : "Add a new customer to your system"}
              </p>
            </div>
          </div>

          {/* Customer Form */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>
                Enter customer details
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
                  <Label htmlFor="name">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., John Doe"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g., john.doe@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., +1-555-0123"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="e.g., 123 Main Street, City, State 12345"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaCode">Area Code</Label>
                  <Select
                    value={formData.areaCode || "none"}
                    onValueChange={(value) => handleChange("areaCode", value)}
                    disabled={loading || loadingAreas}
                  >
                    <SelectTrigger id="areaCode">
                      <SelectValue placeholder="Select an area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Area</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.code}>
                          {area.code} - {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/company/${companyId}/customers`)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {customerId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      customerId ? "Update Customer" : "Create Customer"
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

