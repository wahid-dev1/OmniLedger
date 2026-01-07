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
  Sparkles
} from "lucide-react";
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
import { useAppStore } from "@/stores/useAppStore";
import type { DatabaseConfig, DatabaseType } from "@shared/types";
import { parseDatabaseError, type ErrorDetails } from "@/utils/databaseErrors";

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardData {
  setupType: "quick" | "advanced" | null;
  type: DatabaseType | null;
  config: Partial<DatabaseConfig>;
  profileName: string;
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
    setWizardData(prev => ({
      ...prev,
      setupType: "quick",
      type: "sqlite",
      config: {
        type: "sqlite",
        connectionString: "file:./data/omniledger.db",
      },
    }));
    setCurrentStep(5); // Skip to final step for quick setup
  };

  const handleAdvancedSetup = () => {
    setWizardData(prev => ({ ...prev, setupType: "advanced" }));
    setCurrentStep(2);
  };

  const handleDatabaseTypeSelect = (type: DatabaseType) => {
    const config: Partial<DatabaseConfig> = { type };
    
    if (type === "sqlite") {
      config.connectionString = "file:./data/omniledger.db";
    } else {
      // Set defaults based on type
      if (type === "postgresql") {
        config.port = 5432;
        config.host = "localhost";
      } else if (type === "mysql") {
        config.port = 3306;
        config.host = "localhost";
      } else if (type === "mssql") {
        config.port = 1433;
        config.host = "localhost";
      }
    }
    
    setWizardData(prev => ({
      ...prev,
      type,
      config: { ...prev.config, ...config },
    }));
    setCurrentStep(3);
  };

  const handleConfigUpdate = (field: keyof DatabaseConfig, value: any) => {
    setWizardData(prev => ({
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
        const parsedError = parseDatabaseError(new Error(result.error || "Connection failed"));
        setErrorDetails(parsedError);
        setError(parsedError.message);
      }
    } catch (error) {
      const parsedError = parseDatabaseError(error);
      setErrorDetails(parsedError);
      setError(parsedError.message);
    } finally {
      setTesting(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      const config = wizardData.config as DatabaseConfig;
      
      // Save configuration
      setDatabaseConfig(config);
      localStorage.setItem("omniledger_db_config", JSON.stringify(config));
      
      // Navigate to splash screen
      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save configuration";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    } else {
      navigate("/");
    }
  };

  // Step 1: Welcome & Setup Type Selection
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to OmniLedger</CardTitle>
              <CardDescription className="text-base">
                Let's set up your database connection. Choose an option below:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleQuickSetup}
                className="w-full h-auto p-6 flex flex-col items-start gap-3"
                variant="outline"
              >
                <div className="flex items-center gap-3 w-full">
                  <Database className="h-6 w-6 text-primary" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Quick Setup (SQLite)</div>
                    <div className="text-sm text-muted-foreground">
                      Perfect for local development. No server required.
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Button>

              <Button
                onClick={handleAdvancedSetup}
                className="w-full h-auto p-6 flex flex-col items-start gap-3"
                variant="outline"
              >
                <div className="flex items-center gap-3 w-full">
                  <Server className="h-6 w-6 text-primary" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Advanced Setup</div>
                    <div className="text-sm text-muted-foreground">
                      Connect to PostgreSQL, MySQL, or MSSQL server.
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Button>

              <div className="pt-4 border-t">
                <Button
                  onClick={() => navigate("/")}
                  variant="ghost"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2: Database Type Selection (Advanced)
  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Select Database Type</CardTitle>
              <CardDescription>
                Choose the type of database you want to connect to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleDatabaseTypeSelect("sqlite")}
                  variant="outline"
                  className="h-auto p-6 flex flex-col gap-2"
                >
                  <Database className="h-8 w-8" />
                  <span className="font-semibold">SQLite</span>
                  <span className="text-xs text-muted-foreground">Local file database</span>
                </Button>

                <Button
                  onClick={() => handleDatabaseTypeSelect("postgresql")}
                  variant="outline"
                  className="h-auto p-6 flex flex-col gap-2"
                >
                  <Server className="h-8 w-8" />
                  <span className="font-semibold">PostgreSQL</span>
                  <span className="text-xs text-muted-foreground">Production database</span>
                </Button>

                <Button
                  onClick={() => handleDatabaseTypeSelect("mysql")}
                  variant="outline"
                  className="h-auto p-6 flex flex-col gap-2"
                >
                  <Server className="h-8 w-8" />
                  <span className="font-semibold">MySQL</span>
                  <span className="text-xs text-muted-foreground">Popular database</span>
                </Button>

                <Button
                  onClick={() => handleDatabaseTypeSelect("mssql")}
                  variant="outline"
                  className="h-auto p-6 flex flex-col gap-2"
                >
                  <Server className="h-8 w-8" />
                  <span className="font-semibold">MSSQL</span>
                  <span className="text-xs text-muted-foreground">SQL Server</span>
                </Button>
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 3: Connection Details (Advanced)
  if (currentStep === 3) {
    const isSQLite = wizardData.type === "sqlite";
    
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Connection Details</CardTitle>
              <CardDescription>
                Enter your database connection information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isSQLite ? (
                <div className="space-y-2">
                  <Label htmlFor="connectionString">
                    Database File Path <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="connectionString"
                    value={wizardData.config.connectionString || ""}
                    onChange={(e) => handleConfigUpdate("connectionString", e.target.value)}
                    placeholder="file:./data/omniledger.db"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    SQLite file path. Use "file:" prefix for absolute paths.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="host">Host <span className="text-destructive">*</span></Label>
                    <Input
                      id="host"
                      value={wizardData.config.host || ""}
                      onChange={(e) => handleConfigUpdate("host", e.target.value)}
                      placeholder="localhost"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">Port <span className="text-destructive">*</span></Label>
                    <Input
                      id="port"
                      type="number"
                      value={wizardData.config.port || ""}
                      onChange={(e) => handleConfigUpdate("port", parseInt(e.target.value))}
                      placeholder={wizardData.type === "postgresql" ? "5432" : wizardData.type === "mysql" ? "3306" : "1433"}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="database">Database Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="database"
                      value={wizardData.config.database || ""}
                      onChange={(e) => handleConfigUpdate("database", e.target.value)}
                      placeholder="omniledger"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                    <Input
                      id="username"
                      value={wizardData.config.username || ""}
                      onChange={(e) => handleConfigUpdate("username", e.target.value)}
                      placeholder="database_user"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                    <Input
                      id="password"
                      type="password"
                      value={wizardData.config.password || ""}
                      onChange={(e) => handleConfigUpdate("password", e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </>
              )}

              {errorDetails && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {errorDetails.message}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      Test Connection
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 4: Initialize Database (if needed)
  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Initialize Database</CardTitle>
              <CardDescription>
                Setting up database tables and schema...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted-foreground">Initializing database schema...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 5: Success & Finish
  if (currentStep === 5) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Setup Complete!</CardTitle>
              <CardDescription className="text-base">
                Your database connection has been configured successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm font-medium mb-2">Configuration Summary:</p>
                <p className="text-sm text-muted-foreground">
                  Type: <span className="font-mono">{wizardData.type}</span>
                </p>
                {wizardData.config.connectionString && (
                  <p className="text-sm text-muted-foreground">
                    Path: <span className="font-mono">{wizardData.config.connectionString}</span>
                  </p>
                )}
                {wizardData.config.host && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Host: <span className="font-mono">{wizardData.config.host}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Database: <span className="font-mono">{wizardData.config.database}</span>
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Finish
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

