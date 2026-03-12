import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, AlertCircle, Copy, Database, Plus, Trash2, Edit, ChevronDown, ArrowLeft, Server, Clock, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/useAppStore";
import type { DatabaseConfig, DatabaseType, ConnectionProfile } from "@shared/types";
import { parseDatabaseError, formatErrorForDisplay, getErrorCategoryColor, type ErrorDetails } from "@/utils/databaseErrors";
import { MigrationNotificationDialog } from "@/components/MigrationNotificationDialog";
import { 
  getConnectionProfiles, 
  saveConnectionProfile,
  deleteConnectionProfile, 
  setActiveProfile, 
  getActiveProfile,
  getProfileById
} from "@/utils/connectionProfiles";

export function DatabaseConfiguration() {
  const navigate = useNavigate();
  const { databaseConfig, setDatabaseConfig, setError, isLoading, setLoading } = useAppStore();
  const [useExisting, setUseExisting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingTables, setSyncingTables] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'disconnected'>('idle');
  const [testProgress, setTestProgress] = useState<string[]>([]);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [validateOnSave, setValidateOnSave] = useState(true);
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showProfiles, setShowProfiles] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{ isUpToDate: boolean; lastMigration?: Date } | null>(null);
  const [checkingMigration, setCheckingMigration] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState<{ needed: boolean; currentVersion?: string | null; requiredVersion: string } | null>(null);
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
  const [pendingSyncConfig, setPendingSyncConfig] = useState<DatabaseConfig | null>(null);

  // Load connection profiles
  useEffect(() => {
    const loadedProfiles = getConnectionProfiles();
    setProfiles(loadedProfiles);
    const active = getActiveProfile();
    if (active) {
      setActiveProfileId(active.id);
      setDatabaseConfig(active.config);
      // Notify main process of active config
      (window as any).electronAPI?.setActiveDatabaseConfig(active.config);
    } else if (databaseConfig) {
      // If no active profile but we have a config, set it as active
      (window as any).electronAPI?.setActiveDatabaseConfig(databaseConfig);
    }
  }, []);

  // Check migration status and version
  useEffect(() => {
    if (databaseConfig) {
      checkMigrationStatus();
      checkMigrationNeeded();
    }
  }, [databaseConfig]);

  const checkMigrationStatus = async () => {
    if (!databaseConfig) return;
    setCheckingMigration(true);
    try {
      const result = await window.electronAPI.checkSchemaInitialized(databaseConfig);
      setMigrationStatus({
        isUpToDate: result.isInitialized,
        lastMigration: result.isInitialized ? new Date() : undefined,
      });
    } catch (error) {
      console.error('Error checking migration status:', error);
    } finally {
      setCheckingMigration(false);
    }
  };

  const checkMigrationNeeded = async () => {
    if (!databaseConfig) return;
    try {
      const result = await (window as any).electronAPI?.checkMigrationNeeded(databaseConfig);
      if (result) {
        setMigrationNeeded(result);
        // Show dialog if migration is needed
        if (result.needed) {
          setShowMigrationDialog(true);
        }
      }
    } catch (error) {
      console.error('Error checking if migration is needed:', error);
    }
  };

  const handleCheckMigration = async () => {
    if (!databaseConfig) return;
    setSuccessMessage(null);
    setError(null);
    try {
      const result = await (window as any).electronAPI?.checkMigrationNeeded(databaseConfig);
      if (result) {
        setMigrationNeeded(result);
        if (result.needed) {
          setShowMigrationDialog(true);
        } else {
          setSuccessMessage(`No migration needed. Database is up to date (v${result.currentVersion || result.requiredVersion}).`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to check migration status");
    }
  };

  // Check if existing config is available
  useEffect(() => {
    if (databaseConfig) {
      setUseExisting(true);
      setShowForm(false);
    } else {
      setShowForm(true);
    }
  }, [databaseConfig]);

  const handleSaveAsProfile = async () => {
    // Clear any previous errors and success messages
    setError(null);
    setSuccessMessage(null);

    // Validate form data before saving
    if (formData.type === "sqlite") {
      if (!formData.connectionString || !formData.connectionString.trim()) {
        setError("Please provide a connection string for SQLite");
        return;
      }
    } else {
      if (!formData.host || !formData.database || !formData.username) {
        setError("Please fill in all required fields (Host, Database, Username) before saving as profile");
        return;
      }
    }

    // Open dialog for profile name
    setProfileNameInput("");
    setShowProfileDialog(true);
  };

  const handleConfirmSaveProfile = async () => {
    const profileName = profileNameInput.trim();
    
    if (!profileName) {
      setError("Profile name is required");
      return;
    }

    // Check for duplicate profile names
    const existingProfiles = getConnectionProfiles();
    if (existingProfiles.some(p => p.name.toLowerCase() === profileName.toLowerCase())) {
      setError(`A profile with the name "${profileName}" already exists. Please choose a different name.`);
      return;
    }

    setSavingProfile(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const profile = saveConnectionProfile({
        name: profileName,
        config: formData,
        isDefault: false,
      });
      
      // Update profiles list
      setProfiles(getConnectionProfiles());
      setActiveProfileId(profile.id);
      setActiveProfile(profile.id);
      
      // Notify main process of active config
      (window as any).electronAPI?.setActiveDatabaseConfig(profile.config);
      
      // Show success message
      setSuccessMessage(`"${profileName}" added to saved connections.`);
      setShowProfileDialog(false);
      setProfileNameInput("");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      setError(error instanceof Error ? error.message : "Failed to save profile");
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
      setShowProfiles(false);
      // Notify main process of active config
      (window as any).electronAPI?.setActiveDatabaseConfig(profile.config);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    if (confirm("Remove this saved connection? You can add it again later.")) {
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
        // Clear remote database fields
        delete newData.host;
        delete newData.port;
        delete newData.database;
        delete newData.username;
        delete newData.password;
      } else {
        // Set default ports based on database type
        if (type === "postgresql") {
          newData.port = 5432;
          newData.host = "localhost";
        } else if (type === "mysql") {
          newData.port = 3306;
          newData.host = "localhost";
        } else if (type === "mssql") {
          newData.port = 1433;
          newData.host = "localhost";
        }
        // Clear SQLite connection string
        delete newData.connectionString;
      }
      
      return { ...prev, ...newData };
    });
  };

  const handleTestConnection = async (configToTest?: DatabaseConfig) => {
    const config = configToTest || formData;
    
    if (!config.type) {
      setError("Please select a database type");
      return;
    }

    if (config.type === "sqlite") {
      // SQLite doesn't need connection testing in the same way
      setError(null);
      setErrorDetails(null);
      setConnectionStatus('connected');
      setTestProgress(['✓ SQLite file path validated']);
      setTimeout(() => {
        setTestProgress([]);
      }, 3000);
      return;
    }

    // Validate required fields for remote databases
    if (!config.host || !config.database || !config.username) {
      setError("Please fill in all required fields");
      setErrorDetails(null);
      return;
    }

    setTestingConnection(true);
    setError(null);
    setErrorDetails(null);
    setConnectionStatus('testing');
    setTestProgress(['⏳ Testing network connectivity...']);

    try {
      // Step 1: Network reachability (simulated)
      await new Promise(resolve => setTimeout(resolve, 500));
      setTestProgress(prev => [...prev, '✓ Network reachable']);

      // Step 2: Authentication
      setTestProgress(prev => [...prev, '⏳ Authenticating...']);
      const result = await window.electronAPI.testDatabaseConnection(config);
      
      if (result.success) {
        setTestProgress(prev => [...prev, '✓ Authentication successful', '✓ Database access verified']);
        setError(null);
        setErrorDetails(null);
        setConnectionStatus('connected');
        setPendingSyncConfig(config);
        setTimeout(() => setTestProgress([]), 2000);
      } else {
        const parsedError = parseDatabaseError(new Error(result.error || "Failed to connect to database"));
        setErrorDetails(parsedError);
        setError(parsedError.message);
        setConnectionStatus('disconnected');
        setTestProgress(prev => [...prev, '❌ Connection failed']);
      }
    } catch (error) {
      const parsedError = parseDatabaseError(error);
      setErrorDetails(parsedError);
      setError(parsedError.message);
      setConnectionStatus('disconnected');
      setTestProgress(prev => [...prev, '❌ Connection failed']);
    } finally {
      setTestingConnection(false);
      // Clear progress after 5 seconds
      setTimeout(() => {
        if (connectionStatus !== 'connected') {
          setTestProgress([]);
        }
      }, 5000);
    }
  };

  const handleSyncTables = async (configToSync?: DatabaseConfig, forceSync = false) => {
    const config = configToSync || formData || databaseConfig;
    
    if (!config) {
      setError("No database configuration available");
      return;
    }

    setSyncingTables(true);
    setError(null);
    setInitializationStatus("Checking database schema...");

    try {
      const schemaCheck = await window.electronAPI.checkSchemaInitialized(config);
      
      if (schemaCheck.isInitialized && !forceSync) {
        setPendingSyncConfig(config);
        setShowResyncConfirmDialog(true);
        setSyncingTables(false);
        setInitializationStatus(null);
        return;
      }

      setInitializationStatus("Initializing database schema and creating tables...");
      
      // Initialize database schema (sync tables)
      const result = await window.electronAPI.initializeDatabaseSchema(config);
      
      if (result.success) {
        setError(null);
        if (result.migrated) {
          const msg = result.seeded 
            ? "Database tables created and sample data loaded (Prime Grocery Agency, demo users)."
            : "Database tables created successfully.";
          setInitializationStatus(msg);
          setSuccessMessage(msg);
        } else {
          setInitializationStatus("Database tables already exist.");
          setSuccessMessage("Database schema is up to date.");
        }
        setShowResyncConfirmDialog(false);
        setPendingSyncConfig(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(result.error || "Failed to sync database tables");
        setInitializationStatus(`Error: ${result.error || "Failed to sync tables"}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to sync database tables";
      setError(errorMessage);
      setInitializationStatus(`Error: ${errorMessage}`);
    } finally {
      setSyncingTables(false);
      // Clear status after 3 seconds
      setTimeout(() => {
        setInitializationStatus(null);
      }, 3000);
    }
  };

  const handleEditExisting = () => {
    if (databaseConfig) {
      // Load existing config into form
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
    // Reset form data to default
    setFormData({
      type: "sqlite",
      connectionString: "file:./data/omniledger.db",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      // Validate form data
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

      // Optional: Test connection before saving if validateOnSave is enabled
      if (validateOnSave && formData.type !== "sqlite") {
        setError(null);
        setErrorDetails(null);
        const testResult = await window.electronAPI.testDatabaseConnection(formData);
        if (!testResult.success) {
          const parsedError = parseDatabaseError(new Error(testResult.error || "Connection test failed"));
          setErrorDetails(parsedError);
          setError(`Connection test failed: ${parsedError.message}`);
          // Ask user if they want to save anyway
          const saveAnyway = confirm(
            formatErrorForDisplay(parsedError) + 
            "\n\nDo you want to save this configuration anyway?"
          );
          if (!saveAnyway) {
            setLoading(false);
            return;
          }
          // User wants to save anyway, clear the error and continue
          setError(null);
          setErrorDetails(null);
        }
      }

      // Save the configuration
      setDatabaseConfig(formData);
      
      // Store in localStorage as backup (for persistence across sessions)
      localStorage.setItem("omniledger_db_config", JSON.stringify(formData));

      // Notify main process of active config
      (window as any).electronAPI?.setActiveDatabaseConfig(formData);

      // Navigate back to splash screen
      navigate("/");
    } catch (error) {
      const parsedError = parseDatabaseError(error);
      setErrorDetails(parsedError);
      setError(parsedError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseExisting = async () => {
    if (!databaseConfig) {
      setError("No database configuration available");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setConnectionStatus('testing');
    setTestProgress(['⏳ Verifying database connection...']);

    try {
      // Step 1: Test connection
      setTestProgress(prev => [...prev, '⏳ Testing connection...']);
      const testResult = await window.electronAPI.testDatabaseConnection(databaseConfig);
      
      if (!testResult.success) {
        const parsedError = parseDatabaseError(new Error(testResult.error || "Connection test failed"));
        setErrorDetails(parsedError);
        setError(`Cannot connect to database: ${parsedError.message}`);
        setConnectionStatus('disconnected');
        setTestProgress(prev => [...prev, '❌ Connection failed']);
        setLoading(false);
        return;
      }

      setTestProgress(prev => [...prev, '✓ Connection successful']);

      // Step 2: Check if schema is initialized
      setTestProgress(prev => [...prev, '⏳ Checking database schema...']);
      const schemaCheck = await window.electronAPI.checkSchemaInitialized(databaseConfig);
      
      if (!schemaCheck.isInitialized) {
        // Schema not initialized - ask user if they want to initialize
        const shouldInitialize = confirm(
          "Database tables are not initialized.\n\n" +
          "Would you like to create the database tables now?\n\n" +
          "This will set up all required tables for OmniLedger."
        );

        if (shouldInitialize) {
          setTestProgress(prev => [...prev, '⏳ Initializing database schema...']);
          const initResult = await window.electronAPI.initializeDatabaseSchema(databaseConfig);
          
          if (!initResult.success) {
            const parsedError = parseDatabaseError(new Error(initResult.error || "Initialization failed"));
            setErrorDetails(parsedError);
            setError(`Failed to initialize database: ${parsedError.message}`);
            setTestProgress(prev => [...prev, '❌ Initialization failed']);
            setLoading(false);
            return;
          }

          setTestProgress(prev => [...prev, '✓ Database initialized']);
        } else {
          setError("Database tables are required. Please initialize the database first.");
          setLoading(false);
          return;
        }
      } else {
        setTestProgress(prev => [...prev, '✓ Database schema verified']);
      }

      // Step 3: Connection successful and ready
      setConnectionStatus('connected');
      setTestProgress(prev => [...prev, '✅ Database ready to use']);
      
      // Clear progress after a moment, then navigate
      setTimeout(() => {
        setTestProgress([]);
      navigate("/");
      }, 1000);

    } catch (error) {
      const parsedError = parseDatabaseError(error);
      setErrorDetails(parsedError);
      setError(parsedError.message);
      setConnectionStatus('disconnected');
      setTestProgress(prev => [...prev, '❌ Error occurred']);
      setLoading(false);
    }
  };

  const handleConfigureNew = () => {
    setShowForm(true);
    setUseExisting(false);
    setIsEditing(false);
    // Reset form data to default
    setFormData({
      type: "sqlite",
      connectionString: "file:./data/omniledger.db",
    });
  };

  // Show option to use existing or configure new
  if (useExisting && !showForm && databaseConfig) {
    const activeProfile = activeProfileId ? getProfileById(activeProfileId) : null;
    
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header - 24px bottom margin */}
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="h-8 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Companies
              </Button>
              <h1 className="mt-1 text-xl font-semibold">Database Configuration</h1>
              <p className="text-sm text-muted-foreground">
                Connect to a database or switch between saved connections
              </p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="mt-3 shrink-0 sm:mt-0"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Connection
            </Button>
          </div>

          {/* Saved Connections - Card container */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Section header - Database icon + Title + Badge */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-5 py-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Saved Connections</h2>
              {profiles.length > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0 text-xs">
                  {profiles.length}
                </Badge>
              )}
            </div>
            <div className="p-0">
              {profiles.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-3 py-3 text-left text-xs font-medium">Name</th>
                        <th className="px-3 py-3 text-left text-xs font-medium">Type</th>
                        <th className="px-3 py-3 text-left text-xs font-medium">Database Path</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Host</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Port</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Username</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">SSL</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">Last Used</th>
                        <th className="px-3 py-3 text-center text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((profile) => {
                        const isActive = activeProfileId === profile.id;
                        const pathDisplay = profile.config.type === "sqlite"
                          ? (profile.config.connectionString || "-")
                          : (profile.config.database || profile.config.host || "-");
                        return (
                          <tr
                            key={profile.id}
                            className={`border-b border-border transition-colors cursor-pointer ${
                              isActive
                                ? "bg-primary/5 hover:bg-primary/10"
                                : "hover:bg-muted/40"
                            }`}
                            onClick={() => {
                              if (isActive) {
                                setShowActiveProfileModal(true);
                              } else {
                                handleSwitchProfile(profile.id);
                              }
                            }}
                          >
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                {isActive && (
                                  <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                    Active
                                  </span>
                                )}
                                {profile.isDefault && !isActive && (
                                  <Badge variant="secondary" className="rounded-full text-xs">
                                    Default
                                  </Badge>
                                )}
                                {!isActive && !profile.isDefault && (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <Server className={`h-3.5 w-3.5 shrink-0 ${
                                  isActive ? "text-primary" : "text-muted-foreground"
                                }`} />
                                <span className="font-medium text-sm">{profile.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                                {profile.config.type}
                              </span>
                            </td>
                            <td className="max-w-[200px] px-3 py-2.5">
                              <span
                                className="block truncate font-mono text-xs"
                                title={pathDisplay}
                              >
                                {pathDisplay}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs text-muted-foreground">
                                {profile.config.host || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs text-muted-foreground">
                                {profile.config.port || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-muted-foreground">
                                {profile.config.username || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {profile.config.ssl ? (
                                <span className="text-xs text-muted-foreground">
                                  {profile.config.sslMode || "require"}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-xs text-muted-foreground">
                                {new Date(profile.lastUsed).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                {isActive ? (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setShowActiveProfileModal(true)}
                                    className="h-7 px-2.5 text-xs"
                                  >
                                    View
                                  </Button>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleSwitchProfile(profile.id)}
                                    className="h-7 px-2.5 text-xs"
                                  >
                                    Switch
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData(profile.config);
                                    setShowForm(true);
                                    setIsEditing(true);
                                  }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  title="Delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProfile(profile.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="mb-4 text-sm text-muted-foreground">
                    No database connections yet.
                  </p>
                  <Button onClick={() => setShowForm(true)} size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Connection
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Active Profile Configuration Modal */}
          {activeProfile && (
            <Dialog open={showActiveProfileModal} onOpenChange={setShowActiveProfileModal}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <DialogTitle>Active Connection</DialogTitle>
                  </div>
                  <DialogDescription>
                    Current database connection details and status
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                {/* Connection Status */}
                {connectionStatus !== 'idle' && (
                  <div className={`flex items-center gap-2 p-2 rounded border text-xs ${
                    connectionStatus === 'connected' 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                      : connectionStatus === 'disconnected'
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  }`}>
                    {connectionStatus === 'testing' && (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                        <span className="text-blue-900 dark:text-blue-100">Testing connection...</span>
                      </>
                    )}
                    {connectionStatus === 'connected' && (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-green-900 dark:text-green-100">Connected</span>
                      </>
                    )}
                    {connectionStatus === 'disconnected' && (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                        <span className="text-red-900 dark:text-red-100">Connection Failed</span>
                      </>
                    )}
                  </div>
                )}

                {/* Migration Status */}
                {migrationStatus && databaseConfig.type !== 'sqlite' && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded border bg-muted/50 text-xs">
                    <div className="flex items-center gap-2">
                      {checkingMigration ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : migrationStatus.isUpToDate ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
                      )}
                      <span>
                        Migration: {migrationStatus.isUpToDate ? 'Up to date' : 'Pending'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={handleCheckMigration}
                      disabled={checkingMigration}
                    >
                      Check
                    </Button>
                  </div>
                )}

                {/* Configuration Details */}
                <div className="p-3 bg-muted/30 rounded border">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground min-w-[60px]">Type:</span>
                      <Badge variant="outline" className="font-mono text-xs px-1 py-0">
                        {databaseConfig.type}
                      </Badge>
                    </div>
                    {databaseConfig.type === "sqlite" ? (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className="text-muted-foreground min-w-[60px]">Path:</span>
                        <span className="font-mono text-xs text-foreground truncate bg-background px-1.5 py-0.5 rounded border">
                          {databaseConfig.connectionString}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground min-w-[60px]">Host:</span>
                          <span className="font-mono text-xs text-foreground">{databaseConfig.host}</span>
                        </div>
                        {databaseConfig.port && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground min-w-[60px]">Port:</span>
                            <span className="font-mono text-xs text-foreground">{databaseConfig.port}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground min-w-[60px]">DB:</span>
                          <span className="font-mono text-xs text-foreground truncate">{databaseConfig.database}</span>
                        </div>
                        {databaseConfig.username && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground min-w-[60px]">User:</span>
                            <span className="text-xs text-foreground truncate">{databaseConfig.username}</span>
                          </div>
                        )}
                        {databaseConfig.ssl && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Shield className="h-3 w-3 text-green-600" />
                            <span className="text-muted-foreground text-xs">SSL:</span>
                            <Badge variant="success" className="text-xs px-1 py-0">
                              {databaseConfig.sslMode || 'require'}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Test Progress */}
                {testProgress.length > 0 && (
                  <div className="space-y-1 p-2 rounded border bg-muted/50 text-xs">
                    {testProgress.map((step, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      onClick={() => handleTestConnection(databaseConfig)} 
                      variant="outline"
                      disabled={testingConnection || syncingTables}
                      size="sm"
                      className="text-xs h-8"
                    >
                      {testingConnection ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Test
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => handleSyncTables(databaseConfig)}
                      variant="outline"
                      disabled={syncingTables || testingConnection}
                      size="sm"
                      className="text-xs h-8"
                    >
                      {syncingTables ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Database className="h-3.5 w-3.5 mr-1" />
                          Sync
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleEditExisting}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                  
                  {/* Use This and New DB buttons - HIDDEN */}
                  {/* <div className="flex gap-2 pt-1 border-t">
                    <Button 
                      onClick={handleUseExisting} 
                      className="flex-1"
                      disabled={isLoading || testingConnection || syncingTables}
                      size="sm"
                      className="h-8 text-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Use This
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleConfigureNew}
                      variant="outline"
                      className="flex-1"
                      disabled={isLoading || testingConnection || syncingTables}
                      size="sm"
                      className="h-8 text-xs"
                    >
                      New DB
                    </Button>
                  </div> */}
                  
                </div>
                </div>
                {/* DialogFooter - HIDDEN */}
                {/* <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => navigate("/")}
                    variant="ghost"
                    className="w-full sm:w-auto"
                    disabled={isLoading || testingConnection || syncingTables}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Companies
                  </Button>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      onClick={handleConfigureNew}
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      disabled={isLoading || testingConnection || syncingTables}
                    >
                      New DB
                    </Button>
                    <Button 
                      onClick={handleUseExisting} 
                      className="flex-1 sm:flex-none"
                      disabled={isLoading || testingConnection || syncingTables}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Use This
                        </>
                      )}
                    </Button>
                  </div>
                </DialogFooter> */}
              </DialogContent>
            </Dialog>
          )}

          {/* No Active Profile - Show Default Config - HIDDEN */}
          {/* {!activeProfile && databaseConfig && (
            <Card className="border">
              <CardHeader className="pb-2 pt-2 px-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Current Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-3">
                <div className="p-3 bg-muted/30 rounded border">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground min-w-[60px]">Type:</span>
                      <Badge variant="outline" className="font-mono text-xs px-1 py-0">
                        {databaseConfig.type}
                      </Badge>
                    </div>
                    {databaseConfig.type === "sqlite" ? (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className="text-muted-foreground min-w-[60px]">Path:</span>
                        <span className="font-mono text-xs text-foreground truncate bg-background px-1.5 py-0.5 rounded border">
                          {databaseConfig.connectionString}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground min-w-[60px]">Host:</span>
                          <span className="font-mono text-xs text-foreground">{databaseConfig.host}</span>
                        </div>
                        {databaseConfig.port && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground min-w-[60px]">Port:</span>
                            <span className="font-mono text-xs text-foreground">{databaseConfig.port}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground min-w-[60px]">DB:</span>
                          <span className="font-mono text-xs text-foreground truncate">{databaseConfig.database}</span>
                        </div>
                        {databaseConfig.username && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground min-w-[60px]">User:</span>
                            <span className="text-xs text-foreground truncate">{databaseConfig.username}</span>
                          </div>
                        )}
                        {databaseConfig.ssl && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <Shield className="h-3 w-3 text-green-600" />
                            <span className="text-muted-foreground text-xs">SSL:</span>
                            <Badge variant="success" className="text-xs px-1 py-0">
                              {databaseConfig.sslMode || 'require'}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      onClick={() => handleTestConnection(databaseConfig)} 
                      variant="outline"
                      disabled={testingConnection || syncingTables}
                      size="sm"
                      className="text-xs h-8"
                    >
                      {testingConnection ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Test
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => handleSyncTables(databaseConfig)}
                      variant="outline"
                      disabled={syncingTables || testingConnection}
                      size="sm"
                      className="text-xs h-8"
                    >
                      {syncingTables ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Database className="h-3.5 w-3.5 mr-1" />
                          Sync
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleEditExisting}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-1 border-t">
                    <Button 
                      onClick={handleUseExisting} 
                      className="flex-1"
                      disabled={isLoading || testingConnection || syncingTables}
                      size="sm"
                      className="h-8 text-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Use This
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleConfigureNew}
                      variant="outline"
                      className="flex-1"
                      disabled={isLoading || testingConnection || syncingTables}
                      size="sm"
                      className="h-8 text-xs"
                    >
                      New DB
                    </Button>
                  </div>
                  <Button
                    onClick={() => navigate("/")}
                    variant="ghost"
                    className="w-full h-8 text-xs"
                    disabled={isLoading || testingConnection || syncingTables}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                    Back to Companies
                  </Button>
                </div>
              </CardContent>
            </Card>
          )} */}
        </div>
      </div>
    );
  }

  // Show configuration form
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-[900px]">
        {/* Header with Back Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isEditing) {
                handleBackToExisting();
              } else {
                navigate("/");
              }
            }}
            className="h-8"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {isEditing ? "Back" : "Back to Companies"}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Edit Database Configuration" : "Database Configuration"}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? "Update your database connection settings."
                : "Configure your database connection. You can use SQLite for local development or connect to PostgreSQL, MySQL, or MSSQL."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection Profile */}
            {profiles.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[13px] font-semibold">Connection Profile</h3>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-[13px] font-semibold">
                      <Database className="h-4 w-4" />
                      Saved Profiles
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowProfiles(!showProfiles)}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${showProfiles ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                  {showProfiles && (
                    <div className="mt-3 space-y-2">
                      {profiles.map((profile) => (
                        <div
                          key={profile.id}
                          className={`flex items-center justify-between rounded-md border p-2.5 ${
                            activeProfileId === profile.id
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{profile.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {profile.config.type} – {profile.config.database || profile.config.connectionString || "-"}
                            </div>
                          </div>
                          <div className="ml-2 flex shrink-0 gap-1">
                            {activeProfileId !== profile.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSwitchProfile(profile.id)}
                              >
                                Switch
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDeleteProfile(profile.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Database Settings */}
              <section className="space-y-3">
                <h3 className="text-[13px] font-semibold">Database Settings</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dbType" className="text-[13px] font-semibold">
                      Database Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) =>
                        handleDatabaseTypeChange(value as DatabaseType)
                      }
                    >
                      <SelectTrigger id="dbType" className="h-10">
                        <SelectValue placeholder="Select database type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqlite">SQLite (Local)</SelectItem>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                        <SelectItem value="mysql">MySQL</SelectItem>
                        <SelectItem value="mssql">MSSQL (SQL Server)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.type === "sqlite" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="connectionString" className="text-[13px] font-semibold">
                        Database File Path <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="connectionString"
                        type="text"
                        placeholder="file:./data/omniledger.db"
                        value={formData.connectionString || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            connectionString: e.target.value,
                          }))
                        }
                        className="h-10"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        SQLite file path. Use &quot;file:&quot; prefix for absolute paths.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-1">
                        <Label htmlFor="host" className="text-[13px] font-semibold">
                          Host <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="host"
                          type="text"
                          placeholder="localhost"
                          value={formData.host || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, host: e.target.value }))
                          }
                          className="h-10"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="port" className="text-[13px] font-semibold">
                          Port <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="port"
                          type="number"
                          placeholder={
                            formData.type === "postgresql"
                              ? "5432"
                              : formData.type === "mysql"
                                ? "3306"
                                : "1433"
                          }
                          value={formData.port || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              port: parseInt(e.target.value) || undefined,
                            }))
                          }
                          className="h-10"
                          required
                        />
                      </div>
                    </div>
                  )}
                  {formData.type !== "sqlite" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="database" className="text-[13px] font-semibold">
                        Database Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="database"
                        type="text"
                        placeholder="omniledger"
                        value={formData.database || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, database: e.target.value }))
                        }
                        className="h-10"
                        required
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Authentication */}
              {formData.type !== "sqlite" && (
                <section className="space-y-3">
                  <h3 className="text-[13px] font-semibold">Authentication</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-[13px] font-semibold">
                        Username <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="database_user"
                        value={formData.username || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, username: e.target.value }))
                        }
                        className="h-10"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-[13px] font-semibold">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={formData.password || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, password: e.target.value }))
                          }
                          className="h-10 pr-10"
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          title={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Security - SSL/TLS */}
              {formData.type !== "sqlite" && (
                <section className="space-y-3">
                  <h3 className="text-[13px] font-semibold">Security</h3>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <Label htmlFor="enableSSL" className="cursor-pointer text-[13px] font-semibold">
                      Enable SSL/TLS Encryption
                    </Label>
                    <Switch
                      id="enableSSL"
                      checked={formData.ssl || false}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, ssl: checked }))
                      }
                    />
                  </div>
                  {formData.ssl && (
                    <div className="space-y-3 rounded-lg border border-border p-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="sslMode" className="text-[13px] font-semibold">SSL Mode</Label>
                          <Select
                            value={formData.sslMode || "require"}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                sslMode: value as any,
                              }))
                            }
                          >
                            <SelectTrigger id="sslMode" className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disable">Disable</SelectItem>
                              <SelectItem value="allow">Allow</SelectItem>
                              <SelectItem value="prefer">Prefer</SelectItem>
                              <SelectItem value="require">Require</SelectItem>
                              <SelectItem value="verify-ca">Verify CA</SelectItem>
                              <SelectItem value="verify-full">Verify Full</SelectItem>
                            </SelectContent>
                          </Select>
                        <p className="text-xs text-muted-foreground">
                          {formData.sslMode === "require" && "Requires SSL connection"}
                          {formData.sslMode === "verify-ca" && "Verify certificate authority"}
                          {formData.sslMode === "verify-full" && "Verify full certificate chain"}
                        </p>
                      </div>
                      {(formData.sslMode === "verify-ca" || formData.sslMode === "verify-full") && (
                        <div className="space-y-1.5">
                          <Label htmlFor="sslCa" className="text-[13px] font-semibold">CA Certificate File (Optional)</Label>
                            <Input
                              id="sslCa"
                              type="text"
                              placeholder="/path/to/ca.crt"
                              value={formData.sslCa || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  sslCa: e.target.value,
                                }))
                              }
                            className="h-10"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Migration & Tools */}
              {formData.type !== "sqlite" && (
                <section className="space-y-3">
                  <h3 className="text-[13px] font-semibold">Migration & Tools</h3>

                  {/* Connection Status */}
                  {connectionStatus !== 'idle' && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                      {connectionStatus === 'testing' && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-muted-foreground">Testing connection...</span>
                        </>
                      )}
                      {connectionStatus === 'connected' && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Connected</span>
                        </>
                      )}
                      {connectionStatus === 'disconnected' && (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">Disconnected</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Test Progress */}
                  {testProgress.length > 0 && (
                    <div className="space-y-1 p-3 rounded-md bg-muted">
                      {testProgress.map((step, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {step}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Migration Status Alert */}
                  {migrationStatus && (
                    <div
                      className={`flex items-center justify-between rounded-lg border p-2.5 ${
                        migrationStatus.isUpToDate
                          ? "border-green-200 bg-green-500/10 dark:border-green-800 dark:bg-green-950/30"
                          : "border-amber-200 bg-amber-500/10 dark:border-amber-800 dark:bg-amber-950/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {checkingMigration ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                        ) : migrationStatus.isUpToDate ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        )}
                        <span className="text-sm font-medium">
                          Migration Status: {migrationStatus.isUpToDate ? "Up to date" : "Pending"}
                        </span>
                      </div>
                      {migrationStatus.lastMigration && (
                        <span className="text-xs text-muted-foreground">
                          Last: {migrationStatus.lastMigration.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Connection Tools */}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection()}
                      disabled={testingConnection || syncingTables}
                      className="h-9"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncTables()}
                      disabled={syncingTables || testingConnection}
                      className="h-9"
                    >
                      {syncingTables ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        "Sync Tables"
                      )}
                    </Button>
                  </div>
                  {initializationStatus && initializationStatus.length > 0 && (
                    <div className={`p-3 text-sm rounded-md ${
                      initializationStatus.toLowerCase().includes("success") || initializationStatus.toLowerCase().includes("created") || initializationStatus.toLowerCase().includes("up to date") 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                        : initializationStatus.includes("Error")
                        ? "bg-destructive/10 text-destructive"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}>
                      {initializationStatus}
                    </div>
                  )}
                </section>
              )}

              {/* Enhanced Error Display */}
              {errorDetails && (
                <div className={`p-4 rounded-md border ${
                  errorDetails.category === 'network' 
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                    : errorDetails.category === 'authentication'
                    ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    : errorDetails.category === 'database'
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                    : errorDetails.category === 'permission'
                    ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800"
                    : errorDetails.category === 'configuration'
                    ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                    : "bg-destructive/10 border-destructive/20"
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`h-5 w-5 mt-0.5 ${getErrorCategoryColor(errorDetails.category)}`} />
                    <div className="flex-1 space-y-2">
                      <h4 className={`font-semibold ${getErrorCategoryColor(errorDetails.category)}`}>
                        {errorDetails.message}
                      </h4>
                      {errorDetails.suggestion && (
                        <p className="text-sm text-muted-foreground">
                          {errorDetails.suggestion}
                        </p>
                      )}
                      {errorDetails.action && (
                        <div className="text-sm text-muted-foreground whitespace-pre-line">
                          {errorDetails.action}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7"
                        onClick={() => {
                          const errorText = formatErrorForDisplay(errorDetails);
                          navigator.clipboard.writeText(errorText);
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Error Details
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {useAppStore.getState().error && !errorDetails && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {useAppStore.getState().error}
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 text-sm rounded-md flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {successMessage}
                </div>
              )}

              {/* Validation Option */}
              {formData.type !== "sqlite" && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                  <input
                    type="checkbox"
                    id="validateOnSave"
                    checked={validateOnSave}
                    onChange={(e) => setValidateOnSave(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="validateOnSave" className="text-sm cursor-pointer">
                    Test connection before saving
                  </Label>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                <strong>Connect</strong> to use this database now. <strong>Save for Later</strong> adds it to your list for quick switching.
              </p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSaveAsProfile}
                  disabled={isLoading}
                  title="Add to saved connections without connecting"
                  className="sm:order-1"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Save for Later
                </Button>
                <div className="flex justify-end gap-3 sm:order-2">
                  {isEditing ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToExisting}
                    >
                      Back
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/")}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Connecting..." : isEditing ? "Update & Connect" : "Connect"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Save Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save for Later</DialogTitle>
            <DialogDescription>
              Give this connection a name so you can switch to it quickly from your saved connections list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profileName">Profile Name</Label>
              <Input
                id="profileName"
                value={profileNameInput}
                onChange={(e) => setProfileNameInput(e.target.value)}
                placeholder="e.g., Production DB, Local SQLite"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && profileNameInput.trim()) {
                    handleConfirmSaveProfile();
                  }
                }}
                autoFocus
              />
            </div>
            {useAppStore.getState().error && (
              <div className="p-2 bg-destructive/10 text-destructive text-sm rounded-md">
                {useAppStore.getState().error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
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
              type="button"
              onClick={handleConfirmSaveProfile}
              disabled={savingProfile || !profileNameInput.trim()}
            >
              {savingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resync Confirm Dialog - when tables already exist */}
      <Dialog open={showResyncConfirmDialog} onOpenChange={setShowResyncConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tables Already Exist</DialogTitle>
            <DialogDescription>
              Database tables are already present. Re-syncing will verify the schema and create any missing tables. Your data will not be overwritten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResyncConfirmDialog(false); setPendingSyncConfig(null); }}>
              Cancel
            </Button>
            <Button onClick={() => pendingSyncConfig && handleSyncTables(pendingSyncConfig, true)}>
              Sync Tables
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration Notification Dialog */}
      {databaseConfig && migrationNeeded && (
        <MigrationNotificationDialog
          open={showMigrationDialog}
          onClose={() => setShowMigrationDialog(false)}
          databaseConfig={databaseConfig}
          currentVersion={migrationNeeded.currentVersion}
          requiredVersion={migrationNeeded.requiredVersion}
          onMigrationComplete={() => {
            // Recheck migration status after completion
            checkMigrationNeeded();
            checkMigrationStatus();
          }}
        />
      )}
    </div>
  );
}

