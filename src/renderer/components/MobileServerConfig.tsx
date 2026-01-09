/**
 * Mobile Server Configuration Component
 * Allows users to configure and manage the HTTP API server for mobile app access
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Server, 
  Wifi, 
  WifiOff, 
  Play, 
  Square, 
  Copy, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Loader2,
  Globe,
  Shield,
  Lock,
  Unlock,
  ArrowLeft,
} from "lucide-react";
import type { MobileServerConfig } from "../../shared/types";

declare global {
  interface Window {
    electronAPI: {
      startMobileServer: (config: MobileServerConfig) => Promise<{ success: boolean; error?: string; port?: number; apiKey?: string }>;
      stopMobileServer: () => Promise<{ success: boolean; error?: string }>;
      getMobileServerStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
      getMobileServerConfig: () => Promise<{ success: boolean; data?: MobileServerConfig; error?: string }>;
      getNetworkInfo: () => Promise<{ success: boolean; data?: Array<{ interface: string; address: string; family: string }>; error?: string }>;
    };
  }
}

interface NetworkInterface {
  interface: string;
  address: string;
  family: string;
}

export function MobileServerConfig() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<MobileServerConfig>({
    enabled: false,
    port: 3000,
    host: "0.0.0.0",
    enableCORS: true,
    requireAuth: true,
    enableHTTPS: false,
    enableDiscovery: true,
  });
  const [status, setStatus] = useState<any>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  useEffect(() => {
    loadConfig();
    loadStatus();
    loadNetworkInfo();

    // Poll status every 5 seconds when server is running
    const interval = setInterval(() => {
      if (status?.status === 'running') {
        loadStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.getMobileServerConfig();
      if (result.success && result.data) {
        setConfig(result.data);
      }
    } catch (err) {
      console.error("Error loading config:", err);
    }
  };

  const loadStatus = async () => {
    try {
      const result = await window.electronAPI.getMobileServerStatus();
      if (result.success && result.data) {
        setStatus(result.data);
      }
    } catch (err) {
      console.error("Error loading status:", err);
    }
  };

  const loadNetworkInfo = async () => {
    try {
      const result = await window.electronAPI.getNetworkInfo();
      if (result.success && result.data) {
        setNetworkInfo(result.data);
      }
    } catch (err) {
      console.error("Error loading network info:", err);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.startMobileServer(config);
      if (result.success) {
        setSuccess(`Server started successfully on port ${result.port || config.port}`);
        await loadStatus();
        await loadConfig(); // Reload config to get generated API key
      } else {
        setError(result.error || "Failed to start server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.stopMobileServer();
      if (result.success) {
        setSuccess("Server stopped successfully");
        await loadStatus();
      } else {
        setError(result.error || "Failed to stop server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const isRunning = status?.status === 'running';
  const serverPort = status?.port || config.port || 3000;
  const apiKey = config.apiKey || status?.config?.apiKey;

  // Get server URLs
  const getServerUrls = () => {
    const protocol = config.enableHTTPS ? 'https' : 'http';
    const urls: string[] = [];

    if (config.host === '0.0.0.0' || config.host === 'localhost') {
      urls.push(`${protocol}://localhost:${serverPort}`);
    }

    networkInfo.forEach((iface) => {
      urls.push(`${protocol}://${iface.address}:${serverPort}`);
    });

    return urls;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold mb-2">Mobile Server Configuration</h1>
          <p className="text-muted-foreground">
            Configure the HTTP API server for mobile app access. This allows mobile devices to connect
            to OmniLedger and perform operations like viewing products, creating sales, and checking inventory.
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <p>{success}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Running</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    Active
                  </Badge>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">Stopped</span>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700">
                    Inactive
                  </Badge>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {isRunning ? (
                <Button
                  onClick={handleStop}
                  disabled={loading}
                  variant="destructive"
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Stop Server
                </Button>
              ) : (
                <Button
                  onClick={handleStart}
                  disabled={loading || !config.enabled}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Start Server
                </Button>
              )}
            </div>
          </div>

          {isRunning && (
            <div className="space-y-3 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Server URLs</Label>
                <div className="mt-2 space-y-2">
                  {getServerUrls().map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm">{url}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(url)}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use these URLs in your mobile app to connect to this server
                </p>
              </div>

              {config.requireAuth && apiKey && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">API Key</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                      {apiKey}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey)}
                      className="gap-2"
                    >
                      {apiKeyCopied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {apiKeyCopied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Include this API key in the <code>X-API-Key</code> header or as <code>Bearer</code> token
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Server Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Server Configuration</CardTitle>
          <CardDescription>
            Configure the mobile API server settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Server */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Mobile Server</Label>
              <p className="text-sm text-muted-foreground">
                Enable the HTTP API server for mobile app access
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              disabled={isRunning}
            />
          </div>

          {/* Port */}
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={config.port || 3000}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 3000 })}
              disabled={isRunning}
              min={1024}
              max={65535}
            />
            <p className="text-xs text-muted-foreground">
              Port number for the API server (default: 3000)
            </p>
          </div>

          {/* Host */}
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <select
              id="host"
              value={config.host || "0.0.0.0"}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              disabled={isRunning}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="0.0.0.0">0.0.0.0 (All interfaces - accessible from network)</option>
              <option value="localhost">localhost (Local only)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {config.host === "0.0.0.0"
                ? "Server will be accessible from all network interfaces (mobile devices on same network can connect)"
                : "Server will only be accessible from this computer"}
            </p>
          </div>

          {/* CORS */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cors" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Enable CORS
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow cross-origin requests from mobile apps
              </p>
            </div>
            <Switch
              id="cors"
              checked={config.enableCORS}
              onCheckedChange={(checked) => setConfig({ ...config, enableCORS: checked })}
              disabled={isRunning}
            />
          </div>

          {/* Authentication */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auth" className="flex items-center gap-2">
                {config.requireAuth ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
                Require Authentication
              </Label>
              <p className="text-sm text-muted-foreground">
                Require API key for mobile app access (recommended)
              </p>
            </div>
            <Switch
              id="auth"
              checked={config.requireAuth}
              onCheckedChange={(checked) => setConfig({ ...config, requireAuth: checked, apiKey: checked ? config.apiKey : undefined })}
              disabled={isRunning}
            />
          </div>

          {/* HTTPS (Future feature) */}
          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label htmlFor="https" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Enable HTTPS
              </Label>
              <p className="text-sm text-muted-foreground">
                Secure connections with SSL/TLS (coming soon)
              </p>
            </div>
            <Switch
              id="https"
              checked={config.enableHTTPS}
              onCheckedChange={(checked) => setConfig({ ...config, enableHTTPS: checked })}
              disabled={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints Info */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>
            Available REST API endpoints for mobile apps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Health Check</h4>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm">GET /health</code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Products</h4>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm mb-1">GET /api/products?companyId={"{companyId}"}</code>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm">GET /api/products/{"{id}"}</code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Customers</h4>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm">GET /api/customers?companyId={"{companyId}"}</code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Sales</h4>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm mb-1">GET /api/sales?companyId={"{companyId}"}</code>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm">POST /api/sales</code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Inventory</h4>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm">GET /api/inventory?companyId={"{companyId}"}</code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Dashboard</h4>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm">GET /api/dashboard?companyId={"{companyId}"}</code>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            All endpoints require <code>companyId</code> query parameter. Authentication required if enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
