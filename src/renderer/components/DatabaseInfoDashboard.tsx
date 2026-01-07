/**
 * Database Information Dashboard
 * Displays database health, size, statistics, and quick actions
 */

import { useState, useEffect } from "react";
import { 
  Database, 
  HardDrive, 
  Table, 
  BarChart3, 
  RefreshCw, 
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DatabaseConfig } from "@shared/types";

interface DatabaseInfo {
  size?: string;
  tableCount?: number;
  totalRecords?: number;
  lastBackup?: Date | null;
  version?: string;
  status: 'connected' | 'disconnected' | 'checking';
}

interface DatabaseInfoDashboardProps {
  config: DatabaseConfig;
  onBackup?: () => Promise<void>;
  onOptimize?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function DatabaseInfoDashboard({
  config,
  onBackup,
  onOptimize,
  onRefresh,
}: DatabaseInfoDashboardProps) {
  const [info, setInfo] = useState<DatabaseInfo>({ status: 'checking' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    loadDatabaseInfo();
  }, [config]);

  const loadDatabaseInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Implement IPC call to get database info
      // For now, simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setInfo({
        status: 'connected',
        size: '45.2 MB',
        tableCount: 24,
        totalRecords: 12345,
        lastBackup: null,
        version: config.type === 'sqlite' ? '3.42.0' : '14.5',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database information');
      setInfo({ status: 'disconnected' });
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!onBackup) return;
    
    setBackingUp(true);
    try {
      await onBackup();
      setInfo(prev => ({ ...prev, lastBackup: new Date() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBackingUp(false);
    }
  };

  const handleOptimize = async () => {
    if (!onOptimize) return;
    
    setOptimizing(true);
    try {
      await onOptimize();
      await loadDatabaseInfo(); // Refresh info after optimization
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    await loadDatabaseInfo();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading database information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Information
              </CardTitle>
              <CardDescription>
                {config.type.toUpperCase()} - {config.database || config.connectionString}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {info.status === 'connected' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HardDrive className="h-4 w-4" />
                  Size
                </div>
                <div className="text-2xl font-semibold">{info.size || 'N/A'}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Table className="h-4 w-4" />
                  Tables
                </div>
                <div className="text-2xl font-semibold">{info.tableCount || 0}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  Records
                </div>
                <div className="text-2xl font-semibold">
                  {info.totalRecords?.toLocaleString() || 0}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  Status
                </div>
                <div className="text-2xl font-semibold text-green-600">Connected</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-destructive">Database is disconnected</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      {info.status === 'connected' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {info.version || 'Unknown'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last Backup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {info.lastBackup 
                  ? new Date(info.lastBackup).toLocaleString()
                  : 'Never backed up'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      {info.status === 'connected' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleBackup}
                disabled={backingUp || !onBackup}
              >
                {backingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Backing up...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Backup Database
                  </>
                )}
              </Button>

              {config.type === 'sqlite' && (
                <Button
                  variant="outline"
                  onClick={handleOptimize}
                  disabled={optimizing || !onOptimize}
                >
                  {optimizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Optimize Database
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

