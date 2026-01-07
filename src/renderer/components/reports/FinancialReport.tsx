import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { generatePDFReport } from "@/lib/pdfGenerator";
import { PDFPreviewDialog } from "./PDFPreviewDialog";
import { useCompanyCurrency } from "../../hooks/useCompanyCurrency";

interface FinancialReportProps {
  companyId: string;
  dateRange: { from: string; to: string };
  onPrintPDF?: () => void;
}

interface Account {
  id: string;
  code: string;
  name: string;
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
}

export function FinancialReport({ companyId, dateRange }: FinancialReportProps) {
  const { format } = useCompanyCurrency(companyId);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [company, setCompany] = useState<{ name: string; address?: string; phone?: string; email?: string } | null>(null);
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [summary, setSummary] = useState({
    totalDebits: 0,
    totalCredits: 0,
    totalTransactions: 0,
  });
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (companyId) {
      loadAccounts();
    }
  }, [companyId]);

  useEffect(() => {
    let filtered = [...transactions];

    // Account filter
    if (accountFilter !== "all") {
      filtered = filtered.filter((t) => 
        t.debitAccount.id === accountFilter || t.creditAccount.id === accountFilter
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) =>
        t.transactionNumber.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.debitAccount.code.toLowerCase().includes(query) ||
        t.debitAccount.name.toLowerCase().includes(query) ||
        t.creditAccount.code.toLowerCase().includes(query) ||
        t.creditAccount.name.toLowerCase().includes(query)
      );
    }

    setFilteredTransactions(filtered);

    // Recalculate summary
    const summaryData = filtered.reduce(
      (acc: any, txn: Transaction) => {
        const amount = typeof txn.amount === 'number' 
          ? txn.amount 
          : parseFloat(txn.amount.toString());
        acc.totalDebits += amount;
        acc.totalCredits += amount;
        acc.totalTransactions += 1;
        return acc;
      },
      { totalDebits: 0, totalCredits: 0, totalTransactions: 0 }
    );
    setSummary(summaryData);
  }, [transactions, accountFilter, searchQuery]);

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const result = await (window as any).electronAPI?.getAccounts(companyId);
      if (result?.success && result.data) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const getTableData = () => {
    return filteredTransactions.map((txn) => {
      const amount = typeof txn.amount === 'number' 
        ? txn.amount 
        : parseFloat(txn.amount.toString());

      return {
        transactionNumber: txn.transactionNumber,
        date: new Date(txn.transactionDate).toLocaleDateString(),
        description: txn.description,
        debitAccount: `${txn.debitAccount.code} - ${txn.debitAccount.name}`,
        creditAccount: `${txn.creditAccount.code} - ${txn.creditAccount.name}`,
        amount: amount,
      };
    });
  };

  const getPDFOptions = () => {
    return {
      title: 'Financial Report',
      subtitle: 'Ledger Transactions',
      dateRange: dateRange,
      company: company || undefined,
      summary: [
        { label: 'Total Debits', value: format(summary.totalDebits) },
        { label: 'Total Credits', value: format(summary.totalCredits) },
        { label: 'Transactions', value: summary.totalTransactions },
      ],
      columns: [
        { header: 'TXN #', dataKey: 'transactionNumber', align: 'left' },
        { header: 'Date', dataKey: 'date', align: 'left' },
        { header: 'Description', dataKey: 'description', align: 'left' },
        { header: 'Debit Account', dataKey: 'debitAccount', align: 'left' },
        { header: 'Credit Account', dataKey: 'creditAccount', align: 'left' },
        { header: 'Amount', dataKey: 'amount', align: 'right' },
      ],
      data: getTableData(),
      footer: 'This report contains ledger transaction data only.',
    };
  };

  const handleShowPreview = () => {
    setPreviewOpen(true);
  };

  const handleGeneratePDF = () => {
    setPreviewOpen(false);
    generatePDFReport(getPDFOptions());
  };

  useEffect(() => {
    loadFinancialReport();
    loadCompany();
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

  // Expose PDF preview function
  useEffect(() => {
    (window as any).currentReportPDF = handleShowPreview;
    return () => {
      delete (window as any).currentReportPDF;
    };
  }, [filteredTransactions, summary, dateRange]);

  const loadFinancialReport = async () => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI?.getTransactions(companyId);
      
      if (result?.success && result.data) {
        const filteredTransactions = result.data.filter((txn: Transaction) => {
          const txnDate = new Date(txn.transactionDate);
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return txnDate >= fromDate && txnDate <= toDate;
        });

        setTransactions(filteredTransactions);
        setFilteredTransactions(filteredTransactions);
      }
    } catch (error) {
      console.error("Error loading financial report:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Report Header */}
      <div className="text-center border-b pb-4 print:border-b-2">
        <h2 className="text-2xl font-bold">Financial Report</h2>
        <p className="text-muted-foreground mt-1">
          Ledger Transactions: {new Date(dateRange.from).toLocaleDateString()} - {new Date(dateRange.to).toLocaleDateString()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Generated on {new Date().toLocaleString()}
        </p>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by transaction #, description, or account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Account Filter */}
            <div className="flex items-center gap-2">
              <Label htmlFor="accountFilter" className="whitespace-nowrap text-sm">
                Account:
              </Label>
              <Select value={accountFilter} onValueChange={setAccountFilter} disabled={loadingAccounts}>
                <SelectTrigger id="accountFilter" className="w-full">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{format(summary.totalDebits)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{format(summary.totalCredits)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{summary.totalTransactions}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b print:border-b-2">
                  <th className="text-left p-2 font-medium">TXN #</th>
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-left p-2 font-medium">Description</th>
                  <th className="text-left p-2 font-medium">Debit Account</th>
                  <th className="text-left p-2 font-medium">Credit Account</th>
                  <th className="text-right p-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No transactions found for the selected date range
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => {
                    const amount = typeof txn.amount === 'number' 
                      ? txn.amount 
                      : parseFloat(txn.amount.toString());

                    return (
                      <tr key={txn.id} className="border-b print:border-b">
                        <td className="p-2">{txn.transactionNumber}</td>
                        <td className="p-2">{new Date(txn.transactionDate).toLocaleDateString()}</td>
                        <td className="p-2">{txn.description}</td>
                        <td className="p-2">
                          {txn.debitAccount.code} - {txn.debitAccount.name}
                        </td>
                        <td className="p-2">
                          {txn.creditAccount.code} - {txn.creditAccount.name}
                        </td>
                        <td className="p-2 text-right">{format(amount)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="border-t-2 print:border-t-2 font-bold">
                <tr>
                  <td colSpan={5} className="p-2">Total</td>
                  <td className="p-2 text-right">{format(summary.totalDebits)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem;
          }
          .print\\:p-4 {
            padding: 1rem;
          }
          .print\\:border-b-2 {
            border-bottom-width: 2px;
          }
          .print\\:border-t-2 {
            border-top-width: 2px;
          }
          .print\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>

      {/* PDF Preview Dialog */}
      <PDFPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onGenerate={handleGeneratePDF}
        title={getPDFOptions().title}
        subtitle={getPDFOptions().subtitle}
        dateRange={getPDFOptions().dateRange}
        summary={getPDFOptions().summary}
        columns={getPDFOptions().columns}
        data={getPDFOptions().data}
      />
    </div>
  );
}

