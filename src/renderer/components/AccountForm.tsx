import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, ArrowLeft, Loader2 } from "lucide-react";
import { AppLayout } from "./AppLayout";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
}

export function AccountForm() {
  const { companyId, accountId } = useParams<{ companyId: string; accountId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(!!accountId);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "asset",
    parentId: "none",
  });

  useEffect(() => {
    if (companyId) {
      loadAccounts();
    }
    if (accountId && companyId) {
      loadAccount();
    }
  }, [accountId, companyId]);

  const loadAccounts = async () => {
    try {
      const result = await (window as any).electronAPI?.getAccounts(companyId!);
      if (result?.success && result.data) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  };

  const loadAccount = async () => {
    setLoadingAccount(true);
    try {
      const result = await (window as any).electronAPI?.getAccount(accountId!);
      if (result?.success && result.data) {
        const account = result.data;
        setFormData({
          code: account.code,
          name: account.name,
          type: account.type,
          parentId: account.parentId || "none",
        });
      } else {
        setError(result?.error || "Account not found");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoadingAccount(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.code.trim()) {
      setError("Account code is required");
      return;
    }
    if (!formData.name.trim()) {
      setError("Account name is required");
      return;
    }

    setLoading(true);

    try {
      const data = {
        companyId: companyId!,
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type,
        parentId: formData.parentId && formData.parentId !== "none" ? formData.parentId : undefined,
      };

      let result;
      if (accountId) {
        result = await (window as any).electronAPI?.updateAccount(accountId, data);
      } else {
        result = await (window as any).electronAPI?.createAccount(data);
      }

      if (result?.success) {
        navigate(`/company/${companyId}/accounts`);
      } else {
        setError(result?.error || `Failed to ${accountId ? "update" : "create"} account`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error(`Error ${accountId ? "updating" : "creating"} account:`, error);
    } finally {
      setLoading(false);
    }
  };

  if (loadingAccount) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading account...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/company/${companyId}/accounts`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen className="h-8 w-8" />
                {accountId ? "Edit Account" : "New Account"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {accountId ? "Update account information" : "Create a new accounting account"}
              </p>
            </div>
          </div>

          {/* Account Form */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Enter account details for the chart of accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">
                      Account Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="code"
                      placeholder="e.g., 1000"
                      value={formData.code}
                      onChange={(e) => handleChange("code", e.target.value)}
                      required
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Unique code for this account
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">
                      Account Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleChange("type", value)}
                      disabled={loading}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Account Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Cash, Sales Revenue, etc."
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent Account (Optional)</Label>
                  <Select
                    value={formData.parentId}
                    onValueChange={(value) => handleChange("parentId", value)}
                    disabled={loading}
                  >
                    <SelectTrigger id="parentId">
                      <SelectValue placeholder="Select parent account (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {accounts
                        .filter((acc) => acc.id !== accountId)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link to a parent account for hierarchical organization
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/company/${companyId}/accounts`)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {accountId ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      accountId ? "Update Account" : "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

