import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { useAppStore } from "@/stores/useAppStore";
import { DEFAULT_CURRENCY } from "@shared/constants";
import { AppLayout } from "./AppLayout";
import { Trash2 } from "lucide-react";

const CURRENCIES = [
  { code: "PKR", label: "Pakistani Rupee (PKR)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "INR", label: "Indian Rupee (INR)" },
  { code: "AED", label: "UAE Dirham (AED)" },
  { code: "SAR", label: "Saudi Riyal (SAR)" },
];

export function CompanyConfiguration() {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { setCurrentCompany, setError, databaseConfig } = useAppStore();
  const isEditMode = Boolean(companyId);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(isEditMode);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    currency: DEFAULT_CURRENCY,
  });

  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  const loadCompany = async () => {
    if (!companyId) return;
    setLoadingCompany(true);
    try {
      const result = await (window as any).electronAPI?.getCompany(companyId);
      if (result?.success && result.data) {
        const c = result.data;
        setFormData({
          name: c.name || "",
          address: c.address || "",
          phone: c.phone || "",
          email: c.email || "",
          currency: c.currency || DEFAULT_CURRENCY,
        });
      } else {
        setError(result?.error || "Failed to load company");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load company");
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        setError("Company name is required");
        setIsLoading(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        currency: formData.currency || DEFAULT_CURRENCY,
      };

      const result = isEditMode
        ? await (window as any).electronAPI?.updateCompany(companyId!, payload)
        : await (window as any).electronAPI?.createCompany(payload);

      if (result?.success && result?.data) {
        setCurrentCompany(result.data);
        navigate(isEditMode ? `/company/${companyId}` : "/");
      } else {
        setError(result?.error || (isEditMode ? "Failed to update company" : "Failed to create company"));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : (isEditMode ? "Failed to update company" : "Failed to create company");
      setError(errorMessage);
      console.error("Error saving company:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!companyId) return;

    const ok = confirm(
      `Delete company "${formData.name || "this company"}"?\n\nThis will permanently delete ALL data for this company (products, batches, customers, vendors, accounts, sales, purchases, and transactions). This action cannot be undone.`
    );
    if (!ok) return;

    setIsDeleting(true);
    setError(null);
    try {
      const result = await (window as any).electronAPI?.deleteCompany(companyId);
      if (result?.success) {
        setCurrentCompany(null);
        navigate("/");
      } else {
        setError(result?.error || "Failed to delete company");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete company");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Check if database is configured (skip for edit mode - we're already in a company)
  if (!databaseConfig && !isEditMode) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration Required</CardTitle>
              <CardDescription>
                Please configure your database before creating a company.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/database/config")}>
                Configure Database
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadingCompany) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading company...</p>
        </div>
      </AppLayout>
    );
  }

  const formContent = (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit Company" : "New Company Configuration"}</CardTitle>
            <CardDescription>
              {isEditMode
                ? "Update your company details."
                : "Create a new company to start managing your inventory and accounting."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter company name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Enter company address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleChange("currency", value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(isEditMode ? `/company/${companyId}` : "/")}
                >
                  Cancel
                </Button>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteCompany}
                    disabled={isLoading || isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete Company"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      name: "",
                      address: "",
                      phone: "",
                      email: "",
                      currency: DEFAULT_CURRENCY,
                    });
                  }}
                  disabled={isDeleting}
                >
                  Clear
                </Button>
                <Button type="submit" disabled={isLoading || isDeleting || !formData.name.trim()}>
                  {isLoading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Company")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return isEditMode ? <AppLayout>{formContent}</AppLayout> : formContent;
}

