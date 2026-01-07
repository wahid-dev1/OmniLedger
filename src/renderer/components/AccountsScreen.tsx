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
import { BookOpen, Plus, Loader2, Filter, Edit, Trash2, Search } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number | string;
  parentId?: string;
  parent?: {
    code: string;
    name: string;
  };
}

export function AccountsScreen() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadAccounts();
    }
  }, [companyId]);

  useEffect(() => {
    let filtered = accounts;
    
    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((account) => account.type === typeFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.code.toLowerCase().includes(query) ||
          a.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredAccounts(filtered);
  }, [typeFilter, searchQuery, accounts]);

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getAccounts(companyId!);

      if (result?.success && result.data) {
        setAccounts(result.data);
        setFilteredAccounts(result.data);
      } else {
        setError(result?.error || "Failed to load accounts");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account?")) {
      return;
    }

    try {
      const result = await (window as any).electronAPI?.deleteAccount(accountId);
      if (result?.success) {
        loadAccounts(); // Reload accounts
      } else {
        alert(result?.error || "Failed to delete account");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading accounts...</p>
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

  // Group accounts by type
  const accountsByType = filteredAccounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = [];
    }
    acc[account.type].push(account);
    return acc;
  }, {} as Record<string, Account[]>);

  const accountTypes = ["asset", "liability", "equity", "income", "expense"];

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen className="h-8 w-8" />
                Chart of Accounts
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your accounting accounts
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate(`/company/${companyId}/accounts/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                New Account
              </Button>
            </div>
          </div>

          {/* Filter Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by account code or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="typeFilter" className="whitespace-nowrap text-sm">
                    Type:
                  </Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger id="typeFilter" className="w-full">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="asset">Assets</SelectItem>
                      <SelectItem value="liability">Liabilities</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(typeFilter !== "all" || searchQuery.trim()) && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Showing {filteredAccounts.length} of {accounts.length} account{accounts.length !== 1 ? "s" : ""}
                </div>
              )}
            </CardContent>
          </Card>

          {filteredAccounts.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Accounts</CardTitle>
                <CardDescription>
                  {accounts.length === 0
                    ? "Create your first account to get started."
                    : typeFilter !== "all" || searchQuery.trim()
                    ? `No accounts found matching your filters.`
                    : "No accounts found."}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="space-y-6">
              {accountTypes.map((type) => {
                const typeAccounts = accountsByType[type] || [];
                if (typeAccounts.length === 0) return null;

                return (
                  <Card key={type}>
                    <CardHeader>
                      <CardTitle className="capitalize">{type} Accounts</CardTitle>
                      <CardDescription>
                        {typeAccounts.length} account{typeAccounts.length !== 1 ? "s" : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {typeAccounts.map((account) => {
                          const balance = typeof account.balance === 'number' 
                            ? account.balance 
                            : parseFloat(account.balance.toString());

                          return (
                            <div
                              key={account.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="font-mono font-semibold text-lg">
                                    {account.code}
                                  </div>
                                  <div>
                                    <p className="font-semibold">{account.name}</p>
                                    {account.parent && (
                                      <p className="text-xs text-muted-foreground">
                                        Parent: {account.parent.code} - {account.parent.name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Balance</p>
                                  <p className={`text-lg font-bold ${
                                    balance >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {format(Math.abs(balance))}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/company/${companyId}/accounts/${account.id}/edit`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(account.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

