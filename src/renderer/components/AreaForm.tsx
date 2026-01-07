import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Map, ArrowLeft, Loader2 } from "lucide-react";
import { AppLayout } from "./AppLayout";

export function AreaForm() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.code.trim()) {
      setError("Area code is required");
      return;
    }
    if (!formData.name.trim()) {
      setError("Area name is required");
      return;
    }

    setLoading(true);

    try {
      const data = {
        companyId: companyId!,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
      };

      const result = await (window as any).electronAPI?.createArea(data);

      if (result?.success) {
        navigate(`/company/${companyId}/customers`);
      } else {
        setError(result?.error || "Failed to create area");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error creating area:", error);
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
              onClick={() => navigate(`/company/${companyId}/customers`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Map className="h-8 w-8" />
                New Area Code
              </h1>
              <p className="text-muted-foreground mt-1">
                Add a new area code to categorize customers
              </p>
            </div>
          </div>

          {/* Area Form */}
          <Card>
            <CardHeader>
              <CardTitle>Area Information</CardTitle>
              <CardDescription>
                Enter area code and name
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
                  <Label htmlFor="code">
                    Area Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    placeholder="e.g., AREA-001"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    required
                    disabled={loading}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Area code will be automatically converted to uppercase
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Area Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Downtown"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                    disabled={loading}
                  />
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
                        Creating...
                      </>
                    ) : (
                      "Create Area"
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

