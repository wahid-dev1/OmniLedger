/**
 * Mobile Server Configuration Component
 * Allows users to configure and manage the HTTP API server for mobile app access
 */

import { useEffect, useRef, useState } from "react";
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
  TestTube2,
} from "lucide-react";
import type { MobileServerConfig } from "../../shared/types";

const TUNNEL_VERIFY_INTERVAL_MS = 15_000;
/** Cloudflare quick tunnels often need several minutes before /health succeeds from the browser. */
const TUNNEL_VERIFY_MAX_MS = 10 * 60 * 1000;

async function fetchTunnelHealthOk(publicBaseUrl: string): Promise<boolean> {
  const base = publicBaseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${base}/health`, { method: "GET", signal: controller.signal });
    if (!res.ok) return false;
    const text = await res.text();
    let parsed: { success?: boolean; data?: { status?: string } };
    try {
      parsed = JSON.parse(text) as { success?: boolean; data?: { status?: string } };
    } catch {
      return false;
    }
    return parsed.success === true && parsed.data?.status === "running";
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

declare global {
  interface Window {
    electronAPI: {
      startMobileServer: (config: MobileServerConfig) => Promise<{ success: boolean; error?: string; port?: number; apiKey?: string }>;
      stopMobileServer: () => Promise<{ success: boolean; error?: string }>;
      getMobileServerStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
      getMobileServerConfig: () => Promise<{ success: boolean; data?: MobileServerConfig; error?: string }>;
    };
  }
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [tunnelTestLoading, setTunnelTestLoading] = useState(false);
  const [tunnelTestOutcome, setTunnelTestOutcome] = useState<{ ok: boolean; detail: string } | null>(null);
  const [tunnelEndpointReady, setTunnelEndpointReady] = useState(false);
  const [tunnelVerifyTimedOut, setTunnelVerifyTimedOut] = useState(false);
  const latestStatusRef = useRef(status);
  latestStatusRef.current = status;

  useEffect(() => {
    loadConfig();
    loadStatus();

    const interval = setInterval(() => {
      void loadStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTunnelTestOutcome(null);
  }, [status?.tunnelUrl]);

  useEffect(() => {
    setTunnelEndpointReady(false);
    setTunnelVerifyTimedOut(false);

    if (status?.status !== "running" || !status?.tunnelUrl) {
      return;
    }
    const err = status.tunnelError as string | undefined;
    if (err?.includes("repeated failures")) {
      return;
    }

    const baseUrl = status.tunnelUrl as string;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const deadline = Date.now() + TUNNEL_VERIFY_MAX_MS;

    const tick = async () => {
      if (cancelled) return;
      const giveUp = latestStatusRef.current?.tunnelError?.includes("repeated failures");
      if (giveUp) {
        if (intervalId !== undefined) clearInterval(intervalId);
        return;
      }
      const ok = await fetchTunnelHealthOk(baseUrl);
      if (cancelled) return;
      if (ok) {
        setTunnelEndpointReady(true);
        setTunnelVerifyTimedOut(false);
        if (intervalId !== undefined) clearInterval(intervalId);
        return;
      }
      if (Date.now() >= deadline) {
        setTunnelVerifyTimedOut(true);
        if (intervalId !== undefined) clearInterval(intervalId);
      }
    };

    void tick();
    intervalId = setInterval(() => void tick(), TUNNEL_VERIFY_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [status?.status, status?.tunnelUrl]);

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
        window.setTimeout(() => void loadStatus(), 1500);
        window.setTimeout(() => void loadStatus(), 5000);
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
  const tunnelUrl = status?.tunnelUrl as string | undefined;
  const tunnelError = status?.tunnelError as string | undefined;
  /** Quick tunnel exhausted retries — show local URL as fallback. */
  const tunnelPublicUrlFailed =
    Boolean(tunnelError?.includes("repeated failures") || tunnelError?.includes("Giving up"));

  const handleTestTunnel = async () => {
    if (!tunnelUrl) return;
    setTunnelTestLoading(true);
    setTunnelTestOutcome(null);
    try {
      const ok = await fetchTunnelHealthOk(tunnelUrl);
      if (ok) {
        setTunnelEndpointReady(true);
        setTunnelVerifyTimedOut(false);
        setTunnelTestOutcome({
          ok: true,
          detail:
            "Server is responding: the public tunnel reached OmniLedger and GET /health returned OK (API server is up).",
        });
        return;
      }
      setTunnelTestOutcome({
        ok: false,
        detail:
          "Could not reach /health through the public URL yet. That is common for the first 5–10 minutes; automatic checks keep running in the background.",
      });
    } finally {
      setTunnelTestLoading(false);
    }
  };

  /** Public trycloudflare URL when ready; otherwise local URL only (no LAN IPs). */
  const getServerUrls = () => {
    if (tunnelUrl) {
      return [tunnelUrl];
    }
    const protocol = config.enableHTTPS ? 'https' : 'http';
    if (config.host === '0.0.0.0' || config.host === 'localhost') {
      return [`${protocol}://localhost:${serverPort}`];
    }
    return [`${protocol}://${config.host}:${serverPort}`];
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
                <Label className="text-sm font-medium text-muted-foreground">
                  {tunnelUrl
                    ? "Public mobile endpoint (Cloudflare)"
                    : tunnelPublicUrlFailed
                      ? "Local endpoint (tunnel unavailable)"
                      : "Public mobile endpoint (Cloudflare)"}
                </Label>

                {tunnelUrl ? (
                  <>
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
                    {tunnelEndpointReady ? (
                      <>
                        <div className="mt-3 flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Public endpoint is responding correctly — GET /health succeeded through this URL. You
                            can use it from phones or other networks.
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          This is a temporary Cloudflare quick tunnel, not a fixed hostname.
                        </p>
                      </>
                    ) : tunnelVerifyTimedOut ? (
                      <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="font-medium">Could not confirm /health within 10 minutes</p>
                        <p className="mt-1 text-xs leading-relaxed opacity-90">
                          trycloudflare links often take <strong>5–10 minutes</strong> before they answer from a
                          browser. Keep this screen open, or use <strong>Test tunnel</strong> periodically. If it
                          eventually works, the green verified message will appear on the next automatic check.
                        </p>
                      </div>
                    ) : (
                      <div
                        className="mt-3 flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-3"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium text-foreground">Checking public connectivity…</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Polling <code className="text-xs">GET /health</code> on this URL every{" "}
                            {TUNNEL_VERIFY_INTERVAL_MS / 1000}s for up to {TUNNEL_VERIFY_MAX_MS / 60000} minutes.
                            It is normal for this to take <strong>5–10 minutes</strong> before the edge routes traffic
                            to your machine. You can copy the URL below in the meantime.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : tunnelPublicUrlFailed ? (
                  <>
                    <p className="text-xs text-destructive mt-2 mb-2">{tunnelError}</p>
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
                      Use this address only on this computer or the same LAN.
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      className="mt-2 flex min-h-[42px] items-center gap-3 rounded-md border border-dashed border-muted-foreground/25 bg-muted/40 px-3 py-3"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-sm font-medium text-foreground">
                          Resolving public URL…
                        </span>
                        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
                          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60 motion-reduce:animate-none" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Starting Cloudflare quick tunnel (trycloudflare). The public hostname can appear before the
                          edge is ready; we then verify /health automatically for up to 10 minutes (often 5–10 minutes).
                        </span>
                      </div>
                    </div>
                    {tunnelError && (
                      <p className="text-xs text-muted-foreground mt-2">{tunnelError}</p>
                    )}
                  </>
                )}

                {tunnelUrl && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleTestTunnel()}
                      disabled={tunnelTestLoading}
                      className="gap-2 w-fit"
                    >
                      {tunnelTestLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube2 className="h-4 w-4" />
                      )}
                      Test tunnel
                    </Button>
                    {tunnelTestOutcome && (
                      <p
                        className={
                          tunnelTestOutcome.ok ? "text-sm text-green-600" : "text-sm text-destructive"
                        }
                      >
                        {tunnelTestOutcome.detail}
                      </p>
                    )}
                  </div>
                )}
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
              <h4 className="font-medium mb-2">Companies</h4>
              <code className="block px-3 py-2 bg-muted rounded-md text-sm">GET /api/companies</code>
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
            Most endpoints require a <code>companyId</code> query parameter or body field. <code>GET /health</code> and <code>GET /api/companies</code> do not. Authentication is required when enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
