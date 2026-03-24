import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, Plus, Trash2, Edit, Search, Filter, Download } from "lucide-react";
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
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Vendors</h1>
              <p className="text-muted-foreground mt-1">
                Manage your vendor database
              </p>
            </div>
            <Button onClick={() => navigate(`/company/${companyId}/vendors/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Vendor
            </Button>
          </div>

          {/* Search Toolbar */}
          <div className="rounded-[10px] border border-gray-200 bg-muted/30 px-4 py-3 flex items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {searchQuery.trim() && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredVendors.length} of {vendors.length}
              </span>
            )}
            <Button variant="outline" size="sm" className="shrink-0">
              <Filter className="h-4 w-4 mr-1.5" />
              Filters
            </Button>
            <Button variant="outline" size="sm" className="shrink-0">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {filteredVendors.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <p className="text-muted-foreground text-base mb-4">
                  {vendors.length === 0 ? "No vendors yet." : `No vendors found matching "${searchQuery}".`}
                </p>
                {vendors.length === 0 && (
                  <Button onClick={() => navigate(`/company/${companyId}/vendors/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first vendor
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100">
                      <th className="text-left py-3 px-4 text-[13px] font-semibold uppercase tracking-wide text-gray-700">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-[13px] font-semibold uppercase tracking-wide text-gray-700">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-[13px] font-semibold uppercase tracking-wide text-gray-700">
                        Phone
                      </th>
                      <th className="text-left py-3 px-4 text-[13px] font-semibold uppercase tracking-wide text-gray-700">
                        Address
                      </th>
                      <th className="text-center py-3 px-4 text-[13px] font-semibold uppercase tracking-wide text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((vendor) => (
                      <tr
                        key={vendor.id}
                        className="border-b border-gray-100 last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/company/${companyId}/vendors/${vendor.id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 font-medium">
                            <Building2 className="h-[18px] w-[18px] text-muted-foreground opacity-70 shrink-0" />
                            {vendor.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {vendor.email || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {vendor.phone || "-"}
                        </td>
                        <td
                          className="py-3 px-4 text-sm text-muted-foreground max-w-[240px] whitespace-nowrap overflow-hidden text-ellipsis"
                          title={vendor.address || undefined}
                        >
                          {vendor.address || "-"}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit Vendor"
                              onClick={() => navigate(`/company/${companyId}/vendors/${vendor.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Delete Vendor"
                              onClick={() => handleDelete(vendor.id, vendor.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

