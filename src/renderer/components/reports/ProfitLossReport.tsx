import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface ProfitLossReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number | string;
}

interface Transaction {
  id: string;
  amount: number | string;
  transactionDate: string;
  debitAccount: {
    code: string;
    name: string;
    type: string;
  };
  creditAccount: {
    code: string;
    name: string;
    type: string;
  };
}

export function ProfitLossReport({ companyId, dateRange, onPrintPDF }: ProfitLossReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [incomeAccounts, setIncomeAccounts] = useState<Account[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadData();
    }
  }, [companyId, dateRange]);

  const loadCompany = async () => {
    try {
      const result = await (window as any).electronAPI?.getCompany(companyId);
      if (result?.success && result.data) {
        setCompany({
          name: result.data.name,
          address: result.data.address,
          phone: result.data.phone,
          email: result.data.email,
        });
      }
    } catch (error) {
      console.error("Error loading company:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsResult, transactionsResult] = await Promise.all([
        (window as any).electronAPI?.getAccounts(companyId),
        (window as any).electronAPI?.getTransactions(companyId),
      ]);

      if (accountsResult?.success && accountsResult.data) {
        const allAccounts = accountsResult.data;
        setAccounts(allAccounts);

        // Filter income and expense accounts
        const income = allAccounts.filter((a: Account) => a.type === 'income');
        const expenses = allAccounts.filter((a: Account) => a.type === 'expense');
        setIncomeAccounts(income);
        setExpenseAccounts(expenses);
      }

      if (transactionsResult?.success && transactionsResult.data) {
        let filtered = transactionsResult.data;

        // Date filter
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((t: Transaction) => new Date(t.transactionDate) >= fromDate);
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter((t: Transaction) => new Date(t.transactionDate) <= toDate);
        }

        setTransactions(filtered);

        // Calculate totals from transactions
        let incomeTotal = 0;
        let expenseTotal = 0;

        filtered.forEach((t: Transaction) => {
          const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount.toString());

          // Income: credit to income account increases income
          if (t.creditAccount.type === 'income') {
            incomeTotal += amount;
          }
          // Expense: debit to expense account increases expenses
          if (t.debitAccount.type === 'expense') {
            expenseTotal += amount;
          }
        });

        setTotalIncome(incomeTotal);
        setTotalExpenses(expenseTotal);
        setNetProfit(incomeTotal - expenseTotal);
      }
    } catch (error) {
      console.error("Error loading profit & loss data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!company) return;

    const reportData = {
      title: "Profit & Loss Statement",
      company: company.name,
      address: company.address,
      phone: company.phone,
      email: company.email,
      dateRange: {
        from: dateRange.from ? new Date(dateRange.from).toLocaleDateString() : "All",
        to: dateRange.to ? new Date(dateRange.to).toLocaleDateString() : "All",
      },
      summary: {
        totalIncome: format(totalIncome),
        totalExpenses: format(totalExpenses),
        netProfit: format(netProfit),
      },
      income: incomeAccounts.map((a) => {
        const balance = typeof a.balance === 'number' ? a.balance : parseFloat(a.balance.toString());
        return {
          code: a.code,
          name: a.name,
          amount: format(Math.abs(balance)),
        };
      }),
      expenses: expenseAccounts.map((a) => {
        const balance = typeof a.balance === 'number' ? a.balance : parseFloat(a.balance.toString());
        return {
          code: a.code,
          name: a.name,
          amount: format(Math.abs(balance)),
        };
      }),
    };

    await generatePDFReport(reportData);
    setPreviewOpen(true);
  };

  // Register PDF handler
  useEffect(() => {
    (window as any).currentReportPDF = handlePrintPDF;
    return () => {
      delete (window as any).currentReportPDF;
    };
  }, [incomeAccounts, expenseAccounts, totalIncome, totalExpenses, netProfit, company, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{format(totalIncome)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{format(totalExpenses)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Net Profit/Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {format(Math.abs(netProfit))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {netProfit >= 0 ? 'Profit' : 'Loss'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Income Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomeAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No income accounts found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium">Account Code</th>
                        <th className="text-left p-3 text-sm font-medium">Account Name</th>
                        <th className="text-right p-3 text-sm font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeAccounts.map((account) => {
                        const balance = typeof account.balance === 'number' 
                          ? account.balance 
                          : parseFloat(account.balance.toString());
                        return (
                          <tr key={account.id} className="border-b">
                            <td className="p-3 text-sm font-mono">{account.code}</td>
                            <td className="p-3 text-sm">{account.name}</td>
                            <td className="p-3 text-sm text-right font-semibold text-green-600">
                              {format(Math.abs(balance))}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 font-bold">
                        <td colSpan={2} className="p-3 text-sm">Total Income</td>
                        <td className="p-3 text-sm text-right text-green-600">{format(totalIncome)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No expense accounts found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium">Account Code</th>
                        <th className="text-left p-3 text-sm font-medium">Account Name</th>
                        <th className="text-right p-3 text-sm font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseAccounts.map((account) => {
                        const balance = typeof account.balance === 'number' 
                          ? account.balance 
                          : parseFloat(account.balance.toString());
                        return (
                          <tr key={account.id} className="border-b">
                            <td className="p-3 text-sm font-mono">{account.code}</td>
                            <td className="p-3 text-sm">{account.name}</td>
                            <td className="p-3 text-sm text-right font-semibold text-red-600">
                              {format(Math.abs(balance))}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 font-bold">
                        <td colSpan={2} className="p-3 text-sm">Total Expenses</td>
                        <td className="p-3 text-sm text-right text-red-600">{format(totalExpenses)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Net Profit/Loss Summary */}
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Net Profit / Loss</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {dateRange.from && dateRange.to 
                    ? `${new Date(dateRange.from).toLocaleDateString()} - ${new Date(dateRange.to).toLocaleDateString()}`
                    : 'All Time'}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {format(Math.abs(netProfit))}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {netProfit >= 0 ? 'Profit' : 'Loss'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}



