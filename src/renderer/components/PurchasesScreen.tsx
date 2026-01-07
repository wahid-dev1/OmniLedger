import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Calendar, Building2, Loader2, Plus, Trash2, Search, X } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Purchase {
  id: string;
  purchaseNumber: string;
  totalAmount: number | string;
  purchaseDate: string;
  status: string;
  paymentType: string;
  vendor?: {
    name: string;
    email?: string;
  };
  _count: {
    items: number;
  };
}

export function PurchasesScreen() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Purchase[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadPurchases();
    }
  }, [companyId]);

  const loadPurchases = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getPurchases(companyId!);
      
      if (result?.success && result.data) {
        setPurchases(result.data);
        setFilteredPurchases(result.data);
      } else {
        setError(result?.error || "Failed to load purchases");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (purchaseId: string, purchaseNumber: string) => {
    if (!confirm(`Are you sure you want to delete purchase "${purchaseNumber}"? This will delete associated batches if they haven't been used in sales. This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await (window as any).electronAPI?.deletePurchase(purchaseId);
      if (result?.success) {
        loadPurchases(); // Reload purchases
      } else {
        alert(result?.error || "Failed to delete purchase");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error");
    }
  };

  useEffect(() => {
    let filtered = purchases;
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    
    // Payment type filter
    if (paymentTypeFilter !== "all") {
      filtered = filtered.filter((p) => p.paymentType === paymentTypeFilter);
    }
    
    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((p) => new Date(p.purchaseDate) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => new Date(p.purchaseDate) <= toDate);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.purchaseNumber.toLowerCase().includes(query) ||
        (p.vendor && p.vendor.name.toLowerCase().includes(query))
      );
    }
    
    setFilteredPurchases(filtered);
  }, [statusFilter, paymentTypeFilter, dateFrom, dateTo, searchQuery, purchases]);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading purchases...</p>
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
              <ShoppingBag className="h-8 w-8" />
              Purchases
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage vendor purchases and inventory additions
            </p>
          </div>
          <Button onClick={() => navigate(`/company/${companyId}/purchases/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>

        {/* Filter Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* First Row: Search and Quick Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by purchase # or vendor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="statusFilter" className="whitespace-nowrap text-sm">
                    Status:
                  </Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="statusFilter" className="w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Payment Type Filter */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="paymentFilter" className="whitespace-nowrap text-sm">
                    Payment:
                  </Label>
                  <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                    <SelectTrigger id="paymentFilter" className="w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Second Row: Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="dateFrom" className="whitespace-nowrap text-sm">
                    From Date:
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1"
                  />
                  {dateFrom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateFrom("")}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="dateTo" className="whitespace-nowrap text-sm">
                    To Date:
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1"
                  />
                  {dateTo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateTo("")}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {(statusFilter !== "all" || paymentTypeFilter !== "all" || dateFrom || dateTo || searchQuery.trim()) && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredPurchases.length} of {purchases.length} purchase{purchases.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredPurchases.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Purchases</CardTitle>
              <CardDescription>
                Purchase transactions will appear here.
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
                      <th className="text-left p-4 text-sm font-medium">Purchase #</th>
                      <th className="text-left p-4 text-sm font-medium">Date</th>
                      <th className="text-left p-4 text-sm font-medium">Vendor</th>
                      <th className="text-left p-4 text-sm font-medium">Items</th>
                      <th className="text-left p-4 text-sm font-medium">Payment Type</th>
                      <th className="text-right p-4 text-sm font-medium">Total</th>
                      <th className="text-left p-4 text-sm font-medium">Status</th>
                      <th className="text-center p-4 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.map((purchase) => {
                      const totalAmount = typeof purchase.totalAmount === 'number' 
                        ? purchase.totalAmount 
                        : parseFloat(purchase.totalAmount.toString());

                      return (
                        <tr
                          key={purchase.id}
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/company/${companyId}/purchases/${purchase.id}`)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2 font-medium">
                              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                              {purchase.purchaseNumber}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(purchase.purchaseDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {purchase.vendor ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {purchase.vendor.name}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {purchase._count.items}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {purchase.paymentType === 'cash' 
                              ? 'Cash' 
                              : purchase.paymentType === 'bank'
                              ? 'Bank'
                              : 'Credit'}
                          </td>
                          <td className="p-4 text-right font-semibold">
                            {format(totalAmount)}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              purchase.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : purchase.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : purchase.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(purchase.id, purchase.purchaseNumber);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

