import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Mail, Phone, MapPin, Loader2, Plus, Trash2, Edit, Search } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { Input } from "@/components/ui/input";

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export function VendorsScreen() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadVendors();
    }
  }, [companyId]);

  const loadVendors = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getVendors(companyId!);
      
      if (result?.success && result.data) {
        setVendors(result.data);
        setFilteredVendors(result.data);
      } else {
        setError(result?.error || "Failed to load vendors");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vendorId: string, vendorName: string) => {
    if (!confirm(`Are you sure you want to delete "${vendorName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await (window as any).electronAPI?.deleteVendor(vendorId);
      if (result?.success) {
        loadVendors(); // Reload vendors
      } else {
        alert(result?.error || "Failed to delete vendor");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredVendors(
        vendors.filter(
          (v) =>
            v.name.toLowerCase().includes(query) ||
            (v.email && v.email.toLowerCase().includes(query)) ||
            (v.phone && v.phone.toLowerCase().includes(query))
        )
      );
    } else {
      setFilteredVendors(vendors);
    }
  }, [searchQuery, vendors]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading vendors...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error}</CardDescription>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              Vendors
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your vendor database
            </p>
          </div>
          <Button onClick={() => navigate(`/company/${companyId}/vendors/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Vendor
          </Button>
        </div>

        {/* Filter Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchQuery.trim() && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredVendors.length} of {vendors.length} vendor{vendors.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredVendors.length === 0 ? (
          <Card>
              <CardHeader>
                <CardTitle>No Vendors</CardTitle>
                <CardDescription>
                  {vendors.length === 0
                    ? "Get started by adding your first vendor."
                    : searchQuery.trim()
                    ? `No vendors found matching "${searchQuery}".`
                    : "No vendors found."}
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
                      <th className="text-left p-4 text-sm font-medium">Name</th>
                      <th className="text-left p-4 text-sm font-medium">Email</th>
                      <th className="text-left p-4 text-sm font-medium">Phone</th>
                      <th className="text-left p-4 text-sm font-medium">Address</th>
                      <th className="text-center p-4 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((vendor) => (
                      <tr
                        key={vendor.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/company/${companyId}/vendors/${vendor.id}`)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2 font-medium">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {vendor.name}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {vendor.email || "-"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {vendor.phone || "-"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                          {vendor.address || "-"}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/company/${companyId}/vendors/${vendor.id}/edit`);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(vendor.id, vendor.name);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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

