import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Calendar, User, Loader2, Plus, Filter, Wallet, CreditCard, Truck, Trash2, Search, X } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Area {
  id: string;
  code: string;
  name: string;
}

interface Sale {
  id: string;
  saleNumber: string;
  totalAmount: number | string; // Can be Decimal from Prisma
  paidAmount?: number | string;
  remainingBalance?: number;
  saleDate: string;
  status: string;
  paymentType: string;
  customer?: {
    name: string;
    email?: string;
    areaCode?: string;
  };
  _count: {
    items: number;
  };
}

type SaleStatus = "all" | "in_progress" | "completed" | "returned" | "partial_return";

export function SalesScreen() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [statusFilter, setStatusFilter] = useState<SaleStatus>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadSales();
      loadAreas();
    }
  }, [companyId]);

  const loadAreas = async () => {
    setLoadingAreas(true);
    try {
      const result = await (window as any).electronAPI?.getAreas(companyId!);
      if (result?.success && result.data) {
        console.log("✅ Areas loaded:", result.data.length);
        result.data.forEach((area: Area) => {
          console.log(`  Area: code="${area.code}", name="${area.name}"`);
        });
        setAreas(result.data);
      } else {
        console.error("❌ Failed to load areas:", result?.error);
      }
    } catch (error) {
      console.error("❌ Error loading areas:", error);
    } finally {
      setLoadingAreas(false);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getSales(companyId!);
      
      if (result?.success && result.data) {
        console.log("✅ Sales loaded:", result.data.length);
        // Debug: Check customer area codes
        const salesWithAreas = result.data.filter((s: Sale) => s.customer?.areaCode);
        console.log("📊 Sales with area codes:", salesWithAreas.length);
        if (salesWithAreas.length > 0) {
          const uniqueAreaCodes = [...new Set(salesWithAreas.map((s: Sale) => s.customer?.areaCode))];
          console.log("📍 Unique area codes in sales:", uniqueAreaCodes);
          salesWithAreas.slice(0, 3).forEach((sale: Sale) => {
            console.log(`  Sale ${sale.saleNumber}: Customer "${sale.customer?.name}", areaCode: "${sale.customer?.areaCode}"`);
          });
        }
        const salesWithoutArea = result.data.filter((s: Sale) => !s.customer?.areaCode);
        console.log("🚫 Sales without area codes:", salesWithoutArea.length);
        setSales(result.data);
        setFilteredSales(result.data);
      } else {
        setError(result?.error || "Failed to load sales");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading sales:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = sales;
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((sale) => sale.status === statusFilter);
    }
    
    // Payment type filter
    if (paymentTypeFilter !== "all") {
      filtered = filtered.filter((sale) => sale.paymentType === paymentTypeFilter);
    }
    
    // Area filter
    if (areaFilter !== "all") {
      console.log("Applying area filter:", areaFilter);
      console.log("Total sales before area filter:", filtered.length);
      
      if (areaFilter === "none") {
        // Filter sales with no customer or customer with no areaCode
        filtered = filtered.filter((sale) => {
          if (!sale.customer) {
            console.log(`Sale ${sale.saleNumber}: No customer - including`);
            return true;
          }
          const hasNoArea = !sale.customer.areaCode || sale.customer.areaCode === null || sale.customer.areaCode === "" || sale.customer.areaCode === undefined;
          if (hasNoArea) {
            console.log(`Sale ${sale.saleNumber}: Customer ${sale.customer.name} has no areaCode - including`);
          }
          return hasNoArea;
        });
      } else {
        // Filter sales by specific area code
        filtered = filtered.filter((sale) => {
          if (!sale.customer) {
            console.log(`Sale ${sale.saleNumber}: No customer - excluding`);
            return false;
          }
          if (!sale.customer.areaCode) {
            console.log(`Sale ${sale.saleNumber}: Customer ${sale.customer.name} has no areaCode - excluding`);
            return false;
          }
          const customerAreaCode = String(sale.customer.areaCode).trim();
          const filterAreaCode = String(areaFilter).trim();
          const matches = customerAreaCode === filterAreaCode;
          console.log(`Sale ${sale.saleNumber}: Customer ${sale.customer.name} areaCode="${customerAreaCode}" vs filter="${filterAreaCode}" -> ${matches ? 'MATCH' : 'NO MATCH'}`);
          return matches;
        });
      }
      
      console.log("Total sales after area filter:", filtered.length);
    }
    
    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((sale) => new Date(sale.saleDate) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((sale) => new Date(sale.saleDate) <= toDate);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((sale) =>
        sale.saleNumber.toLowerCase().includes(query) ||
        (sale.customer && sale.customer.name.toLowerCase().includes(query))
      );
    }
    
    setFilteredSales(filtered);
  }, [statusFilter, paymentTypeFilter, areaFilter, dateFrom, dateTo, searchQuery, sales]);

  const handleDelete = async (saleId: string, saleNumber: string) => {
    if (!confirm(`Are you sure you want to delete sale "${saleNumber}"? This will restore batch quantities. This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await (window as any).electronAPI?.deleteSale(saleId);
      if (result?.success) {
        loadSales(); // Reload sales
      } else {
        alert(result?.error || "Failed to delete sale");
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
          <p className="text-muted-foreground">Loading sales...</p>
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
              <ShoppingCart className="h-8 w-8" />
              Sales
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage your sales transactions
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SaleStatus)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="partial_return">Partial Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => navigate(`/company/${companyId}/sales/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* First Row: Search and Quick Filters */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by sale # or customer..."
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
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SaleStatus)}>
                    <SelectTrigger id="statusFilter" className="w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="partial_return">Partial Return</SelectItem>
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
                      <SelectItem value="cod">COD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Area Filter */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="areaFilter" className="whitespace-nowrap text-sm">
                    Area:
                  </Label>
                  <Select value={areaFilter} onValueChange={(value) => {
                    console.log("Area filter changed to:", value);
                    setAreaFilter(value);
                  }} disabled={loadingAreas}>
                    <SelectTrigger id="areaFilter" className="w-full">
                      <SelectValue placeholder="All" />
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
                  Showing {filteredSales.length} of {sales.length} sale{sales.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {filteredSales.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Sales</CardTitle>
              <CardDescription>
                {statusFilter === "all" 
                  ? "Sales transactions will appear here."
                  : `No sales found with status "${statusFilter}".`}
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
                      <th className="text-left p-4 text-sm font-medium">Sale #</th>
                      <th className="text-left p-4 text-sm font-medium">Date</th>
                      <th className="text-left p-4 text-sm font-medium">Customer</th>
                      <th className="text-left p-4 text-sm font-medium">Items</th>
                      <th className="text-left p-4 text-sm font-medium">Payment Type</th>
                      <th className="text-right p-4 text-sm font-medium">Total</th>
                      <th className="text-right p-4 text-sm font-medium">Paid</th>
                      <th className="text-right p-4 text-sm font-medium">Remaining</th>
                      <th className="text-left p-4 text-sm font-medium">Status</th>
                      <th className="text-center p-4 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((sale) => {
                      const totalAmount = typeof sale.totalAmount === 'number' 
                        ? sale.totalAmount 
                        : parseFloat(sale.totalAmount.toString());
                      const paidAmount = sale.paidAmount !== undefined 
                        ? (typeof sale.paidAmount === 'number' 
                          ? sale.paidAmount 
                          : parseFloat(sale.paidAmount.toString()))
                        : 0;
                      const remaining = sale.remainingBalance ?? (totalAmount - paidAmount);

                      return (
                        <tr
                          key={sale.id}
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/company/${companyId}/sales/${sale.id}`)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2 font-medium">
                              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                              {sale.saleNumber}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(sale.saleDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {sale.customer ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {sale.customer.name}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {sale._count.items}
                          </td>
                          <td className="p-4 text-sm">
                            <div className="flex items-center gap-2">
                              {sale.paymentType === 'cash' ? (
                                <>
                                  <Wallet className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Cash</span>
                                </>
                              ) : sale.paymentType === 'bank' ? (
                                <>
                                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">Bank</span>
                                </>
                              ) : (
                                <>
                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">COD</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right font-semibold">
                            {format(totalAmount)}
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-semibold text-green-600">
                              {format(paidAmount)}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {format(remaining)}
                              {remaining <= 0 && (
                                <span className="text-xs ml-1 text-muted-foreground">(Paid)</span>
                              )}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              sale.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : sale.status === 'returned'
                                ? 'bg-red-100 text-red-800'
                                : sale.status === 'partial_return'
                                ? 'bg-orange-100 text-orange-800'
                                : sale.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {sale.status === 'partial_return' 
                                ? 'Partial Return' 
                                : sale.status === 'in_progress'
                                ? 'In Progress'
                                : sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(sale.id, sale.saleNumber);
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

