/**
 * Database Configuration Wizard
 * Step-by-step wizard for first-time database setup
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  Server,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/stores/useAppStore";
import type { DatabaseConfig, DatabaseType } from "@shared/types";
import { parseDatabaseError, type ErrorDetails } from "@/utils/databaseErrors";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardData {
  setupType: "quick" | "advanced" | null;
  type: DatabaseType | null;
  config: Partial<DatabaseConfig>;
  profileName: string;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i + 1 === current
              ? "w-4 bg-primary"
              : i + 1 < current
              ? "w-1.5 bg-primary/40"
              : "w-1.5 bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

// ─── Shared layout shell ──────────────────────────────────────────────────────
function WizardShell({
  step,
  totalSteps,
  children,
}: {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      {/* Soft glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
      >
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Step indicator */}
        <div className="mb-4 flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Step {step} of {totalSteps}
          </p>
          <StepDots total={totalSteps} current={step} />
        </div>

        <div className="rounded-2xl border bg-card shadow-xl shadow-black/5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Option card ──────────────────────────────────────────────────────────────
function OptionCard({
  icon: Icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full rounded-xl border p-5 text-left transition-all duration-150",
        "hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{title}</span>
            {badge && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 mt-0.5" />
      </div>
    </button>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1">
        <Label className="text-sm font-medium">{label}</Label>
        {required && <span className="text-xs text-destructive">*</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DatabaseWizard() {
  const navigate = useNavigate();
  const { setDatabaseConfig, setError } = useAppStore();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);

  const [wizardData, setWizardData] = useState<WizardData>({
    setupType: null,
    type: null,
    config: {},
    profileName: "",
  });

  const handleQuickSetup = () => {
    setWizardData((prev) => ({
      ...prev,
      setupType: "quick",
      type: "sqlite",
      config: { type: "sqlite", connectionString: "file:./data/omniledger.db" },
    }));
    setCurrentStep(5);
  };

  const handleAdvancedSetup = () => {
    setWizardData((prev) => ({ ...prev, setupType: "advanced" }));
    setCurrentStep(2);
  };

  const handleDatabaseTypeSelect = (type: DatabaseType) => {
    const config: Partial<DatabaseConfig> = { type };
    if (type === "sqlite") {
      config.connectionString = "file:./data/omniledger.db";
    } else {
      config.host = "localhost";
      config.port =
        type === "postgresql" ? 5432 : type === "mysql" ? 3306 : 1433;
    }
    setWizardData((prev) => ({
      ...prev,
      type,
      config: { ...prev.config, ...config },
    }));
    setCurrentStep(3);
  };

  const handleConfigUpdate = (field: keyof DatabaseConfig, value: any) => {
    setWizardData((prev) => ({
      ...prev,
      config: { ...prev.config, [field]: value },
    }));
  };

  const handleTestConnection = async () => {
    if (!wizardData.type || wizardData.type === "sqlite") {
      setCurrentStep(5);
      return;
    }
    const config = wizardData.config as DatabaseConfig;
    if (!config.host || !config.database || !config.username) {
      setError("Please fill in all required fields");
      return;
    }
    setTesting(true);
    setErrorDetails(null);
    setError(null);
    try {
      const result = await window.electronAPI.testDatabaseConnection(config);
      if (result.success) {
        setCurrentStep(5);
      } else {
        const parsed = parseDatabaseError(new Error(result.error || "Connection failed"));
        setErrorDetails(parsed);
        setError(parsed.message);
      }
    } catch (error) {
      const parsed = parseDatabaseError(error);
      setErrorDetails(parsed);
      setError(parsed.message);
    } finally {
      setTesting(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = wizardData.config as DatabaseConfig;
      setDatabaseConfig(config);
      localStorage.setItem("omniledger_db_config", JSON.stringify(config));
      navigate("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as WizardStep);
    else navigate("/");
  };

  // ── Step 1: Welcome ────────────────────────────────────────────────────────
  if (currentStep === 1) {
    return (
      <WizardShell step={1} totalSteps={3}>
        <div className="p-8">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mb-1 text-2xl font-bold">Welcome to OmniLedger</h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Let's connect your database. Choose a setup path to get started.
          </p>

          <div className="space-y-3">
            <OptionCard
              icon={HardDrive}
              title="Quick Setup"
              description="SQLite file on your local machine. No server required."
              badge="Recommended"
              onClick={handleQuickSetup}
            />
            <OptionCard
              icon={Server}
              title="Advanced Setup"
              description="Connect to PostgreSQL, MySQL, or MSSQL."
              onClick={handleAdvancedSetup}
            />
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mt-6 w-full text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      </WizardShell>
    );
  }

  // ── Step 2: DB type selection ──────────────────────────────────────────────
  if (currentStep === 2) {
    const dbTypes: { type: DatabaseType; label: string; port: string }[] = [
      { type: "postgresql", label: "PostgreSQL", port: "5432" },
      { type: "mysql", label: "MySQL", port: "3306" },
      { type: "mssql", label: "SQL Server", port: "1433" },
      { type: "sqlite", label: "SQLite", port: "—" },
    ];

    return (
      <WizardShell step={2} totalSteps={3}>
        <div className="p-8">
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <h2 className="mb-1 text-xl font-bold">Choose Database Type</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Select the database engine you want to connect to.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {dbTypes.map(({ type, label, port }) => (
              <button
                key={type}
                onClick={() => handleDatabaseTypeSelect(type)}
                className={cn(
                  "group flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                <Database className="mb-1 h-5 w-5 text-muted-foreground group-hover:text-primary" />
                <span className="font-semibold">{label}</span>
                {port !== "—" && (
                  <span className="text-xs text-muted-foreground">
                    Default port {port}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </WizardShell>
    );
  }

  // ── Step 3: Connection details ─────────────────────────────────────────────
  if (currentStep === 3) {
    const isSQLite = wizardData.type === "sqlite";

    return (
      <WizardShell step={3} totalSteps={3}>
        <div className="p-8">
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <h2 className="mb-1 text-xl font-bold">Connection Details</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your {wizardData.type?.toUpperCase()} connection information.
          </p>

          <div className="space-y-4">
            {isSQLite ? (
              <Field
                label="Database File Path"
                required
                hint='Use "file:" prefix for absolute paths.'
              >
                <Input
                  value={wizardData.config.connectionString || ""}
                  onChange={(e) =>
                    handleConfigUpdate("connectionString", e.target.value)
                  }
                  placeholder="file:./data/omniledger.db"
                />
              </Field>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="Host" required>
                      <Input
                        value={wizardData.config.host || ""}
                        onChange={(e) =>
                          handleConfigUpdate("host", e.target.value)
                        }
                        placeholder="localhost"
                      />
                    </Field>
                  </div>
                  <Field label="Port" required>
                    <Input
                      type="number"
                      value={wizardData.config.port || ""}
                      onChange={(e) =>
                        handleConfigUpdate("port", parseInt(e.target.value))
                      }
                      placeholder={
                        wizardData.type === "postgresql"
                          ? "5432"
                          : wizardData.type === "mysql"
                          ? "3306"
                          : "1433"
                      }
                    />
                  </Field>
                </div>

                <Field label="Database Name" required>
                  <Input
                    value={wizardData.config.database || ""}
                    onChange={(e) =>
                      handleConfigUpdate("database", e.target.value)
                    }
                    placeholder="omniledger"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Username" required>
                    <Input
                      value={wizardData.config.username || ""}
                      onChange={(e) =>
                        handleConfigUpdate("username", e.target.value)
                      }
                      placeholder="database_user"
                    />
                  </Field>
                  <Field label="Password">
                    <Input
                      type="password"
                      value={wizardData.config.password || ""}
                      onChange={(e) =>
                        handleConfigUpdate("password", e.target.value)
                      }
                      placeholder="••••••••"
                    />
                  </Field>
                </div>
              </>
            )}

            {errorDetails && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorDetails.message}
                {errorDetails.suggestion && (
                  <p className="mt-1 text-xs opacity-80">{errorDetails.suggestion}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleTestConnection}
              disabled={testing}
              className="gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {testing ? "Testing…" : isSQLite ? "Continue" : "Test & Continue"}
              {!testing && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </WizardShell>
    );
  }

  // ── Step 4: Initializing ───────────────────────────────────────────────────
  if (currentStep === 4) {
    return (
      <WizardShell step={3} totalSteps={3}>
        <div className="flex flex-col items-center p-12 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <h2 className="text-lg font-semibold">Setting Up Database</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Creating tables and schema…
          </p>
        </div>
      </WizardShell>
    );
  }

  // ── Step 5: Success ────────────────────────────────────────────────────────
  if (currentStep === 5) {
    const cfg = wizardData.config;
    const isQuick = wizardData.setupType === "quick";

    return (
      <WizardShell step={3} totalSteps={3}>
        <div className="p-8">
          {/* Success icon */}
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>

          <h2 className="mb-1 text-2xl font-bold">
            {isQuick ? "Ready to Go!" : "Connection Verified"}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Your database has been configured successfully.
          </p>

          {/* Config summary */}
          <div className="mb-6 space-y-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-mono font-medium">
                {cfg.type?.toUpperCase()}
              </span>
            </div>
            {cfg.connectionString && (
              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">Path</span>
                <span
                  className="truncate text-right font-mono text-xs"
                  title={cfg.connectionString}
                >
                  {cfg.connectionString}
                </span>
              </div>
            )}
            {cfg.host && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Host</span>
                  <span className="font-mono">{cfg.host}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Database</span>
                  <span className="font-mono">{cfg.database}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleFinish}
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {loading ? "Saving…" : "Get Started"}
            </Button>
          </div>
        </div>
      </WizardShell>
    );
  }

  return null;
}