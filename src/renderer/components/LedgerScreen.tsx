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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { BookOpen, Calendar, ArrowRight, Loader2, FileText, RefreshCw, X, Search, Trash2 } from "lucide-react";
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
}

interface Transaction {
  id: string;
  transactionNumber: string;
  description: string;
  amount: number | string;
  transactionDate: string;
  debitAccount: {
    id: string;
    code: string;
    name: string;
  };
  creditAccount: {
    id: string;
    code: string;
    name: string;
  };
  sale?: {
    id: string;
    saleNumber: string;
  };
  purchase?: {
    id: string;
    purchaseNumber: string;
  };
}

export function LedgerScreen() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  useEffect(() => {
    let filtered = transactions;
    
    // Account filter
    if (selectedAccountId !== "all") {
      filtered = filtered.filter(
        (t) => t.debitAccount.id === selectedAccountId || t.creditAccount.id === selectedAccountId
      );
    }
    
    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((t) => new Date(t.transactionDate) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => new Date(t.transactionDate) <= toDate);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) => {
        // Search in transaction number
        if (t.transactionNumber.toLowerCase().includes(query)) return true;
        
        // Search in description
        if (t.description.toLowerCase().includes(query)) return true;
        
        // Search in debit account code and name
        if (
          t.debitAccount.code.toLowerCase().includes(query) ||
          t.debitAccount.name.toLowerCase().includes(query)
        ) return true;
        
        // Search in credit account code and name
        if (
          t.creditAccount.code.toLowerCase().includes(query) ||
          t.creditAccount.name.toLowerCase().includes(query)
        ) return true;
        
        // Search in sale number
        if (t.sale?.saleNumber.toLowerCase().includes(query)) return true;
        
        // Search in purchase number
        if (t.purchase?.purchaseNumber.toLowerCase().includes(query)) return true;
        
        return false;
      });
    }
    
    setFilteredTransactions(filtered);
  }, [selectedAccountId, dateFrom, dateTo, searchQuery, transactions]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [accountsResult, transactionsResult] = await Promise.all([
        (window as any).electronAPI?.getAccounts(companyId!),
        (window as any).electronAPI?.getTransactions(companyId!),
      ]);

      if (accountsResult?.success && accountsResult.data) {
        setAccounts(accountsResult.data);
      } else {
        setError(accountsResult?.error || "Failed to load accounts");
      }

      if (transactionsResult?.success && transactionsResult.data) {
        setTransactions(transactionsResult.data);
        setFilteredTransactions(transactionsResult.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading ledger data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateBalances = async () => {
    if (!confirm("This will recalculate all account balances from existing transactions. Continue?")) {
      return;
    }

    setRecalculating(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.recalculateAccountBalances(companyId!);
      
      if (result?.success) {
        // Reload data to show updated balances
        await loadData();
        alert(result.message || "Account balances recalculated successfully!");
      } else {
        setError(result?.error || "Failed to recalculate balances");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error recalculating balances:", error);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading ledger...</p>
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen className="h-8 w-8" />
                General Ledger
              </h1>
              <p className="text-muted-foreground mt-1">
                View all accounting transactions and account balances
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRecalculateBalances}
                disabled={recalculating || loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
                {recalculating ? "Recalculating..." : "Recalculate Balances"}
              </Button>
              <SearchableSelect
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                placeholder="Filter by account"
                searchPlaceholder="Search accounts..."
                className="w-[250px]"
              >
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SearchableSelect>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search Input */}
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-sm font-medium">
                    Search Transactions
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Search by transaction number, description, account, or reference..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Search across transaction numbers, descriptions, account codes/names, and sale/purchase references
                  </p>
                </div>

                {/* Date Range Filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
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
                  <div className="flex items-center justify-end">
                    {(searchQuery || dateFrom || dateTo || selectedAccountId !== "all") && (
                      <div className="text-sm text-muted-foreground">
                        Showing {filteredTransactions.length} of {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Summary - Hidden */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accounts.map((account) => {
              const balance = typeof account.balance === 'number' 
                ? account.balance 
                : parseFloat(account.balance.toString());
              
              return (
                <Card key={account.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {account.code}
                    </CardTitle>
                    <CardDescription className="text-xs">{account.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold truncate">{account.name}</p>
                    <p className={`text-2xl font-bold mt-2 ${
                      balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {format(Math.abs(balance))}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div> */}

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Transactions
                {selectedAccountId !== "all" && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({filteredTransactions.length} entries)
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Double-entry accounting transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium">Date</th>
                        <th className="text-left p-3 text-sm font-medium">Transaction #</th>
                        <th className="text-left p-3 text-sm font-medium">Description</th>
                        <th className="text-left p-3 text-sm font-medium">Debit Account</th>
                        <th className="text-left p-3 text-sm font-medium">Credit Account</th>
                        <th className="text-right p-3 text-sm font-medium">Amount</th>
                        <th className="text-left p-3 text-sm font-medium">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => {
                        const amount = typeof transaction.amount === 'number' 
                          ? transaction.amount 
                          : parseFloat(transaction.amount.toString());

                        return (
                          <tr 
                            key={transaction.id} 
                            className="border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => navigate(`/company/${companyId}/ledger/${transaction.id}`)}
                          >
                            <td className="p-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(transaction.transactionDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-3 text-sm font-mono">
                              {transaction.transactionNumber}
                            </td>
                            <td className="p-3 text-sm">{transaction.description}</td>
                            <td className="p-3 text-sm">
                              <div>
                                <span className="font-mono text-muted-foreground">
                                  {transaction.debitAccount.code}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {transaction.debitAccount.name}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sm">
                              <div>
                                <span className="font-mono text-muted-foreground">
                                  {transaction.creditAccount.code}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {transaction.creditAccount.name}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-right font-semibold">
                              {format(amount)}
                            </td>
                            <td className="p-3 text-sm">
                              {transaction.sale ? (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Sale: {transaction.sale.saleNumber}
                                </span>
                              ) : transaction.purchase ? (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Purchase: {transaction.purchase.purchaseNumber}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

