import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Database, Settings } from "lucide-react";
import logo from "@/assets/logo.svg";
import { useAppStore } from "@/stores/useAppStore";

export function LandingPage() {
  const navigate = useNavigate();
  const { databaseConfig } = useAppStore();

  useEffect(() => {
    if (databaseConfig) {
      navigate("/companies", { replace: true });
    }
  }, [databaseConfig, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="OmniLedger" className="h-7 w-auto" />
          <span className="text-sm text-muted-foreground font-medium">
            Inventory & Accounting
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/database/config")}
        >
          <Settings className="h-4 w-4 mr-1.5" />
          Settings
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to OmniLedger
            </h1>
            <p className="text-muted-foreground">
              Connect your database to get started. Choose SQLite for a quick
              local setup, or connect to PostgreSQL, MySQL, or SQL Server.
            </p>
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs"
            onClick={() => navigate("/database/config")}
          >
            <Database className="h-5 w-5 mr-2" />
            Configure Database
          </Button>

          <p className="text-xs text-muted-foreground">
            Your data stays on your machine. No account required.
          </p>

          <footer className="pt-12 space-y-1">
            <p className="text-xs text-muted-foreground">
              OmniLedger v{__APP_VERSION__}
            </p>
            <a
              href={__APP_HOMEPAGE__}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Built by Wahid
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
