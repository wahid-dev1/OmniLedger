import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Package, ShoppingCart, Users, TrendingUp, Boxes, FileText } from "lucide-react";
import { Loader2 } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface CompanyStats {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  _count?: {
    users: number;
    products: number;
    batches: number;
    sales: number;
    customers: number;
    vendors: number;
    accounts: number;
    transactions: number;
  };
}

export function Dashboard() {
  const { companyId } = useParams<{ companyId: string }>();
  const { format } = useCompanyCurrency(companyId);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadCompanyStats();
    }
  }, [companyId]);

  const loadCompanyStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getCompany(companyId!);
      
      if (result?.success && result.data) {
        // Validate that _count exists, if not, log a warning
        if (!result.data._count) {
          console.warn("Company data missing _count property:", result.data);
          // Set default counts if missing
          result.data._count = {
            users: 0,
            products: 0,
            batches: 0,
            sales: 0,
            customers: 0,
            vendors: 0,
            accounts: 0,
            transactions: 0,
          };
        }
        setStats(result.data);
      } else {
        setError(result?.error || "Failed to load company data");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading company stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Company not found"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Safely get count values with defaults
  const counts = stats._count || {
    users: 0,
    products: 0,
    batches: 0,
    sales: 0,
    customers: 0,
    vendors: 0,
    accounts: 0,
    transactions: 0,
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              {stats.name}
            </h1>
            {stats.address && (
              <p className="text-muted-foreground mt-1">{stats.address}</p>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.products}</div>
              <p className="text-xs text-muted-foreground">
                {counts.batches} batches tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.sales}</div>
              <p className="text-xs text-muted-foreground">
                Total transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.customers}</div>
              <p className="text-xs text-muted-foreground">
                Active customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accounts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.accounts}</div>
              <p className="text-xs text-muted-foreground">
                Chart of accounts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Batches</span>
                  <span className="font-semibold">{counts.batches}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Products</span>
                  <span className="font-semibold">{counts.products}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Customers</span>
                  <span className="font-semibold">{counts.customers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vendors</span>
                  <span className="font-semibold">{counts.vendors}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Transactions</span>
                  <span className="font-semibold">{counts.transactions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Accounts</span>
                  <span className="font-semibold">{counts.accounts}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}

