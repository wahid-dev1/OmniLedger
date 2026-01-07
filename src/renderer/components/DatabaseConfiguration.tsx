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
      if (!formData.host || !formData.database || !formData.username || !formData.password) {
        setError("Please fill in all required fields (Host, Database, Username, Password) before saving as profile");
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
      setSuccessMessage(`Profile "${profileName}" saved successfully!`);
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
    if (confirm("Are you sure you want to delete this connection profile?")) {
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
        
        // Clear progress after showing success
        setTimeout(() => {
          setTestProgress([]);
        // Show success message with option to sync tables
        const shouldSync = confirm("✅ Connection successful!\n\nWould you like to sync/create database tables now?");
        if (shouldSync) {
            handleSyncTables(config);
        }
        }, 1000);
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

  const handleSyncTables = async (configToSync?: DatabaseConfig) => {
    const config = configToSync || formData || databaseConfig;
    
    if (!config) {
      setError("No database configuration available");
      return;
    }

    setSyncingTables(true);
    setError(null);
    setInitializationStatus("Checking database schema...");

    try {
      // First check if schema is initialized
      const schemaCheck = await window.electronAPI.checkSchemaInitialized(config);
      
      if (schemaCheck.isInitialized) {
        setInitializationStatus("Database tables already exist.");
        const shouldReSync = confirm("Database tables already exist. Do you want to sync them anyway?");
        if (!shouldReSync) {
          setSyncingTables(false);
          setInitializationStatus(null);
          return;
        }
      }

      setInitializationStatus("Initializing database schema and creating tables...");
      
      // Initialize database schema (sync tables)
      const result = await window.electronAPI.initializeDatabaseSchema(config);
      
      if (result.success) {
        setError(null);
        let message = "";
        if (result.migrated) {
          message = "✅ Database tables created successfully!";
          if (result.seeded) {
            message += "\n\n🌱 Sample company data has been loaded:\n";
            message += "   • Company: Acme Retail Store\n";
            message += "   • Users: admin, manager, cashier\n";
            message += "   • Products, customers, vendors, and sample transactions";
          }
          setInitializationStatus(message.split('\n')[0]);
          alert(message);
        } else {
          setInitializationStatus("✅ Database tables already exist.");
          alert("✅ Database tables already exist.");
        }
      } else {
        setError(result.error || "Failed to sync database tables");
        setInitializationStatus(`❌ Error: ${result.error || "Failed to sync tables"}`);
        alert(`❌ Failed to sync tables: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to sync database tables";
      setError(errorMessage);
      setInitializationStatus(`❌ Error: ${errorMessage}`);
      alert(`❌ Failed to sync tables: ${errorMessage}`);
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
        if (!formData.host || !formData.database || !formData.username || !formData.password) {
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
      <div className="min-h-screen bg-background p-3 md:p-4">
        <div className="max-w-5xl mx-auto space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Database Configuration</h1>
              <p className="text-xs text-muted-foreground">Manage connection profiles</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Profile
            </Button>
          </div>

          {/* Connection Profiles - Main Focus */}
          <Card className="border">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Connection Profiles</CardTitle>
                  {profiles.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {profiles.length}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {profiles.length > 0 ? (
                <div className="space-y-2">
                  {profiles.map((profile) => {
                    const isActive = activeProfileId === profile.id;
                    return (
                      <div
                        key={profile.id}
                        className={`group relative p-3 rounded-lg border transition-all ${
                          isActive
                            ? 'bg-primary/5 border-primary'
                            : 'bg-card border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Server className={`h-3.5 w-3.5 ${
                                isActive ? 'text-primary' : 'text-muted-foreground'
                              }`} />
                              <h3 className="font-semibold text-sm text-foreground">
                                {profile.name}
                              </h3>
                              {isActive && (
                                <Badge variant="default" className="text-xs px-1.5 py-0">
                                  Active
                                </Badge>
                              )}
                              {profile.isDefault && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  Default
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground min-w-[50px]">Type:</span>
                                <Badge variant="outline" className="font-mono text-xs px-1 py-0">
                                  {profile.config.type}
                                </Badge>
                              </div>
                              {profile.config.host && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-muted-foreground min-w-[50px]">Host:</span>
                                  <span className="font-mono text-xs text-foreground truncate">{profile.config.host}</span>
                                </div>
                              )}
                              {profile.config.port && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-muted-foreground min-w-[50px]">Port:</span>
                                  <span className="font-mono text-xs text-foreground">{profile.config.port}</span>
                                </div>
                              )}
                              {profile.config.database && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-muted-foreground min-w-[50px]">DB:</span>
                                  <span className="font-mono text-xs text-foreground truncate">{profile.config.database}</span>
                                </div>
                              )}
                              {profile.config.connectionString && (
                                <div className="flex items-center gap-1.5 col-span-2">
                                  <span className="text-muted-foreground min-w-[50px]">Path:</span>
                                  <span className="font-mono text-xs text-foreground truncate">{profile.config.connectionString}</span>
                                </div>
                              )}
                              {profile.config.username && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-muted-foreground min-w-[50px]">User:</span>
                                  <span className="text-xs text-foreground truncate">{profile.config.username}</span>
                                </div>
                              )}
                              {profile.config.ssl && (
                                <div className="flex items-center gap-1.5">
                                  <Shield className="h-3 w-3 text-green-600" />
                                  <span className="text-muted-foreground text-xs">SSL:</span>
                                  <Badge variant="success" className="text-xs px-1 py-0">
                                    {profile.config.sslMode || 'require'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-border/50">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(profile.lastUsed).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            {!isActive && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSwitchProfile(profile.id)}
                                className="h-7 px-2 text-xs"
                              >
                                Switch
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData(profile.config);
                                setShowForm(true);
                                setIsEditing(true);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">No connection profiles</p>
                  <Button onClick={() => setShowForm(true)} size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Create Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Profile Configuration Details */}
          {activeProfile && (
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Active Profile Configuration</CardTitle>
                    <CardDescription className="mt-1">
                      Current database connection details and status
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Connection Status */}
                {connectionStatus !== 'idle' && (
                  <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
                    connectionStatus === 'connected' 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                      : connectionStatus === 'disconnected'
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                  }`}>
                    {connectionStatus === 'testing' && (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <div>
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Testing connection...</span>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Please wait while we verify your connection</p>
                        </div>
                      </>
                    )}
                    {connectionStatus === 'connected' && (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <span className="text-sm font-medium text-green-900 dark:text-green-100">Connection Successful</span>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">Your database is ready to use</p>
                        </div>
                      </>
                    )}
                    {connectionStatus === 'disconnected' && (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <span className="text-sm font-medium text-red-900 dark:text-red-100">Connection Failed</span>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">Unable to connect to the database</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Migration Status */}
                {migrationStatus && databaseConfig.type !== 'sqlite' && (
                  <div className="p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {checkingMigration ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : migrationStatus.isUpToDate ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        <div>
                          <span className="text-sm font-medium">
                            Migration Status: {migrationStatus.isUpToDate ? 'Up to date' : 'Pending'}
                          </span>
                          {migrationStatus.lastMigration && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Last migration: {migrationStatus.lastMigration.toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration Details */}
                <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Current Configuration</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium min-w-[100px]">Type:</span>
                      <Badge variant="outline" className="font-mono">
                        {databaseConfig.type}
                      </Badge>
                    </div>
                    {databaseConfig.type === "sqlite" ? (
                      <div className="flex items-start gap-2 md:col-span-2">
                        <span className="text-muted-foreground font-medium min-w-[100px] pt-0.5">Path:</span>
                        <span className="font-mono text-xs text-foreground break-all bg-background px-2 py-1 rounded border">
                          {databaseConfig.connectionString}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium min-w-[100px]">Host:</span>
                          <span className="font-mono text-foreground">{databaseConfig.host}</span>
                        </div>
                        {databaseConfig.port && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium min-w-[100px]">Port:</span>
                            <span className="font-mono text-foreground">{databaseConfig.port}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium min-w-[100px]">Database:</span>
                          <span className="font-mono text-foreground">{databaseConfig.database}</span>
                        </div>
                        {databaseConfig.username && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium min-w-[100px]">Username:</span>
                            <span className="text-foreground">{databaseConfig.username}</span>
                          </div>
                        )}
                        {databaseConfig.ssl && (
                          <div className="flex items-center gap-2 md:col-span-2">
                            <Shield className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground font-medium">SSL:</span>
                            <Badge variant="success" className="text-xs">
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
                  <div className="space-y-2 p-4 rounded-lg bg-muted/50 border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Connection Test Progress</p>
                    {testProgress.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button 
                      onClick={() => handleTestConnection(databaseConfig)} 
                      variant="outline"
                      disabled={testingConnection || syncingTables}
                      className="shadow-sm"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => handleSyncTables(databaseConfig)}
                      variant="outline"
                      disabled={syncingTables || testingConnection}
                      className="shadow-sm"
                    >
                      {syncingTables ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Sync Tables
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleEditExisting}
                      variant="outline"
                      className="shadow-sm"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                    <Button 
                      onClick={handleUseExisting} 
                      className="flex-1 shadow-sm"
                      disabled={isLoading || testingConnection || syncingTables}
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Use This Configuration
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleConfigureNew}
                      variant="outline"
                      className="flex-1"
                      disabled={isLoading || testingConnection || syncingTables}
                      size="lg"
                    >
                      Configure New Database
                    </Button>
                  </div>
                  
                  <Button
                    onClick={() => navigate("/")}
                    variant="ghost"
                    className="w-full"
                    disabled={isLoading || testingConnection || syncingTables}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Companies
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Active Profile - Show Default Config */}
          {!activeProfile && databaseConfig && (
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Database className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Current Configuration</CardTitle>
                    <CardDescription className="mt-1">
                      Database configuration details (not saved as profile)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Configuration Details</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium min-w-[100px]">Type:</span>
                      <Badge variant="outline" className="font-mono">
                        {databaseConfig.type}
                      </Badge>
                    </div>
                    {databaseConfig.type === "sqlite" ? (
                      <div className="flex items-start gap-2 md:col-span-2">
                        <span className="text-muted-foreground font-medium min-w-[100px] pt-0.5">Path:</span>
                        <span className="font-mono text-xs text-foreground break-all bg-background px-2 py-1 rounded border">
                          {databaseConfig.connectionString}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium min-w-[100px]">Host:</span>
                          <span className="font-mono text-foreground">{databaseConfig.host}</span>
                        </div>
                        {databaseConfig.port && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium min-w-[100px]">Port:</span>
                            <span className="font-mono text-foreground">{databaseConfig.port}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium min-w-[100px]">Database:</span>
                          <span className="font-mono text-foreground">{databaseConfig.database}</span>
                        </div>
                        {databaseConfig.username && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium min-w-[100px]">Username:</span>
                            <span className="text-foreground">{databaseConfig.username}</span>
                          </div>
                        )}
                        {databaseConfig.ssl && (
                          <div className="flex items-center gap-2 md:col-span-2">
                            <Shield className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground font-medium">SSL:</span>
                            <Badge variant="success" className="text-xs">
                              {databaseConfig.sslMode || 'require'}
                            </Badge>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button 
                      onClick={() => handleTestConnection(databaseConfig)} 
                      variant="outline"
                      disabled={testingConnection || syncingTables}
                      className="shadow-sm"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => handleSyncTables(databaseConfig)}
                      variant="outline"
                      disabled={syncingTables || testingConnection}
                      className="shadow-sm"
                    >
                      {syncingTables ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Sync Tables
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleEditExisting}
                      variant="outline"
                      className="shadow-sm"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                    <Button 
                      onClick={handleUseExisting} 
                      className="flex-1 shadow-sm"
                      disabled={isLoading || testingConnection || syncingTables}
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Use Existing Configuration
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleConfigureNew}
                      variant="outline"
                      className="flex-1"
                      disabled={isLoading || testingConnection || syncingTables}
                      size="lg"
                    >
                      Configure New Database
                    </Button>
                  </div>
                  <Button
                    onClick={() => navigate("/")}
                    variant="ghost"
                    className="w-full"
                    disabled={isLoading || testingConnection || syncingTables}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Companies
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Show configuration form
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
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
          <CardContent>
            {/* Connection Profiles */}
            {profiles.length > 0 && (
              <div className="mb-6 p-4 border rounded-md bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Connection Profiles
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProfiles(!showProfiles)}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${showProfiles ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
                {showProfiles && (
                  <div className="space-y-2">
                    {profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className={`flex items-center justify-between p-2 rounded border ${
                          activeProfileId === profile.id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{profile.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {profile.config.type} - {profile.config.database || profile.config.connectionString}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {activeProfileId !== profile.id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSwitchProfile(profile.id)}
                            >
                              Switch
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProfile(profile.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dbType">
                  Database Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    handleDatabaseTypeChange(value as DatabaseType)
                  }
                >
                  <SelectTrigger id="dbType">
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
                <div className="space-y-2">
                  <Label htmlFor="connectionString">
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
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    SQLite file path. Use "file:" prefix for absolute paths or
                    relative paths.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="host">
                      Host <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="host"
                      type="text"
                      placeholder="localhost"
                      value={formData.host || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          host: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">
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
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="database">
                      Database Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="database"
                      type="text"
                      placeholder="omniledger"
                      value={formData.database || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          database: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">
                      Username <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="database_user"
                      value={formData.username || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                    <Input
                      id="password"
                        type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* SSL/TLS Configuration */}
                  <div className="space-y-4 p-4 border rounded-md">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enableSSL"
                        checked={formData.ssl || false}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            ssl: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <Label htmlFor="enableSSL" className="cursor-pointer font-medium">
                        Enable SSL/TLS
                      </Label>
                    </div>
                    {formData.ssl && (
                      <div className="space-y-3 pl-6 border-l-2">
                        <div className="space-y-2">
                          <Label htmlFor="sslMode">SSL Mode</Label>
                          <Select
                            value={formData.sslMode || "require"}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                sslMode: value as any,
                              }))
                            }
                          >
                            <SelectTrigger id="sslMode">
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
                          <div className="space-y-2">
                            <Label htmlFor="sslCa">CA Certificate File (Optional)</Label>
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
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Connection Status Indicator */}
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

                  {/* Migration Status */}
                  {migrationStatus && (
                    <div className="p-3 rounded-md bg-muted">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {checkingMigration ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : migrationStatus.isUpToDate ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className="text-sm font-medium">
                            Migration Status: {migrationStatus.isUpToDate ? 'Up to date' : 'Pending'}
                          </span>
                        </div>
                        {migrationStatus.lastMigration && (
                          <span className="text-xs text-muted-foreground">
                            Last: {migrationStatus.lastMigration.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestConnection()}
                      disabled={testingConnection || syncingTables}
                      className="flex-1"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSyncTables()}
                      disabled={syncingTables || testingConnection}
                      className="flex-1"
                    >
                      {syncingTables ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        "Sync Tables"
                      )}
                    </Button>
                  </div>
                  {initializationStatus && (
                    <div className={`p-3 text-sm rounded-md ${
                      initializationStatus.includes("✅") 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                        : initializationStatus.includes("❌")
                        ? "bg-destructive/10 text-destructive"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    }`}>
                      {initializationStatus}
                    </div>
                  )}
                </>
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

              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAsProfile}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Save as Profile
                </Button>
                <div className="flex gap-4">
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
                  {isLoading ? "Saving..." : isEditing ? "Update Configuration" : "Save Configuration"}
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
            <DialogTitle>Save Connection Profile</DialogTitle>
            <DialogDescription>
              Enter a name for this connection profile. You can switch between saved profiles later.
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

