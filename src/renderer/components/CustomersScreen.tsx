import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Loader2, Plus, Map, Trash2, Edit, Search } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { Input } from "@/components/ui/input";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Area {
  id: string;
  code: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  areaCode?: string;
  area?: Area;
  totalAmount?: number;
  paidAmount?: number;
  remainingBalance?: number;
}

export function CustomersScreen() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaCode, setSelectedAreaCode] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadCustomers();
      loadAreas();
    }
  }, [companyId]);

  useEffect(() => {
    let filtered = allCustomers;
    
    // Area filter
    if (selectedAreaCode !== "all") {
      if (selectedAreaCode === "none") {
        filtered = filtered.filter(c => !c.areaCode);
      } else {
        filtered = filtered.filter(c => c.areaCode === selectedAreaCode);
      }
    }
    
    // Balance filter
    if (balanceFilter === "with_balance") {
      filtered = filtered.filter(c => (c.remainingBalance ?? 0) > 0);
    } else if (balanceFilter === "paid_full") {
      filtered = filtered.filter(c => (c.remainingBalance ?? 0) <= 0);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query))
      );
    }
    
    setCustomers(filtered);
  }, [selectedAreaCode, balanceFilter, searchQuery, allCustomers]);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getCustomers(companyId!);
      
      if (result?.success && result.data) {
        setAllCustomers(result.data);
        setCustomers(result.data);
      } else {
        setError(result?.error || "Failed to load customers");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async (customerId: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete "${customerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await (window as any).electronAPI?.deleteCustomer(customerId);
      if (result?.success) {
        loadCustomers(); // Reload customers
      } else {
        alert(result?.error || "Failed to delete customer");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8" />
              Customers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your customer database
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/company/${companyId}/areas/new`)}
            >
              <Map className="h-4 w-4 mr-2" />
              New Area
            </Button>
            <Button onClick={() => navigate(`/company/${companyId}/customers/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Area Filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="areaFilter" className="whitespace-nowrap text-sm">
                  Area:
                </Label>
                <Select
                  value={selectedAreaCode}
                  onValueChange={setSelectedAreaCode}
                  disabled={loadingAreas}
                >
                  <SelectTrigger id="areaFilter" className="w-full">
                    <SelectValue placeholder="All Areas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    <SelectItem value="none">No Area</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.code}>
                        {area.code} - {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Balance Filter */}
              <div className="flex items-center gap-2">
                <Label htmlFor="balanceFilter" className="whitespace-nowrap text-sm">
                  Balance:
                </Label>
                <Select
                  value={balanceFilter}
                  onValueChange={setBalanceFilter}
                >
                  <SelectTrigger id="balanceFilter" className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="with_balance">With Outstanding Balance</SelectItem>
                    <SelectItem value="paid_full">Paid in Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(selectedAreaCode !== "all" || balanceFilter !== "all" || searchQuery.trim()) && (
              <div className="mt-4 text-sm text-muted-foreground">
                Showing {customers.length} of {allCustomers.length} customer{allCustomers.length !== 1 ? "s" : ""}
              </div>
            )}
          </CardContent>
        </Card>

        {customers.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedAreaCode !== "all" ? "No Customers Found" : "No Customers"}
              </CardTitle>
              <CardDescription>
                {selectedAreaCode !== "all"
                  ? `No customers found for the selected area. Try selecting a different area or create a new customer.`
                  : "Get started by adding your first customer."}
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
                      <th className="text-left p-4 text-sm font-medium">Area</th>
                      <th className="text-right p-4 text-sm font-medium">Paid</th>
                      <th className="text-right p-4 text-sm font-medium">Remaining</th>
                      <th className="text-center p-4 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/company/${companyId}/customers/${customer.id}`)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2 font-medium">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {customer.name}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {customer.email || "-"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {customer.phone || "-"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                          {customer.address || "-"}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {customer.area ? `${customer.area.code} - ${customer.area.name}` : "-"}
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold text-green-600">
                            {format(customer.paidAmount ?? 0)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`font-semibold ${(customer.remainingBalance ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {format(customer.remainingBalance ?? 0)}
                            {(customer.remainingBalance ?? 0) <= 0 && (customer.paidAmount ?? 0) > 0 && (
                              <span className="text-xs ml-1 text-muted-foreground">(Paid)</span>
                            )}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/company/${companyId}/customers/${customer.id}/edit`);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(customer.id, customer.name);
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

