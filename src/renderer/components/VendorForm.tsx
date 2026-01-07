import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, ArrowLeft, Loader2 } from "lucide-react";
import { AppLayout } from "./AppLayout";

export function VendorForm() {
  const { companyId, vendorId } = useParams<{ companyId: string; vendorId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingVendor, setLoadingVendor] = useState(!!vendorId);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (vendorId && companyId) {
      loadVendor();
    }
  }, [vendorId, companyId]);

  const loadVendor = async () => {
    setLoadingVendor(true);
    try {
      const result = await (window as any).electronAPI?.getVendor(vendorId!);
      if (result?.success && result.data) {
        const vendor = result.data;
        setFormData({
          name: vendor.name || "",
          email: vendor.email || "",
          phone: vendor.phone || "",
          address: vendor.address || "",
        });
      } else {
        setError(result?.error || "Vendor not found");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoadingVendor(false);
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
      setError("Vendor name is required");
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
      };

      let result;
      if (vendorId) {
        result = await (window as any).electronAPI?.updateVendor(vendorId, data);
      } else {
        result = await (window as any).electronAPI?.createVendor(data);
      }

      if (result?.success) {
        navigate(`/company/${companyId}/vendors`);
      } else {
        setError(result?.error || `Failed to ${vendorId ? "update" : "create"} vendor`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error(`Error ${vendorId ? "updating" : "creating"} vendor:`, error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingVendor) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading vendor...</p>
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
              onClick={() => navigate(`/company/${companyId}/vendors`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                {vendorId ? "Edit Vendor" : "New Vendor"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {vendorId ? "Update vendor information" : "Add a new vendor to your database"}
              </p>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
              <CardDescription>
                Enter the vendor's details below
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Vendor Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter vendor name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vendor@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1-555-0000"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="Street, City, State, ZIP"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/company/${companyId}/vendors`)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !formData.name.trim()}>
                    {loading ? "Saving..." : vendorId ? "Update Vendor" : "Create Vendor"}
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

