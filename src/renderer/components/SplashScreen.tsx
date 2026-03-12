import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import type { Company } from "@shared/types";
import { Building2, Plus, Database, Loader2, Sparkles, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SAMPLE_CATEGORY_OPTIONS, type SampleCategory } from "@shared/sample-categories";

export function SplashScreen() {
  const navigate = useNavigate();
  const { databaseConfig, setDatabaseConfig, setCurrentCompany, setLoading, setError } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleCategory, setSampleCategory] = useState<SampleCategory>("grocery");
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [hasCheckedCompanies, setHasCheckedCompanies] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // If no database config, redirect to landing page
    if (!databaseConfig) {
      navigate("/", { replace: true });
      return;
    }

    // Set a timeout to ensure we show something even if the API call hangs
    const timeout = setTimeout(() => {
      if (!hasCheckedCompanies) {
        setInitError("Timeout waiting for database connection");
        setLoadingCompanies(false);
        setHasCheckedCompanies(true);
      }
    }, 5000); // 5 second timeout
    
    loadCompanies().finally(() => {
      clearTimeout(timeout);
    });
    
    return () => clearTimeout(timeout);
  }, [databaseConfig, navigate]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    setError(null);

    try {
      // Check if electronAPI is available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).electronAPI) {
        console.error("electronAPI is not available!");
        setError("Electron API is not available. Please ensure the app is running in Electron.");
        setLoadingCompanies(false);
        setHasCheckedCompanies(true);
        return;
      }

      // Call IPC to get companies from main process
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).electronAPI.getCompanies();
      
      if (result?.success && result.data) {
        // Map Prisma data to Company type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedCompanies: Company[] = result.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          address: c.address || undefined,
          phone: c.phone || undefined,
          email: c.email || undefined,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        }));
        setCompanies(mappedCompanies);
      } else {
        setError(result?.error || "Failed to load companies");
      setCompanies([]);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load companies";
      setError(errorMessage);
      console.error("Error loading companies:", error);
    } finally {
      setLoadingCompanies(false);
      setHasCheckedCompanies(true);
    }
  };

  const handleCompanySelect = (company: Company) => {
    setCurrentCompany(company);
    navigate(`/company/${company.id}`);
  };

  const handleNewCompany = () => {
    navigate("/company/new");
  };

  const handleConfigureDatabase = () => {
    navigate("/database/config");
  };

  const handleLoadSampleCompany = async (loadAll = false) => {
    if (!databaseConfig) return;
    setLoadingSample(true);
    setSampleError(null);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).electronAPI?.seedDatabase(databaseConfig, loadAll ? { all: true } : { category: sampleCategory });
      if (result?.success) {
        await loadCompanies();
      } else {
        setSampleError(result?.error || "Failed to load sample company");
      }
    } catch (error) {
      setSampleError(error instanceof Error ? error.message : "Failed to load sample company");
    } finally {
      setLoadingSample(false);
    }
  };

  // Show loading state while checking for companies
  if (!hasCheckedCompanies || loadingCompanies) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          {initError ? (
            <>
              <p className="text-destructive font-bold">{initError}</p>
              <p className="text-muted-foreground">Please check your database configuration.</p>
            </>
          ) : (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Loading companies...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // If no database config, redirect (handled in useEffect, but show loading in case)
  if (!databaseConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If database config exists, show companies or option to create new
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">OmniLedger</h1>
          <p className="text-muted-foreground text-lg">
            Desktop Inventory & Accounting System
          </p>
        </div>

        {companies.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Companies</h2>
              <Button onClick={handleNewCompany}>
                <Plus className="h-4 w-4 mr-2" />
                New Company
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <Card
                  key={company.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleCompanySelect(company)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                        <CardTitle className="text-lg truncate">{company.name}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/company/${company.id}/edit`);
                        }}
                        title="Edit company"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {company.address && (
                        <p className="truncate">{company.address}</p>
                      )}
                      {company.phone && <p>{company.phone}</p>}
                      {company.email && (
                        <p className="truncate">{company.email}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {company.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle>No Companies Found</CardTitle>
                  <CardDescription>
                    Get started by creating your first company.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A company is required to organize your inventory, sales, and
                  accounting data. Each company maintains its own separate
                  records.
                </p>
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
                  <Select value={sampleCategory} onValueChange={(v) => setSampleCategory(v as SampleCategory)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAMPLE_CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => handleLoadSampleCompany(false)}
                    disabled={loadingSample}
                  >
                    {loadingSample ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Load Sample Company
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => handleLoadSampleCompany(true)}
                    disabled={loadingSample}
                  >
                    {loadingSample ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Load All Sample Companies
                  </Button>
                  <Button onClick={handleNewCompany}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Company
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {sampleError && (
          <div className="mt-4 mx-auto max-w-xl p-3 bg-destructive/10 text-destructive text-sm rounded-md text-center">
            {sampleError}
          </div>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Select value={sampleCategory} onValueChange={(v) => setSampleCategory(v as SampleCategory)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {SAMPLE_CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => handleLoadSampleCompany(false)}
            disabled={loadingSample}
            className="flex items-center gap-2"
          >
            {loadingSample ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Load Sample Company
          </Button>
          <Button
            variant="default"
            onClick={() => handleLoadSampleCompany(true)}
            disabled={loadingSample}
            className="flex items-center gap-2"
          >
            {loadingSample ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Load All Sample Companies
          </Button>
          <Button
            variant="outline"
            onClick={handleConfigureDatabase}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Database Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

