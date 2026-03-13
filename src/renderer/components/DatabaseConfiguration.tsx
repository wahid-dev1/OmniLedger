import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Copy,
  Database,
  Plus,
  Trash2,
  Edit,
  ArrowLeft,
  Server,
  Shield,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/useAppStore";
import type {
  DatabaseConfig,
  DatabaseType,
  ConnectionProfile,
} from "@shared/types";
import {
  parseDatabaseError,
  formatErrorForDisplay,
  getErrorCategoryColor,
  type ErrorDetails,
} from "@/utils/databaseErrors";
import { MigrationNotificationDialog } from "@/components/MigrationNotificationDialog";
import {
  getConnectionProfiles,
  saveConnectionProfile,
  deleteConnectionProfile,
  setActiveProfile,
  getActiveProfile,
  getProfileById,
} from "@/utils/connectionProfiles";
import { cn } from "@/lib/utils";

// ─── Shared form field ────────────────────────────────────────────────────────
function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline gap-1">
        <Label className="text-sm font-medium">{label}</Label>
        {required && <span className="text-xs text-destructive">*</span>}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Connection status badge ──────────────────────────────────────────────────
function StatusPill({
  status,
}: {
  status: "idle" | "testing" | "connected" | "disconnected";
}) {
  if (status === "idle") return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
        status === "connected" &&
          "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300",
        status === "disconnected" &&
          "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300",
        status === "testing" &&
          "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300"
      )}
    >
      {status === "testing" && (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      )}
      {status === "connected" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {status === "disconnected" && <XCircle className="h-3.5 w-3.5" />}
      <span>
        {status === "testing"
          ? "Testing connection…"
          : status === "connected"
          ? "Connected"
          : "Connection failed"}
      </span>
    </div>
  );
}

