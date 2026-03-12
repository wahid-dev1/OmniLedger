import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import type { Company } from "@shared/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanyCard, SearchBar, SystemSetupPanel } from "./companies";
import type { SampleCategory } from "@shared/sample-categories";

export function SplashScreen() {
  const navigate = useNavigate();
  const { databaseConfig, setCurrentCompany, setError } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleCategory, setSampleCategory] = useState<SampleCategory>("grocery");
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [hasCheckedCompanies, setHasCheckedCompanies] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!databaseConfig) {
      navigate("/", { replace: true });
      return;
    }

    const timeout = setTimeout(() => {
      if (!hasCheckedCompanies) {
        setInitError("Timeout waiting for database connection");
        setLoadingCompanies(false);
        setHasCheckedCompanies(true);
      }
    }, 5000);

    loadCompanies().finally(() => {
      clearTimeout(timeout);
    });

    return () => clearTimeout(timeout);
  }, [databaseConfig, navigate]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    setError(null);

    try {
      if (!(window as any).electronAPI) {
        setError("Electron API is not available.");
        setCompanies([]);
        return;
      }

      const result = await (window as any).electronAPI.getCompanies();

      if (result?.success && result.data) {
        const mappedCompanies: Company[] = result.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          address: c.address || undefined,
          phone: c.phone || undefined,
          email: c.email || undefined,
          currency: c.currency || "PKR",
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        }));
        setCompanies(mappedCompanies);
      } else {
        setError(result?.error || "Failed to load companies");
        setCompanies([]);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load companies"
      );
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
      setHasCheckedCompanies(true);
    }
  };

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase() ?? "").includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [companies, searchQuery]);

  const handleCompanySelect = (company: Company) => {
    setCurrentCompany(company);
    navigate(`/company/${company.id}`);
  };

  const handleNewCompany = () => {
    navigate("/company/new");
  };

  const handleEditCompany = (company: Company) => {
    navigate(`/company/${company.id}/edit`);
  };

  const handleDuplicateCompany = (company: Company) => {
    navigate("/company/new", { state: { copyFrom: company } });
  };

  const handleRequestDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
  };

  const handleConfirmDelete = async () => {
    if (!companyToDelete) return;
    setDeleting(true);
    try {
      const result = await (window as any).electronAPI?.deleteCompany(
        companyToDelete.id
      );
      if (result?.success) {
        await loadCompanies();
        setCompanyToDelete(null);
      } else {
        setError(result?.error || "Failed to delete company");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete company"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setCompanyToDelete(null);
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
      const result = await (window as any).electronAPI?.seedDatabase(
        databaseConfig,
        loadAll ? { all: true } : { category: sampleCategory }
      );
      if (result?.success) {
        await loadCompanies();
      } else {
        setSampleError(result?.error || "Failed to load sample company");
      }
    } catch (error) {
      setSampleError(
        error instanceof Error ? error.message : "Failed to load sample company"
      );
    } finally {
      setLoadingSample(false);
    }
  };

  if (!hasCheckedCompanies || loadingCompanies) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          {initError ? (
            <>
              <p className="font-bold text-destructive">{initError}</p>
              <p className="text-muted-foreground">
                Please check your database configuration.
              </p>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading companies...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!databaseConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasCompanies = companies.length > 0;
  const hasFilteredResults = filteredCompanies.length > 0;

  return (
    <div className="min-h-screen bg-background p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Compact header */}
        <header className="mb-6">
          <h1 className="text-base font-medium tracking-tight text-muted-foreground">
            OmniLedger{" "}
            <span className="text-muted-foreground/80">
              | Inventory & Accounting System
            </span>
          </h1>
        </header>

        {/* System Setup panel - 24px below header */}
        <SystemSetupPanel
          sampleCategory={sampleCategory}
          onSampleCategoryChange={setSampleCategory}
          onLoadSampleCompany={() => handleLoadSampleCompany(false)}
          onLoadAllSampleCompanies={() => handleLoadSampleCompany(true)}
          onOpenDatabaseSettings={handleConfigureDatabase}
          loadingSample={loadingSample}
        />

        {/* Companies section - 32px below System Setup */}
        <section aria-label="Companies" className="mt-8">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold">
              Your Companies{" "}
              <span className="font-normal text-muted-foreground">
                ({companies.length})
              </span>
            </h2>
            <Button onClick={handleNewCompany} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Company
            </Button>
          </div>

          {hasCompanies && (
            <div className="mb-4">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
          )}

          {!hasCompanies ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-card p-8 text-center shadow-sm">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No companies yet</h3>
              <p className="mb-6 max-w-md text-sm text-muted-foreground">
                Create your first company to start managing inventory and
                accounting.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={handleNewCompany}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Company
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleLoadSampleCompany(false)}
                  disabled={loadingSample}
                >
                  {loadingSample ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Load Sample Company
                </Button>
              </div>
            </div>
          ) : hasFilteredResults ? (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Showing {filteredCompanies.length} of {companies.length}{" "}
                companies
              </p>
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {filteredCompanies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onOpen={handleCompanySelect}
                    onEdit={handleEditCompany}
                    onDuplicate={handleDuplicateCompany}
                    onDelete={handleRequestDeleteCompany}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-card p-8 text-center shadow-sm">
              <h3 className="mb-2 text-base font-semibold">
                No companies match your search
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Try a different name, phone, or email, or clear the search.
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            </div>
          )}

          {sampleError && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
              {sampleError}
            </div>
          )}
        </section>
      </div>

      {/* Delete confirmation modal */}
      <Dialog open={!!companyToDelete} onOpenChange={(open) => !open && handleCancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete company?</DialogTitle>
            <DialogDescription>
              {companyToDelete
                ? `Are you sure you want to delete "${companyToDelete.name}"? This will permanently delete all data for this company. This action cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
