import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Database, CheckCircle } from "lucide-react";
import type { DatabaseConfig } from "@shared/types";

interface MigrationNotificationDialogProps {
  open: boolean;
  onClose: () => void;
  databaseConfig: DatabaseConfig;
  currentVersion?: string | null;
  requiredVersion: string;
  onMigrationComplete?: () => void;
}

export function MigrationNotificationDialog({
  open,
  onClose,
  databaseConfig,
  currentVersion,
  requiredVersion,
  onMigrationComplete,
}: MigrationNotificationDialogProps) {
  const [migrating, setMigrating] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationSuccess, setMigrationSuccess] = useState(false);

  const handleRunMigration = async () => {
    setMigrating(true);
    setMigrationError(null);
    setMigrationSuccess(false);

    try {
      const result = await (window as any).electronAPI?.runDatabaseMigrations(databaseConfig);
      
      if (result?.success) {
        setMigrationSuccess(true);
        // Wait a moment to show success message
        setTimeout(() => {
          if (onMigrationComplete) {
            onMigrationComplete();
          }
          handleClose();
        }, 1500);
      } else {
        setMigrationError(result?.error || "Migration failed. Please try again.");
      }
    } catch (error) {
      setMigrationError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setMigrating(false);
    }
  };

  const handleClose = () => {
    if (!migrating) {
      setMigrationError(null);
      setMigrationSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {migrationSuccess ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Migration Complete
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Database Migration Required
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {migrationSuccess
              ? "Your database has been successfully updated."
              : "Your database schema needs to be updated to work with this version of OmniLedger."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {migrationSuccess ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Migration Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                Your database has been updated to version {requiredVersion}. You can now use all features of this version.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  A new version of OmniLedger requires database schema updates. This is a safe operation that will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Update your database structure to match the new version</li>
                    <li>Preserve all your existing data</li>
                    <li>Enable new features and improvements</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Database Information:</span>
                </div>
                <div className="text-sm space-y-1 pl-6">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    <span className="font-medium">{databaseConfig.type.toUpperCase()}</span>
                  </div>
                  {databaseConfig.type !== "sqlite" && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Host:</span>{" "}
                        <span className="font-medium">{databaseConfig.host}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Database:</span>{" "}
                        <span className="font-medium">{databaseConfig.database}</span>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-muted-foreground">Current Version:</span>{" "}
                    <span className="font-medium">
                      {currentVersion || "Not recorded"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Required Version:</span>{" "}
                    <span className="font-medium text-green-600">{requiredVersion}</span>
                  </div>
                </div>
              </div>

              {migrationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Migration Error</AlertTitle>
                  <AlertDescription>{migrationError}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {migrationSuccess ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={migrating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRunMigration}
                disabled={migrating}
                className="min-w-[120px]"
              >
                {migrating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  "Run Migration"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

