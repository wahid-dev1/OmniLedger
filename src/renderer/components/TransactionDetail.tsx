import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, FileText, ArrowRight, Loader2, Receipt, BookOpen } from "lucide-react";
import { AppLayout } from "./AppLayout";
import { useCompanyCurrency } from "../hooks/useCompanyCurrency";

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
    type: string;
  };
  creditAccount: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  sale?: {
    id: string;
    saleNumber: string;
    totalAmount: number | string;
    saleDate: string;
    status?: string;
    paymentType?: string;
    customer?: {
      name: string;
      email?: string;
      phone?: string;
    };
  };
}

export function TransactionDetail() {
  const { companyId, transactionId } = useParams<{ companyId: string; transactionId: string }>();
  const navigate = useNavigate();
  const { format } = useCompanyCurrency(companyId);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transactionId && companyId) {
      loadTransactionDetail();
    }
  }, [transactionId, companyId]);

  const loadTransactionDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (window as any).electronAPI?.getTransaction(transactionId!);

      if (result?.success && result.data) {
        setTransaction(result.data);
      } else {
        setError(result?.error || "Failed to load transaction");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Error loading transaction detail:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading transaction details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !transaction) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Transaction not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(`/company/${companyId}/ledger`)}>
                Back to Ledger
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const amount = typeof transaction.amount === 'number' 
    ? transaction.amount 
    : parseFloat(transaction.amount.toString());

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/company/${companyId}/ledger`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FileText className="h-8 w-8" />
                {transaction.transactionNumber}
              </h1>
              <p className="text-muted-foreground mt-1">
                Transaction Details
              </p>
            </div>
          </div>

          {/* Transaction Information */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Date</p>
                  <p className="font-semibold">
                    {new Date(transaction.transactionDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Number</p>
                  <p className="font-semibold font-mono">{transaction.transactionNumber}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="font-semibold">{transaction.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold text-2xl">{format(amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Double-Entry Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Debit Account */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-green-600" />
                  Debit Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Account Code</p>
                  <p className="font-semibold font-mono text-lg">{transaction.debitAccount.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Name</p>
                  <p className="font-semibold text-lg">{transaction.debitAccount.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <p className="font-semibold capitalize">{transaction.debitAccount.type}</p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Debit Amount</p>
                  <p className="font-bold text-2xl text-green-600">{format(amount)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Credit Account */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-red-600 rotate-180" />
                  Credit Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Account Code</p>
                  <p className="font-semibold font-mono text-lg">{transaction.creditAccount.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Name</p>
                  <p className="font-semibold text-lg">{transaction.creditAccount.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <p className="font-semibold capitalize">{transaction.creditAccount.type}</p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Credit Amount</p>
                  <p className="font-bold text-2xl text-red-600">{format(amount)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linked Sale Information */}
          {transaction.sale && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-6 w-6" />
                  Linked Sale
                </CardTitle>
                <CardDescription>
                  This transaction was created from a sale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sale Number</p>
                      <p className="font-semibold text-lg font-mono">{transaction.sale.saleNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sale Date</p>
                      <p className="font-semibold">
                        {new Date(transaction.sale.saleDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {transaction.sale.customer && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Customer</p>
                      <p className="font-semibold text-lg">{transaction.sale.customer.name}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Sale Total Amount</p>
                    <p className="font-semibold text-2xl text-primary">
                      {format(typeof transaction.sale.totalAmount === 'number' 
                        ? transaction.sale.totalAmount
                        : parseFloat(transaction.sale.totalAmount.toString()))}
                    </p>
                  </div>

                  {transaction.sale.paymentType && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Payment Type</p>
                      <p className="font-semibold capitalize">
                        {transaction.sale.paymentType === 'cash' 
                          ? 'Cash (By Hand)' 
                          : transaction.sale.paymentType === 'bank'
                          ? 'Bank Transfer'
                          : 'COD (Cash on Delivery)'}
                      </p>
                    </div>
                  )}

                  {transaction.sale.status && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Sale Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        transaction.sale.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : transaction.sale.status === 'returned'
                          ? 'bg-red-100 text-red-800'
                          : transaction.sale.status === 'partial_return'
                          ? 'bg-orange-100 text-orange-800'
                          : transaction.sale.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.sale.status === 'partial_return' 
                          ? 'Partial Return' 
                          : transaction.sale.status === 'in_progress'
                          ? 'In Progress'
                          : transaction.sale.status.charAt(0).toUpperCase() + transaction.sale.status.slice(1)}
                      </span>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button
                      className="w-full"
                      onClick={() => navigate(`/company/${companyId}/sales/${transaction.sale!.id}`)}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      View Full Sale Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accounting Summary */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Double-Entry Summary</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Debit and Credit amounts must always balance
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-2xl font-bold">
                    {format(0)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">✓ Balanced</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