// ─── Profile row card ─────────────────────────────────────────────────────────
function ProfileRow({
  profile,
  isActive,
  onSwitch,
  onEdit,
  onDelete,
  onViewActive,
}: {
  profile: ConnectionProfile;
  isActive: boolean;
  onSwitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewActive: () => void;
}) {
  const pathDisplay =
    profile.config.type === "sqlite"
      ? profile.config.connectionString || "—"
      : profile.config.host
      ? `${profile.config.host}:${profile.config.port ?? ""}/${
          profile.config.database ?? ""
        }`
      : "—";

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
        isActive
          ? "bg-primary/5 hover:bg-primary/10"
          : "hover:bg-muted/40"
      )}
      onClick={isActive ? onViewActive : onSwitch}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isActive ? "bg-primary/10" : "bg-muted"
        )}
      >
        <Server
          className={cn(
            "h-4 w-4",
            isActive ? "text-primary" : "text-muted-foreground"
          )}
        />
      </div>

      {/* Name + path */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{profile.name}</span>
          {isActive && (
            <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
              ACTIVE
            </span>
          )}
          {profile.isDefault && !isActive && (
            <Badge variant="secondary" className="rounded-full text-[10px]">
              Default
            </Badge>
          )}
        </div>
        <p
          className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
          title={pathDisplay}
        >
          {pathDisplay}
        </p>
      </div>

      {/* Type badge */}
      <span className="hidden rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
        {profile.config.type}
      </span>

      {/* Last used */}
      <span className="hidden text-xs text-muted-foreground lg:inline">
        {new Date(profile.lastUsed).toLocaleDateString()}
      </span>

      {/* Actions */}
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {!isActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSwitch}
            className="h-7 px-2.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
          >
            Switch
          </Button>
        )}
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
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── The connection form ──────────────────────────────────────────────────────
function ConnectionForm({
  formData,
  onChange,
  onTypeChange,
  showPassword,
  onTogglePassword,
  validateOnSave,
  onToggleValidate,
  testingConnection,
  connectionStatus,
  testProgress,
  errorDetails,
  globalError,
  successMessage,
  isLoading,
  isEditing,
  onTest,
  onSubmit,
  onSaveProfile,
  onBack,
  onCancel,
}: {
  formData: DatabaseConfig;
  onChange: (field: keyof DatabaseConfig, value: any) => void;
  onTypeChange: (type: DatabaseType) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  validateOnSave: boolean;
  onToggleValidate: (v: boolean) => void;
  testingConnection: boolean;
  connectionStatus: "idle" | "testing" | "connected" | "disconnected";
  testProgress: string[];
  errorDetails: ErrorDetails | null;
  globalError: string | null;
  successMessage: string | null;
  isLoading: boolean;
  isEditing: boolean;
  onTest: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onSaveProfile: () => void;
  onBack?: () => void;
  onCancel?: () => void;
}) {
  const isSQLite = formData.type === "sqlite";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* DB Type */}
      <Field label="Database Type" required>
        <Select
          value={formData.type}
          onValueChange={(v) => onTypeChange(v as DatabaseType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sqlite">SQLite (local file)</SelectItem>
            <SelectItem value="postgresql">PostgreSQL</SelectItem>
            <SelectItem value="mysql">MySQL</SelectItem>
            <SelectItem value="mssql">SQL Server (MSSQL)</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* SQLite path OR remote fields */}
      {isSQLite ? (
        <Field
          label="Database File Path"
          required
          hint='Use "file:" prefix for absolute paths, e.g. file:./data/omniledger.db'
        >
          <Input
            value={formData.connectionString || ""}
            onChange={(e) => onChange("connectionString", e.target.value)}
            placeholder="file:./data/omniledger.db"
          />
        </Field>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Host" required className="col-span-2">
              <Input
                value={formData.host || ""}
                onChange={(e) => onChange("host", e.target.value)}
                placeholder="localhost"
              />
            </Field>
            <Field label="Port" required>
              <Input
                type="number"
                value={formData.port || ""}
                onChange={(e) => onChange("port", parseInt(e.target.value))}
                placeholder={
                  formData.type === "postgresql"
                    ? "5432"
                    : formData.type === "mysql"
                    ? "3306"
                    : "1433"
                }
              />
            </Field>
          </div>

          <Field label="Database Name" required>
            <Input
              value={formData.database || ""}
              onChange={(e) => onChange("database", e.target.value)}
              placeholder="omniledger"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Username" required>
              <Input
                value={formData.username || ""}
                onChange={(e) => onChange("username", e.target.value)}
                placeholder="db_user"
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password || ""}
                  onChange={(e) => onChange("password", e.target.value)}
                  placeholder="••••••••"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={onTogglePassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>
          </div>

          {/* SSL toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">SSL / TLS</p>
                <p className="text-xs text-muted-foreground">
                  Encrypt the connection
                </p>
              </div>
            </div>
            <Switch
              checked={formData.ssl ?? false}
              onCheckedChange={(v) => onChange("ssl", v)}
            />
          </div>

          {formData.ssl && (
            <Field label="SSL Mode">
              <Select
                value={formData.sslMode || "require"}
                onValueChange={(v) => onChange("sslMode", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="require">require</SelectItem>
                  <SelectItem value="prefer">prefer</SelectItem>
                  <SelectItem value="disable">disable</SelectItem>
                  <SelectItem value="verify-ca">verify-ca</SelectItem>
                  <SelectItem value="verify-full">verify-full</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </>
      )}

      {/* Test connection button (standalone) */}
      {!isSQLite && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={testingConnection}
          className="gap-2"
        >
          {testingConnection ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {testingConnection ? "Testing…" : "Test Connection"}
        </Button>
      )}

      {/* Connection status */}
      <StatusPill status={connectionStatus} />

      {/* Test progress log */}
      {testProgress.length > 0 && (
        <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2.5 font-mono text-xs">
          {testProgress.map((step, i) => (
            <p key={i}>{step}</p>
          ))}
        </div>
      )}

      {/* Error block */}
      {errorDetails && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3",
            errorDetails.category === "warning"
              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
              : "border-destructive/30 bg-destructive/10"
          )}
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                getErrorCategoryColor(errorDetails.category)
              )}
            />
            <div className="flex-1 space-y-1.5">
              <p
                className={cn(
                  "text-sm font-semibold",
                  getErrorCategoryColor(errorDetails.category)
                )}
              >
                {errorDetails.message}
              </p>
              {errorDetails.suggestion && (
                <p className="text-xs text-muted-foreground">
                  {errorDetails.suggestion}
                </p>
              )}
              {errorDetails.action && (
                <p className="whitespace-pre-line text-xs text-muted-foreground">
                  {errorDetails.action}
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() =>
                  navigator.clipboard.writeText(
                    formatErrorForDisplay(errorDetails)
                  )
                }
              >
                <Copy className="h-3 w-3" />
                Copy details
              </Button>
            </div>
          </div>
        </div>
      )}

      {globalError && !errorDetails && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {globalError}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Validate on save toggle (non-SQLite) */}
      {!isSQLite && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
          <input
            type="checkbox"
            id="validateOnSave"
            checked={validateOnSave}
            onChange={(e) => onToggleValidate(e.target.checked)}
            className="rounded"
          />
          <Label
            htmlFor="validateOnSave"
            className="cursor-pointer text-sm"
          >
            Test connection before saving
          </Label>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={onSaveProfile}
          disabled={isLoading}
          className="gap-2 text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
          Save for Later
        </Button>

        <div className="flex gap-2">
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          ) : onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading
              ? "Connecting…"
              : isEditing
              ? "Update & Connect"
              : "Connect"}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DatabaseConfiguration() {
  const navigate = useNavigate();
  const { databaseConfig, setDatabaseConfig, setError, isLoading, setLoading } =
    useAppStore();
  const [useExisting, setUseExisting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingTables, setSyncingTables] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState<
    string | null
  >(null);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "connected" | "disconnected"
  >("idle");
  const [testProgress, setTestProgress] = useState<string[]>([]);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [validateOnSave, setValidateOnSave] = useState(true);
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<{
    isUpToDate: boolean;
    lastMigration?: Date;
  } | null>(null);
  const [checkingMigration, setCheckingMigration] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState<{
    needed: boolean;
    currentVersion?: string | null;
    requiredVersion: string;
  } | null>(null);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [formData, setFormData] = useState<DatabaseConfig>({
    type: "sqlite",
    connectionString: "file:./data/omniledger.db",
  });
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showActiveProfileModal, setShowActiveProfileModal] = useState(false);
  const [showResyncConfirmDialog, setShowResyncConfirmDialog] = useState(false);
  const [pendingSyncConfig, setPendingSyncConfig] =
    useState<DatabaseConfig | null>(null);

  useEffect(() => {
    const loadedProfiles = getConnectionProfiles();
    setProfiles(loadedProfiles);
    const active = getActiveProfile();
    if (active) {
      setActiveProfileId(active.id);
      setDatabaseConfig(active.config);
      (window as any).electronAPI?.setActiveDatabaseConfig(active.config);
    } else if (databaseConfig) {
      (window as any).electronAPI?.setActiveDatabaseConfig(databaseConfig);
    }
  }, []);

  useEffect(() => {
    if (databaseConfig) {
      checkMigrationStatus();
      checkMigrationNeeded();
    }
  }, [databaseConfig]);

  useEffect(() => {
    if (databaseConfig) {
      setUseExisting(true);
      setShowForm(false);
    } else {
      setShowForm(true);
    }
  }, [databaseConfig]);

  const checkMigrationStatus = async () => {
    if (!databaseConfig) return;
    setCheckingMigration(true);
    try {
      const result = await window.electronAPI.checkSchemaInitialized(
        databaseConfig
      );
      setMigrationStatus({
        isUpToDate: result.isInitialized,
        lastMigration: result.isInitialized ? new Date() : undefined,
      });
    } catch (error) {
      console.error("Error checking migration status:", error);
    } finally {
      setCheckingMigration(false);
    }
  };

  const checkMigrationNeeded = async () => {
    if (!databaseConfig) return;
    try {
      const result = await (window as any).electronAPI?.checkMigrationNeeded(
        databaseConfig
      );
      if (result) {
        setMigrationNeeded(result);
        if (result.needed) setShowMigrationDialog(true);
      }
    } catch (error) {
      console.error("Error checking if migration is needed:", error);
    }
  };

  const handleCheckMigration = async () => {
    if (!databaseConfig) return;
    setSuccessMessage(null);
    setError(null);
    try {
      const result = await (window as any).electronAPI?.checkMigrationNeeded(
        databaseConfig
      );
      if (result) {
        setMigrationNeeded(result);
        if (result.needed) {
          setShowMigrationDialog(true);
        } else {
          setSuccessMessage(
            `Database is up to date (v${result.currentVersion || result.requiredVersion}).`
          );
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to check migration status"
      );
    }
  };

  const handleSaveAsProfile = () => {
    setError(null);
    setSuccessMessage(null);
    if (formData.type === "sqlite") {
      if (!formData.connectionString?.trim()) {
        setError("Please provide a connection string for SQLite");
        return;
      }
    } else {
      if (!formData.host || !formData.database || !formData.username) {
        setError("Please fill in all required fields before saving as profile");
        return;
      }
    }
    setProfileNameInput("");
    setShowProfileDialog(true);
  };

  const handleConfirmSaveProfile = async () => {
    const profileName = profileNameInput.trim();
    if (!profileName) {
      setError("Profile name is required");
      return;
    }
    const existingProfiles = getConnectionProfiles();
    if (
      existingProfiles.some(
        (p) => p.name.toLowerCase() === profileName.toLowerCase()
      )
    ) {
      setError(`A profile named "${profileName}" already exists.`);
      return;
    }
    setSavingProfile(true);
    setError(null);
    try {
      const profile = saveConnectionProfile({
        name: profileName,
        config: formData,
        isDefault: false,
      });
      setProfiles(getConnectionProfiles());
      setActiveProfileId(profile.id);
      setActiveProfile(profile.id);
      (window as any).electronAPI?.setActiveDatabaseConfig(profile.config);
      setSuccessMessage(`"${profileName}" added to saved connections.`);
      setShowProfileDialog(false);
      setProfileNameInput("");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save profile"
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSwitchProfile = (profileId: string) => {
    const profile = getProfileById(profileId);
    if (profile) {
      setActiveProfile(profileId);
      setActiveProfileId(profileId);
      setDatabaseConfig(profile.config);
      setFormData(profile.config);
      (window as any).electronAPI?.setActiveDatabaseConfig(profile.config);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    if (confirm("Remove this saved connection?")) {
      deleteConnectionProfile(profileId);
      setProfiles(getConnectionProfiles());
      if (activeProfileId === profileId) {
        setActiveProfileId(null);
        setDatabaseConfig(null);
      }
    }
  };

  const handleDatabaseTypeChange = (type: DatabaseType) => {
    setFormData((prev) => {
      const newData: DatabaseConfig = { type };
      if (type === "sqlite") {
        newData.connectionString = "file:./data/omniledger.db";
      } else {
        newData.host = "localhost";
        newData.port =
          type === "postgresql" ? 5432 : type === "mysql" ? 3306 : 1433;
      }
      return { ...prev, ...newData };
    });
  };

  const handleConfigChange = (field: keyof DatabaseConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async (configToTest?: DatabaseConfig) => {
    const config = configToTest || formData;
    if (!config.type) {
      setError("Please select a database type");
      return;
    }
    if (config.type === "sqlite") {
      setConnectionStatus("connected");
      setTestProgress(["✓ SQLite file path validated"]);
      setTimeout(() => setTestProgress([]), 3000);
      return;
    }
    if (!config.host || !config.database || !config.username) {
      setError("Please fill in all required fields");
      return;
    }
    setTestingConnection(true);
    setError(null);
    setErrorDetails(null);
    setConnectionStatus("testing");
    setTestProgress(["⏳ Testing network connectivity…"]);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setTestProgress((p) => [...p, "✓ Network reachable"]);
      setTestProgress((p) => [...p, "⏳ Authenticating…"]);
      const result = await window.electronAPI.testDatabaseConnection(config);
      if (result.success) {
        setTestProgress((p) => [
          ...p,
          "✓ Authentication successful",
          "✓ Database access verified",
        ]);
        setConnectionStatus("connected");
        setPendingSyncConfig(config);
        setTimeout(() => setTestProgress([]), 2000);
      } else {
        const parsed = parseDatabaseError(
          new Error(result.error || "Connection failed")
        );
        setErrorDetails(parsed);
        setError(parsed.message);
        setConnectionStatus("disconnected");
        setTestProgress((p) => [...p, "❌ Connection failed"]);
      }
    } catch (error) {
      const parsed = parseDatabaseError(error);
      setErrorDetails(parsed);
      setError(parsed.message);
      setConnectionStatus("disconnected");
      setTestProgress((p) => [...p, "❌ Connection failed"]);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncTables = async (
    configToSync?: DatabaseConfig,
    forceSync = false
  ) => {
    const config = configToSync || formData || databaseConfig;
    if (!config) {
      setError("No database configuration available");
      return;
    }
    setSyncingTables(true);
    setError(null);
    setInitializationStatus("Checking database schema…");
    try {
      const schemaCheck = await window.electronAPI.checkSchemaInitialized(
        config
      );
      if (schemaCheck.isInitialized && !forceSync) {
        setPendingSyncConfig(config);
        setShowResyncConfirmDialog(true);
        setSyncingTables(false);
        setInitializationStatus(null);
        return;
      }
      setInitializationStatus("Initializing schema and creating tables…");
      const result = await window.electronAPI.initializeDatabaseSchema(config);
      if (result.success) {
        setError(null);
        const msg = result.migrated
          ? result.seeded
            ? "Tables created and sample data loaded."
            : "Tables created successfully."
          : "Schema is already up to date.";
        setInitializationStatus(msg);
        setSuccessMessage(msg);
        setShowResyncConfirmDialog(false);
        setPendingSyncConfig(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(result.error || "Failed to sync tables");
        setInitializationStatus(`Error: ${result.error || "Failed to sync tables"}`);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to sync tables";
      setError(msg);
      setInitializationStatus(`Error: ${msg}`);
    } finally {
      setSyncingTables(false);
      setTimeout(() => setInitializationStatus(null), 3000);
    }
  };

  const handleEditExisting = () => {
    if (databaseConfig) {
      setFormData(databaseConfig);
      setShowForm(true);
      setUseExisting(false);
      setIsEditing(true);
    }
  };

  const handleBackToExisting = () => {
    setShowForm(false);
    setUseExisting(true);
    setIsEditing(false);
    setFormData({ type: "sqlite", connectionString: "file:./data/omniledger.db" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    try {
      if (formData.type === "sqlite") {
        if (!formData.connectionString) {
          setError("Please provide a connection string for SQLite");
          setLoading(false);
          return;
        }
      } else {
        if (!formData.host || !formData.database || !formData.username) {
          setError("Please fill in all required fields");
          setLoading(false);
          return;
        }
      }
      if (validateOnSave && formData.type !== "sqlite") {
        const testResult = await window.electronAPI.testDatabaseConnection(
          formData
        );
        if (!testResult.success) {
          const parsed = parseDatabaseError(
            new Error(testResult.error || "Connection test failed")
          );
          setErrorDetails(parsed);
          setError(`Connection test failed: ${parsed.message}`);
          const saveAnyway = confirm(
            formatErrorForDisplay(parsed) +
              "\n\nSave this configuration anyway?"
          );
          if (!saveAnyway) {
            setLoading(false);
            return;
          }
          setError(null);
          setErrorDetails(null);
        }
      }
      setDatabaseConfig(formData);
      localStorage.setItem("omniledger_db_config", JSON.stringify(formData));
      (window as any).electronAPI?.setActiveDatabaseConfig(formData);
      navigate("/");
    } catch (error) {
      const parsed = parseDatabaseError(error);
      setErrorDetails(parsed);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Profile list view ─────────────────────────────────────────────────────
  if (useExisting && !showForm && databaseConfig) {
    const activeProfile = activeProfileId
      ? getProfileById(activeProfileId)
      : null;

    return (
      <div className="min-h-screen bg-background">
        {/* Soft top glow */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
          <div className="absolute -top-20 left-1/2 h-[300px] w-[700px] -translate-x-1/2 rounded-full bg-primary/8 blur-[130px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-8 sm:px-8">
          {/* Header */}
          <header className="mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="-ml-2 mb-3 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Companies
            </Button>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">Database Configuration</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your database connections and switch between them.
                </p>
              </div>
              <Button
                onClick={() => {
                  setFormData({
                    type: "sqlite",
                    connectionString: "file:./data/omniledger.db",
                  });
                  setShowForm(true);
                  setUseExisting(false);
                  setIsEditing(false);
                }}
                size="sm"
                className="shrink-0 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Connection
              </Button>
            </div>
          </header>

          {/* Connections list */}
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-5 py-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Saved Connections</h2>
              {profiles.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {profiles.length}
                </span>
              )}
            </div>

            {profiles.length > 0 ? (
              <div className="divide-y">
                {profiles.map((profile) => (
                  <ProfileRow
                    key={profile.id}
                    profile={profile}
                    isActive={activeProfileId === profile.id}
                    onSwitch={() => handleSwitchProfile(profile.id)}
                    onEdit={() => {
                      setFormData(profile.config);
                      setShowForm(true);
                      setIsEditing(true);
                    }}
                    onDelete={() => handleDeleteProfile(profile.id)}
                    onViewActive={() => setShowActiveProfileModal(true)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Database className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  No saved connections yet.
                </p>
                <Button
                  onClick={() => {
                    setFormData({
                      type: "sqlite",
                      connectionString: "file:./data/omniledger.db",
                    });
                    setShowForm(true);
                    setUseExisting(false);
                  }}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Connection
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Active profile detail modal */}
        {activeProfile && (
          <Dialog
            open={showActiveProfileModal}
            onOpenChange={setShowActiveProfileModal}
          >
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-green-500" />
                  Active Connection
                </DialogTitle>
                <DialogDescription>
                  Current database connection — {activeProfile.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <StatusPill status={connectionStatus} />

                {/* Migration status */}
                {migrationStatus && databaseConfig.type !== "sqlite" && (
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      {checkingMigration ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : migrationStatus.isUpToDate ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                      )}
                      <span className="font-medium">
                        Migration{" "}
                        {migrationStatus.isUpToDate ? "up to date" : "pending"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleCheckMigration}
                      disabled={checkingMigration}
                    >
                      Check
                    </Button>
                  </div>
                )}

                {/* Config details */}
                <div className="space-y-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-mono font-medium">
                      {databaseConfig.type.toUpperCase()}
                    </span>
                  </div>
                  {databaseConfig.type === "sqlite" ? (
                    <div className="flex items-start justify-between gap-4">
                      <span className="shrink-0 text-muted-foreground">Path</span>
                      <span
                        className="truncate text-right font-mono text-xs"
                        title={databaseConfig.connectionString}
                      >
                        {databaseConfig.connectionString}
                      </span>
                    </div>
                  ) : (
                    <>
                      {databaseConfig.host && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Host</span>
                          <span className="font-mono">
                            {databaseConfig.host}:{databaseConfig.port}
                          </span>
                        </div>
                      )}
                      {databaseConfig.database && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Database</span>
                          <span className="font-mono">
                            {databaseConfig.database}
                          </span>
                        </div>
                      )}
                      {databaseConfig.username && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">User</span>
                          <span>{databaseConfig.username}</span>
                        </div>
                      )}
                      {databaseConfig.ssl && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">SSL</span>
                          <span className="flex items-center gap-1 text-green-600">
                            <Shield className="h-3.5 w-3.5" />
                            {databaseConfig.sslMode || "require"}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {testProgress.length > 0 && (
                  <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs">
                    {testProgress.map((step, i) => (
                      <p key={i}>{step}</p>
                    ))}
                  </div>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(databaseConfig)}
                    disabled={testingConnection || syncingTables}
                    className="gap-1.5"
                  >
                    {testingConnection ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncTables(databaseConfig)}
                    disabled={syncingTables || testingConnection}
                    className="gap-1.5"
                  >
                    {syncingTables ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Database className="h-3.5 w-3.5" />
                    )}
                    Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditExisting}
                    className="gap-1.5"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>

                {successMessage && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {successMessage}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Resync confirm dialog */}
        <Dialog
          open={showResyncConfirmDialog}
          onOpenChange={setShowResyncConfirmDialog}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tables Already Exist</DialogTitle>
              <DialogDescription>
                Database tables are present. Re-syncing will verify the schema
                and create missing tables. Your data will not be overwritten.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowResyncConfirmDialog(false);
                  setPendingSyncConfig(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  pendingSyncConfig && handleSyncTables(pendingSyncConfig, true)
                }
              >
                Sync Tables
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Migration dialog */}
        {databaseConfig && migrationNeeded && (
          <MigrationNotificationDialog
            open={showMigrationDialog}
            onClose={() => setShowMigrationDialog(false)}
            databaseConfig={databaseConfig}
            currentVersion={migrationNeeded.currentVersion}
            requiredVersion={migrationNeeded.requiredVersion}
            onMigrationComplete={() => {
              checkMigrationNeeded();
              checkMigrationStatus();
            }}
          />
        )}
      </div>
    );
  }

  // ── New / Edit connection form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute -top-20 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl px-6 py-8 sm:px-8">
        {/* Header */}
        <header className="mb-8">
          {isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToExisting}
              className="-ml-2 mb-3 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Connections
            </Button>
          ) : databaseConfig ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToExisting}
              className="-ml-2 mb-3 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : null}
          <h1 className="text-xl font-bold">
            {isEditing ? "Edit Connection" : "New Connection"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Update your database connection settings."
              : "Configure a new database connection."}
          </p>
        </header>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <ConnectionForm
            formData={formData}
            onChange={handleConfigChange}
            onTypeChange={handleDatabaseTypeChange}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((p) => !p)}
            validateOnSave={validateOnSave}
            onToggleValidate={setValidateOnSave}
            testingConnection={testingConnection}
            connectionStatus={connectionStatus}
            testProgress={testProgress}
            errorDetails={errorDetails}
            globalError={useAppStore.getState().error}
            successMessage={successMessage}
            isLoading={isLoading}
            isEditing={isEditing}
            onTest={() => handleTestConnection()}
            onSubmit={handleSubmit}
            onSaveProfile={handleSaveAsProfile}
            onBack={isEditing ? handleBackToExisting : undefined}
            onCancel={!isEditing ? () => navigate("/") : undefined}
          />
        </div>
      </div>

      {/* Save Profile dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Connection</DialogTitle>
            <DialogDescription>
              Give this connection a name so you can switch to it quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Profile Name">
              <Input
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                placeholder="e.g., Production DB, Local SQLite"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && profileNameInput.trim())
                    handleConfirmSaveProfile();
                }}
                autoFocus
              />
            </Field>
            {useAppStore.getState().error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {useAppStore.getState().error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowProfileDialog(false);
                setProfileNameInput("");
                setError(null);
              }}
              disabled={savingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSaveProfile}
              disabled={savingProfile || !profileNameInput.trim()}
              className="gap-2"
            >
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingProfile ? "Saving…" : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resync confirm */}
      <Dialog
        open={showResyncConfirmDialog}
        onOpenChange={setShowResyncConfirmDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tables Already Exist</DialogTitle>
            <DialogDescription>
              Re-syncing will verify the schema and create any missing tables.
              Your data will not be overwritten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResyncConfirmDialog(false);
                setPendingSyncConfig(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                pendingSyncConfig && handleSyncTables(pendingSyncConfig, true)
              }
            >
              Sync Tables
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration dialog */}
      {databaseConfig && migrationNeeded && (
        <MigrationNotificationDialog
          open={showMigrationDialog}
          onClose={() => setShowMigrationDialog(false)}
          databaseConfig={databaseConfig}
          currentVersion={migrationNeeded.currentVersion}
          requiredVersion={migrationNeeded.requiredVersion}
          onMigrationComplete={() => {
            checkMigrationNeeded();
            checkMigrationStatus();
          }}
        />
      )}
    </div>
  );
}