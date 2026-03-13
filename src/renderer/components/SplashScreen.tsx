import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Loader2,
  Plus,
  Search,
  X,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ChevronRight,
  Database,
  Sparkles,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SystemSetupPanel } from "./companies";
import type { SampleCategory } from "@shared/sample-categories";
import { cn } from "@/lib/utils";

// ─── Animated background dots ────────────────────────────────────────────────
function GridBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Soft glow in top-right */}
      <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
    </div>
  );
}

// ─── Company card ─────────────────────────────────────────────────────────────
function CompanyCard({
  company,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  company: Company;
  onOpen: (c: Company) => void;
  onEdit: (c: Company) => void;
  onDuplicate: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  const initials = company.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Deterministic hue from name for avatar bg
  const hue =
    [...company.name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-5",
        "transition-all duration-200 ease-out",
        "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
      )}
      onClick={() => onOpen(company)}
    >
      {/* Three-dot menu */}
      <div
        className="absolute right-3 top-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onOpen(company)}>
              <ChevronRight className="mr-2 h-3.5 w-3.5" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(company)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(company)}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(company)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Avatar + name row */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: `hsl(${hue} 55% 45%)` }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{company.name}</p>
          {company.email && (
            <p className="truncate text-xs text-muted-foreground">
              {company.email}
            </p>
          )}
        </div>
      </div>

      {/* Meta pills */}
      <div className="flex flex-wrap gap-1.5">
        {company.currency && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {company.currency}
          </span>
        )}
        {company.phone && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {company.phone}
          </span>
        )}
      </div>

      {/* Open affordance */}
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/60">
          {company.updatedAt
            ? `Updated ${new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
                Math.round(
                  (company.updatedAt.getTime() - Date.now()) / 86_400_000
                ),
                "day"
              )}`
            : ""}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Open <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  onNew,
  onSample,
  loading,
}: {
  onNew: () => void;
  onSample: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/25 bg-card/60 px-6 py-16 text-center backdrop-blur-sm">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Building2 className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-1.5 text-lg font-semibold">No companies yet</h3>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        Create your first company to start managing inventory and accounting, or
        load a sample to explore.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button onClick={onNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Create company
        </Button>
        <Button
          variant="outline"
          onClick={onSample}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Load sample data
        </Button>
      </div>
    </div>
  );
}

// ─── No-results state ─────────────────────────────────────────────────────────
function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/25 bg-card/60 px-6 py-14 text-center">
      <Search className="mb-4 h-8 w-8 text-muted-foreground/40" />
      <h3 className="mb-1 text-base font-semibold">No results found</h3>
      <p className="mb-5 text-sm text-muted-foreground">
        Try a different name, phone, or email.
      </p>
      <Button variant="outline" onClick={onClear} size="sm">
        Clear search
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SplashScreen() {
  const navigate = useNavigate();
  const { databaseConfig, setCurrentCompany, setError } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleCategory, setSampleCategory] =
    useState<SampleCategory>("grocery");
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
    loadCompanies().finally(() => clearTimeout(timeout));
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
        setCompanies(
          result.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            address: c.address || undefined,
            phone: c.phone || undefined,
            email: c.email || undefined,
            currency: c.currency || "PKR",
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          }))
        );
      } else {
        setError(result?.error || "Failed to load companies");
        setCompanies([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load companies");
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
    } catch (e) {
      setSampleError(
        e instanceof Error ? e.message : "Failed to load sample company"
      );
    } finally {
      setLoadingSample(false);
    }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete company");
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading / no-config screens ────────────────────────────────────────────
  if (!hasCheckedCompanies || loadingCompanies) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <GridBackground />
        <div className="relative z-10 space-y-3 text-center">
          {initError ? (
            <>
              <p className="font-semibold text-destructive">{initError}</p>
              <p className="text-sm text-muted-foreground">
                Please check your database configuration.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/database/config")}
                className="mt-2 gap-2"
              >
                <Database className="h-4 w-4" />
                Database settings
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading companies…
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!databaseConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasCompanies = companies.length > 0;
  const hasFilteredResults = filteredCompanies.length > 0;

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-background">
      <GridBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 sm:px-8">
        {/* ── Header ── */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              OmniLedger
            </p>
            <h1 className="text-xl font-bold tracking-tight">
              Inventory &amp; Accounting
            </h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/database/config")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Database</span>
          </Button>
        </header>

        {/* ── System Setup panel ── */}
        <SystemSetupPanel
          sampleCategory={sampleCategory}
          onSampleCategoryChange={setSampleCategory}
          onLoadSampleCompany={() => handleLoadSampleCompany(false)}
          onLoadAllSampleCompanies={() => handleLoadSampleCompany(true)}
          onOpenDatabaseSettings={() => navigate("/database/config")}
          loadingSample={loadingSample}
        />

        {/* ── Companies section ── */}
        <section aria-label="Companies" className="mt-10">
          {/* Section header */}
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-semibold">Companies</h2>
              {hasCompanies && (
                <span className="text-sm text-muted-foreground">
                  {companies.length}
                </span>
              )}
            </div>

            <Button
              onClick={() => navigate("/company/new")}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New company
            </Button>
          </div>

          {/* Search bar — only when there are companies */}
          {hasCompanies && (
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email or phone…"
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* States */}
          {!hasCompanies ? (
            <EmptyState
              onNew={() => navigate("/company/new")}
              onSample={() => handleLoadSampleCompany(false)}
              loading={loadingSample}
            />
          ) : hasFilteredResults ? (
            <>
              {searchQuery && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {filteredCompanies.length} of {companies.length} companies
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCompanies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onOpen={handleCompanySelect}
                    onEdit={(c) => navigate(`/company/${c.id}/edit`)}
                    onDuplicate={(c) =>
                      navigate("/company/new", { state: { copyFrom: c } })
                    }
                    onDelete={setCompanyToDelete}
                  />
                ))}
              </div>
            </>
          ) : (
            <NoResults onClear={() => setSearchQuery("")} />
          )}

          {/* Sample error banner */}
          {sampleError && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <span className="flex-1">{sampleError}</span>
              <button onClick={() => setSampleError(null)} className="shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={!!companyToDelete}
        onOpenChange={(open) => !open && setCompanyToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete company?</DialogTitle>
            <DialogDescription>
              {companyToDelete && (
                <>
                  This will permanently delete{" "}
                  <strong className="font-semibold text-foreground">
                    "{companyToDelete.name}"
                  </strong>{" "}
                  and all its data. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompanyToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}