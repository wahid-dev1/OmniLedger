import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        {/* Summary Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Total Income
                  </span>
                </TableHead>
                <TableHead className="text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Total Expenses
                  </span>
                </TableHead>
                <TableHead className="text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Net Profit/Loss
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-2xl font-bold text-green-600">{format(totalIncome)}</TableCell>
                <TableCell className="text-2xl font-bold text-red-600">{format(totalExpenses)}</TableCell>
                <TableCell>
                  <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {format(Math.abs(netProfit))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {netProfit >= 0 ? 'Profit' : 'Loss'}
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Income Section */}
        <div className="rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Income
            </h3>
          </div>
          {incomeAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No income accounts found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeAccounts.map((account) => {
                  const balance = typeof account.balance === 'number' 
                    ? account.balance 
                    : parseFloat(account.balance.toString());
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {format(Math.abs(balance))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Total Income</TableCell>
                  <TableCell className="text-right font-bold text-green-600">{format(totalIncome)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>

        {/* Expenses Section */}
        <div className="rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Expenses
            </h3>
          </div>
          {expenseAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No expense accounts found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseAccounts.map((account) => {
                  const balance = typeof account.balance === 'number' 
                    ? account.balance 
                    : parseFloat(account.balance.toString());
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {format(Math.abs(balance))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Total Expenses</TableCell>
                  <TableCell className="text-right font-bold text-red-600">{format(totalExpenses)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>

        {/* Net Profit/Loss Summary */}
        <div className="rounded-lg border bg-muted">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>
                  <p className="text-lg font-semibold">Net Profit / Loss</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dateRange.from && dateRange.to 
                      ? `${new Date(dateRange.from).toLocaleDateString()} - ${new Date(dateRange.to).toLocaleDateString()}`
                      : 'All Time'}
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {format(Math.abs(netProfit))}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {netProfit >= 0 ? 'Profit' : 'Loss'}
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <PDFPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}



