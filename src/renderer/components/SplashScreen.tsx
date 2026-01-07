import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/useAppStore";
import type { Company } from "@shared/types";
import { Building2, Plus, Database, Loader2 } from "lucide-react";

export function SplashScreen() {
  const navigate = useNavigate();
  const { databaseConfig, setDatabaseConfig, setCurrentCompany, setLoading, setError } = useAppStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [hasCheckedCompanies, setHasCheckedCompanies] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    setError(null);

    try {
      // Call IPC to get companies from main process
      const result = await (window as any).electronAPI?.getCompanies();
      
      if (result?.success && result.data) {
        // Map Prisma data to Company type
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

  // Show loading state while checking for companies
  if (!hasCheckedCompanies || loadingCompanies) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading companies...</p>
        </div>
      </div>
    );
  }

  // If no database config, show database configuration option
  if (!databaseConfig) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">OmniLedger</h1>
            <p className="text-muted-foreground text-lg">
              Desktop Inventory & Accounting System
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle>Database Configuration Required</CardTitle>
                  <CardDescription>
                    Please configure your database connection to get started.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  OmniLedger supports multiple database types:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                  <li>SQLite - For local development</li>
                  <li>PostgreSQL - For production use</li>
                  <li>MySQL - Alternative relational database</li>
                  <li>MSSQL - Microsoft SQL Server</li>
                </ul>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleConfigureDatabase}>
                    <Database className="h-4 w-4 mr-2" />
                    Configure Database
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{company.name}</CardTitle>
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
                <div className="flex justify-end pt-4">
                  <Button onClick={handleNewCompany}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Company
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 flex justify-center gap-4">
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

