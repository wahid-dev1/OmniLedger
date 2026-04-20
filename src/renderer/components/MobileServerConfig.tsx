/**
 * Mobile Server Configuration Component
 * Professional UI for configuring and managing the HTTP API server for mobile app access.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
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
  AlertCircle,
  Loader2,
  Globe,
  Shield,
  Lock,
  Unlock,
  ArrowLeft,
  TestTube2,
  Eye,
  EyeOff,
  KeyRound,
  ExternalLink,
  Smartphone,
  Network,
  QrCode,
  Info,
  Check,
  ChevronDown,
  ListTree,
} from "lucide-react";
import type { MobileServerConfig } from "../../shared/types";
import { cn } from "@/lib/utils";

const TUNNEL_VERIFY_INTERVAL_MS = 5_000;
/** ngrok tunnels typically come up in 1–3 seconds; 60s is ample to confirm /health. */
const TUNNEL_VERIFY_MAX_MS = 60 * 1000;

type TunnelPhase =
  | "disabled"
  | "needs-token"
  | "starting"
  | "verifying"
  | "ready"
  | "timeout"
  | "failed";

async function fetchTunnelHealthOk(publicBaseUrl: string): Promise<boolean> {
  const base = publicBaseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        // Bypasses ngrok's free-tier browser abuse interstitial so fetch() actually
        // reaches our API instead of getting HTML back. Value is arbitrary.
        "ngrok-skip-browser-warning": "omniledger",
      },
    });
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

/* ------------------------------- Helpers -------------------------------- */

function maskApiKey(key: string | undefined, show: boolean): string {
  if (!key) return "";
  if (show) return key;
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.max(8, key.length - 8))}${key.slice(-4)}`;
}

/* ------------------------------ Small UI -------------------------------- */

interface SectionProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Controlled open state. When provided, the component calls `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Section({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: SectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const toggle = () => {
    const next = !open;
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const Header = (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {collapsible && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open ? "rotate-180" : "rotate-0",
            )}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );

  return (
    <section className={cn("rounded-xl border bg-card shadow-sm", className)}>
      {collapsible ? (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "w-full text-left transition-colors hover:bg-muted/30",
            open && "border-b",
          )}
          aria-expanded={open}
        >
          {Header}
        </button>
      ) : (
        <header className="border-b">{Header}</header>
      )}
      {open && <div className="px-5 py-5">{children}</div>}
    </section>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function Field({ label, htmlFor, hint, badge, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {badge}
      </div>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface ToggleRowProps {
  id: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleRow({ id, icon: Icon, title, description, checked, disabled, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 gap-3">
        {Icon && (
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              checked
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-medium text-foreground">
            {title}
          </Label>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/* ------------------------------- Component ------------------------------- */

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
    enablePublicTunnel: true,
    ngrokAuthtoken: "",
    ngrokDomain: "",
    ngrokRegion: "",
  });
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tunnelTestLoading, setTunnelTestLoading] = useState(false);
  const [tunnelTestOutcome, setTunnelTestOutcome] = useState<{ ok: boolean; detail: string } | null>(null);
  const [tunnelEndpointReady, setTunnelEndpointReady] = useState(false);
  const [tunnelVerifyTimedOut, setTunnelVerifyTimedOut] = useState(false);
  const [showAuthtoken, setShowAuthtoken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showQr, setShowQr] = useState(false);
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
    // eslint-disable-next-line prefer-const -- captured by `tick` closure before assignment below
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
        await loadConfig();
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

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const isRunning = status?.status === "running";
  const serverPort = status?.port || config.port || 3000;
  const apiKey: string | undefined = config.apiKey || status?.config?.apiKey;
  const tunnelUrl = status?.tunnelUrl as string | undefined;
  const tunnelError = status?.tunnelError as string | undefined;
  const tunnelPublicUrlFailed =
    Boolean(tunnelError?.includes("repeated failures") || tunnelError?.includes("Giving up"));

  const localUrl = useMemo(() => {
    const protocol = config.enableHTTPS ? "https" : "http";
    const host = config.host === "0.0.0.0" || config.host === "localhost" ? "localhost" : config.host;
    return `${protocol}://${host}:${serverPort}`;
  }, [config.enableHTTPS, config.host, serverPort]);

  const primaryUrl = tunnelUrl || localUrl;

  const tunnelPhase: TunnelPhase = useMemo(() => {
    if (config.enablePublicTunnel === false) return "disabled";
    if (!isRunning) return "disabled";
    if (tunnelUrl) {
      if (tunnelEndpointReady) return "ready";
      if (tunnelVerifyTimedOut) return "timeout";
      return "verifying";
    }
    if (tunnelPublicUrlFailed) return "failed";
    if (!config.ngrokAuthtoken?.trim()) return "needs-token";
    return "starting";
  }, [
    config.enablePublicTunnel,
    config.ngrokAuthtoken,
    isRunning,
    tunnelUrl,
    tunnelEndpointReady,
    tunnelVerifyTimedOut,
    tunnelPublicUrlFailed,
  ]);

  const tunnelStatusMeta = useMemo(() => {
    switch (tunnelPhase) {
      case "ready":
        return {
          label: "Public tunnel verified",
          dotClass: "bg-emerald-500",
          textClass: "text-emerald-700 dark:text-emerald-300",
        };
      case "verifying":
        return {
          label: "Verifying connectivity…",
          dotClass: "bg-blue-500 animate-pulse",
          textClass: "text-blue-700 dark:text-blue-300",
        };
      case "starting":
        return {
          label: "Starting ngrok tunnel…",
          dotClass: "bg-blue-500 animate-pulse",
          textClass: "text-blue-700 dark:text-blue-300",
        };
      case "timeout":
        return {
          label: "Health check timed out",
          dotClass: "bg-amber-500",
          textClass: "text-amber-700 dark:text-amber-300",
        };
      case "failed":
        return {
          label: "Tunnel failed",
          dotClass: "bg-red-500",
          textClass: "text-red-700 dark:text-red-300",
        };
      case "needs-token":
        return {
          label: "ngrok authtoken required",
          dotClass: "bg-amber-500",
          textClass: "text-amber-700 dark:text-amber-300",
        };
      case "disabled":
      default:
        return {
          label: isRunning ? "Local network only" : "Public tunnel inactive",
          dotClass: "bg-muted-foreground/50",
          textClass: "text-muted-foreground",
        };
    }
  }, [tunnelPhase, isRunning]);

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
          detail: "GET /health responded successfully through the public tunnel.",
        });
        return;
      }
      setTunnelTestOutcome({
        ok: false,
        detail:
          "Could not reach /health through the public URL. Confirm the API server is running and your firewall allows outbound HTTPS.",
      });
    } finally {
      setTunnelTestLoading(false);
    }
  };

  const apiKeyDisplay = maskApiKey(apiKey, showApiKey);

  return (
    <div className="min-h-full bg-muted/30 pb-10">
      {/* ------------------------- Top Bar ------------------------- */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              aria-label="Back"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold leading-tight">
                  Mobile Server
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  REST API for phones and tablets
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusPill isRunning={isRunning} />
            {isRunning ? (
              <Button
                onClick={handleStop}
                disabled={loading}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                disabled={loading || !config.enabled}
                size="sm"
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-6 pt-6">
        {/* ------------------------- Toast Banners ------------------------- */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Something went wrong</p>
              <p className="mt-0.5 text-destructive/80">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-medium text-destructive/70 hover:text-destructive"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-xs font-medium opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ------------------------- Connection Hero ------------------------- */}
        <Section
          icon={Network}
          title="Connection"
          description={
            isRunning
              ? "Share this URL with your mobile clients. The API is live."
              : "Start the server to publish a URL for your mobile clients."
          }
          action={
            isRunning && tunnelUrl ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleTestTunnel()}
                  disabled={tunnelTestLoading}
                  className="gap-2"
                >
                  {tunnelTestLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube2 className="h-4 w-4" />
                  )}
                  Test tunnel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQr((v) => !v)}
                  className="gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  {showQr ? "Hide QR" : "QR code"}
                </Button>
              </div>
            ) : undefined
          }
        >
          {!isRunning ? (
            <EmptyConnectionState enabled={config.enabled} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
              <div className="space-y-4 min-w-0">
                {/* Primary URL */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center gap-2 text-xs font-medium", tunnelStatusMeta.textClass)}>
                      <span className={cn("h-2 w-2 rounded-full", tunnelStatusMeta.dotClass)} />
                      {tunnelStatusMeta.label}
                    </span>
                    {tunnelUrl && (
                      <Badge variant="outline" className="border-primary/30 bg-primary/5 text-xs text-primary">
                        Public
                      </Badge>
                    )}
                  </div>
                  <div className="group flex items-stretch gap-2 rounded-lg border bg-background">
                    <div className="flex min-w-0 flex-1 items-center px-3">
                      <code className="truncate font-mono text-sm">{primaryUrl}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(primaryUrl, "primary")}
                      className="h-auto gap-2 rounded-l-none border-l px-3"
                    >
                      {copied === "primary" ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied === "primary" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                {/* Secondary URL (local fallback when tunnel active) */}
                {tunnelUrl && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Local fallback
                    </p>
                    <div className="flex items-stretch gap-2 rounded-lg border border-dashed bg-muted/30">
                      <div className="flex min-w-0 flex-1 items-center px-3 py-2">
                        <code className="truncate font-mono text-xs text-muted-foreground">
                          {localUrl}
                        </code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(localUrl, "local")}
                        className="h-auto rounded-l-none border-l px-3"
                      >
                        {copied === "local" ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tunnel phase detail */}
                <TunnelPhaseBanner
                  phase={tunnelPhase}
                  tunnelError={tunnelError}
                  reservedDomain={config.ngrokDomain}
                />

                {/* Test-tunnel outcome */}
                {tunnelTestOutcome && (
                  <div
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                      tunnelTestOutcome.ok
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                        : "border-destructive/30 bg-destructive/5 text-destructive",
                    )}
                  >
                    {tunnelTestOutcome.ok ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{tunnelTestOutcome.detail}</span>
                  </div>
                )}

                {/* API key */}
                {config.requireAuth && apiKey && (
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">API key</p>
                      <Badge variant="outline" className="text-xs">
                        Required header
                      </Badge>
                    </div>
                    <div className="flex items-stretch gap-2 rounded-lg border bg-background">
                      <div className="flex min-w-0 flex-1 items-center px-3">
                        <code className="truncate font-mono text-sm">{apiKeyDisplay}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowApiKey((v) => !v)}
                        className="h-auto gap-2 rounded-none border-l px-3"
                        title={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(apiKey, "apikey")}
                        className="h-auto gap-2 rounded-l-none border-l px-3"
                      >
                        {copied === "apikey" ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copied === "apikey" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Send as <code className="rounded bg-muted px-1">X-API-Key</code> header or{" "}
                      <code className="rounded bg-muted px-1">Authorization: Bearer …</code>
                    </p>
                  </div>
                )}
              </div>

              {/* QR code */}
              {showQr && (
                <div className="flex flex-col items-center gap-2 rounded-lg border bg-background p-4">
                  <div className="rounded-md bg-white p-3">
                    <QRCodeSVG value={primaryUrl} size={160} includeMargin={false} level="M" />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Scan from a phone camera
                    <br />
                    to open this URL.
                  </p>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* ------------------------- Two-column settings ------------------------- */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* General settings */}
          <Section
            icon={Server}
            title="Server settings"
            description="Core API server configuration"
            action={
              isRunning && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Locked while running
                </Badge>
              )
            }
          >
            <div className="space-y-1 divide-y">
              <ToggleRow
                id="enabled"
                icon={Wifi}
                title="Enable mobile server"
                description="Allow mobile clients to connect to OmniLedger"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                disabled={isRunning}
              />
              <ToggleRow
                id="cors"
                icon={Globe}
                title="Enable CORS"
                description="Allow cross-origin requests from mobile apps"
                checked={config.enableCORS}
                onCheckedChange={(checked) => setConfig({ ...config, enableCORS: checked })}
                disabled={isRunning}
              />
              <ToggleRow
                id="auth"
                icon={config.requireAuth ? Lock : Unlock}
                title="Require authentication"
                description="Require API key for every request (recommended)"
                checked={config.requireAuth}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    requireAuth: checked,
                    apiKey: checked ? config.apiKey : undefined,
                  })
                }
                disabled={isRunning}
              />
              <div className="opacity-60">
                <ToggleRow
                  id="https"
                  icon={Shield}
                  title="Enable HTTPS"
                  description="Secure connections with SSL/TLS (coming soon)"
                  checked={config.enableHTTPS}
                  onCheckedChange={(checked) => setConfig({ ...config, enableHTTPS: checked })}
                  disabled={true}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Port"
                htmlFor="port"
                hint="Default 3000. Between 1024 and 65535."
              >
                <Input
                  id="port"
                  type="number"
                  value={config.port || 3000}
                  onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 3000 })}
                  disabled={isRunning}
                  min={1024}
                  max={65535}
                  className="font-mono"
                />
              </Field>
              <Field
                label="Host"
                htmlFor="host"
                hint={
                  config.host === "0.0.0.0"
                    ? "Accessible from all network interfaces"
                    : "Accessible only from this computer"
                }
              >
                <select
                  id="host"
                  value={config.host || "0.0.0.0"}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  disabled={isRunning}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="0.0.0.0">0.0.0.0 — all interfaces</option>
                  <option value="localhost">localhost — this computer only</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Public Access (ngrok) */}
          <Section
            icon={Globe}
            title="Public access"
            description="Expose the mobile API to the internet via ngrok"
            action={
              <Badge
                variant="outline"
                className={cn(
                  "gap-1.5 text-xs",
                  config.enablePublicTunnel !== false
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    config.enablePublicTunnel !== false ? "bg-primary" : "bg-muted-foreground/50",
                  )}
                />
                {config.enablePublicTunnel !== false ? "Enabled" : "Disabled"}
              </Badge>
            }
          >
            <div className="-mt-2">
              <ToggleRow
                id="enablePublicTunnel"
                icon={Network}
                title="Enable public tunnel"
                description="Start an ngrok tunnel when the server starts"
                checked={config.enablePublicTunnel !== false}
                onCheckedChange={(checked) => setConfig({ ...config, enablePublicTunnel: checked })}
                disabled={isRunning}
              />
            </div>

            <div
              className={cn(
                "mt-5 space-y-4 transition-opacity",
                config.enablePublicTunnel === false && "pointer-events-none opacity-40",
              )}
            >
              <Field
                label="ngrok authtoken"
                htmlFor="ngrokAuthtoken"
                badge={
                  !config.ngrokAuthtoken?.trim() ? (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/5 text-[10px] text-amber-700 dark:text-amber-300">
                      Required
                    </Badge>
                  ) : undefined
                }
                hint={
                  <>
                    Get a free token at{" "}
                    <a
                      href="https://dashboard.ngrok.com/get-started/your-authtoken"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                    >
                      dashboard.ngrok.com <ExternalLink className="h-3 w-3" />
                    </a>
                    . Stored locally.
                  </>
                }
              >
                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="ngrokAuthtoken"
                      type={showAuthtoken ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      value={config.ngrokAuthtoken || ""}
                      onChange={(e) => setConfig({ ...config, ngrokAuthtoken: e.target.value })}
                      disabled={isRunning}
                      placeholder="2abcDEF...your ngrok authtoken"
                      className="pl-9 font-mono"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAuthtoken((v) => !v)}
                    disabled={isRunning}
                    title={showAuthtoken ? "Hide token" : "Show token"}
                  >
                    {showAuthtoken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </Field>

              <Field
                label="Reserved domain"
                htmlFor="ngrokDomain"
                badge={<span className="text-[10px] text-muted-foreground">Optional</span>}
                hint="Leave blank for a random URL each run. Paid plans can reserve a stable subdomain."
              >
                <Input
                  id="ngrokDomain"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={config.ngrokDomain || ""}
                  onChange={(e) => setConfig({ ...config, ngrokDomain: e.target.value })}
                  disabled={isRunning}
                  placeholder="my-shop.ngrok.app"
                  className="font-mono"
                />
              </Field>

              <Field
                label="Region"
                htmlFor="ngrokRegion"
                badge={<span className="text-[10px] text-muted-foreground">Optional</span>}
                hint="Pick the region closest to your mobile users for lowest latency."
              >
                <select
                  id="ngrokRegion"
                  value={config.ngrokRegion || ""}
                  onChange={(e) => setConfig({ ...config, ngrokRegion: e.target.value })}
                  disabled={isRunning}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Auto (closest)</option>
                  <option value="us">United States (us)</option>
                  <option value="eu">Europe (eu)</option>
                  <option value="ap">Asia / Pacific (ap)</option>
                  <option value="au">Australia (au)</option>
                  <option value="sa">South America (sa)</option>
                  <option value="jp">Japan (jp)</option>
                  <option value="in">India (in)</option>
                </select>
              </Field>

              <div className="rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">About ngrok's free-tier warning</p>
                    <p className="leading-relaxed opacity-90">
                      Opening the URL in a browser shows a one-time abuse warning. This app and mobile clients
                      bypass it automatically via the{" "}
                      <code className="rounded bg-blue-500/10 px-1">ngrok-skip-browser-warning</code> header. Paid
                      plans remove the warning for browsers too.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ------------------------- API Endpoints ------------------------- */}
        <EndpointsSection
          baseUrl={primaryUrl}
          apiKey={config.requireAuth ? apiKey : undefined}
        />
      </div>
    </div>
  );
}

/* --------------------------- Sub-components --------------------------- */

function StatusPill({ isRunning }: { isRunning: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        isRunning
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-muted-foreground/30 bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isRunning ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50",
        )}
      />
      {isRunning ? "Running" : "Stopped"}
    </span>
  );
}

function EmptyConnectionState({ enabled }: { enabled: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <WifiOff className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Server is not running</p>
        <p className="text-xs text-muted-foreground">
          {enabled
            ? "Press Start in the top bar to publish the mobile API."
            : "Enable the mobile server below, then press Start to publish the API."}
        </p>
      </div>
    </div>
  );
}

function TunnelPhaseBanner({
  phase,
  tunnelError,
  reservedDomain,
}: {
  phase: TunnelPhase;
  tunnelError: string | undefined;
  reservedDomain: string | undefined;
}) {
  if (phase === "ready") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="leading-relaxed">
          Public endpoint verified.{" "}
          {reservedDomain
            ? "This is your reserved ngrok domain — stable across restarts."
            : "This is a temporary URL and will change when the tunnel restarts. Set a reserved domain for a stable URL."}
        </span>
      </div>
    );
  }
  if (phase === "verifying") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed bg-muted/30 px-3 py-2.5">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-medium">Verifying public connectivity…</p>
          <p className="text-[11px] text-muted-foreground">
            Polling GET /health every {TUNNEL_VERIFY_INTERVAL_MS / 1000}s for up to{" "}
            {TUNNEL_VERIFY_MAX_MS / 1000}s.
          </p>
        </div>
      </div>
    );
  }
  if (phase === "timeout") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Health check timed out</p>
          <p className="opacity-90 leading-relaxed">
            The ngrok tunnel is up but GET /health didn't respond. Check that the API server didn't crash, and
            click <strong>Test tunnel</strong> to retry.
          </p>
        </div>
      </div>
    );
  }
  if (phase === "starting") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed bg-muted/30 px-3 py-2.5">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs font-medium">Starting ngrok tunnel…</p>
          <p className="text-[11px] text-muted-foreground">Usually takes a couple of seconds.</p>
        </div>
      </div>
    );
  }
  if (phase === "needs-token") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
        <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="leading-relaxed">
          Add an ngrok authtoken in <strong>Public access</strong> to publish a public URL. The server is still
          reachable on your LAN.
        </span>
      </div>
    );
  }
  if (phase === "failed") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-medium">Public tunnel failed</p>
          {tunnelError && <p className="opacity-90 leading-relaxed">{tunnelError}</p>}
        </div>
      </div>
    );
  }
  if (phase === "disabled") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span className="leading-relaxed">
          Public tunnel is disabled. The URL above only works on this computer or your local network.
        </span>
      </div>
    );
  }
  return null;
}

/* ----------------------------- Endpoints ----------------------------- */

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface EndpointParam {
  name: string;
  in: "query" | "path" | "body";
  type: string;
  required?: boolean;
  description: string;
  example?: string;
}

interface EndpointSpec {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  scope: "Public" | "Company";
  auth: "Open" | "Required";
  params?: EndpointParam[];
  requestExample?: string;
  responseExample: string;
  notes?: string;
}

const ENDPOINTS: EndpointSpec[] = [
  {
    id: "health",
    method: "GET",
    path: "/health",
    summary: "Server health check",
    description:
      "Returns a quick liveness probe. Does not require authentication and is safe to poll from load balancers or mobile clients.",
    scope: "Public",
    auth: "Open",
    responseExample: `{
  "success": true,
  "data": {
    "status": "running",
    "version": "1.0.1",
    "serverName": "OmniLedger Server"
  }
}`,
  },
  {
    id: "companies",
    method: "GET",
    path: "/api/companies",
    summary: "List companies",
    description:
      "Returns every company registered in this OmniLedger instance. Use one of these IDs as the companyId parameter for all scoped endpoints below.",
    scope: "Public",
    auth: "Required",
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "c_01HXYZ...",
      "name": "Acme Trading Co.",
      "address": "123 Market St",
      "phone": "+1 555 0100",
      "email": "hello@acme.example",
      "currency": "USD"
    }
  ]
}`,
  },
  {
    id: "products",
    method: "GET",
    path: "/api/products",
    summary: "List products with batches",
    description:
      "Returns all products for a company, each with their current batches (quantity, available quantity, expiry date).",
    scope: "Company",
    auth: "Required",
    params: [
      { name: "companyId", in: "query", type: "string", required: true, description: "Company identifier", example: "c_01HXYZ..." },
    ],
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "p_01...",
      "code": "SKU-001",
      "name": "Paracetamol 500mg",
      "category": "Medicine",
      "tradePrice": "4.50",
      "retailPrice": "6.00",
      "batches": [
        {
          "id": "b_01...",
          "batchNumber": "B-2026-01",
          "quantity": 200,
          "availableQuantity": 145,
          "expiryDate": "2027-01-31"
        }
      ]
    }
  ]
}`,
  },
  {
    id: "product-detail",
    method: "GET",
    path: "/api/products/{id}",
    summary: "Product detail",
    description: "Returns a single product by its ID, including all related batches.",
    scope: "Company",
    auth: "Required",
    params: [
      { name: "id", in: "path", type: "string", required: true, description: "Product identifier", example: "p_01..." },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "id": "p_01...",
    "code": "SKU-001",
    "name": "Paracetamol 500mg",
    "category": "Medicine",
    "tradePrice": "4.50",
    "retailPrice": "6.00",
    "batches": [ /* ... */ ]
  }
}`,
  },
  {
    id: "customers",
    method: "GET",
    path: "/api/customers",
    summary: "List customers",
    description: "Returns every customer for the given company, sorted alphabetically by name.",
    scope: "Company",
    auth: "Required",
    params: [
      { name: "companyId", in: "query", type: "string", required: true, description: "Company identifier" },
    ],
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "cu_01...",
      "code": "C-0001",
      "name": "John Smith",
      "phone": "+1 555 0101",
      "address": "1 Elm St"
    }
  ]
}`,
  },
  {
    id: "sales-list",
    method: "GET",
    path: "/api/sales",
    summary: "List sales (paginated)",
    description:
      "Returns sales for a company in descending date order. Includes customer info and line items (product + batch) per sale.",
    scope: "Company",
    auth: "Required",
    params: [
      { name: "companyId", in: "query", type: "string", required: true, description: "Company identifier" },
      { name: "limit", in: "query", type: "number", description: "Max rows to return (default 50)", example: "50" },
      { name: "offset", in: "query", type: "number", description: "Rows to skip for pagination (default 0)", example: "0" },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "sales": [
      {
        "id": "s_01...",
        "saleNumber": "SALE-0001",
        "saleDate": "2026-04-20T10:21:00.000Z",
        "totalAmount": "123.45",
        "paymentType": "cash",
        "status": "completed",
        "customer": { "id": "cu_01...", "name": "John Smith", "code": "C-0001" },
        "items": [ /* ... */ ]
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}`,
  },
  {
    id: "sales-create",
    method: "POST",
    path: "/api/sales",
    summary: "Create a sale",
    description:
      "Creates a sale and deducts stock from the specified batches atomically. Fails if any batch has insufficient available quantity.",
    scope: "Company",
    auth: "Required",
    params: [
      { name: "companyId", in: "body", type: "string", required: true, description: "Company identifier" },
      { name: "customerId", in: "body", type: "string", required: true, description: "Customer to bill" },
      { name: "items", in: "body", type: "array", required: true, description: "Line items with productId, batchId, quantity, unitPrice" },
      { name: "paymentType", in: "body", type: "\"cash\" | \"credit\"", description: "Defaults to 'cash'" },
      { name: "notes", in: "body", type: "string", description: "Optional free-text notes" },
    ],
    requestExample: `{
  "companyId": "c_01...",
  "customerId": "cu_01...",
  "paymentType": "cash",
  "notes": "Walk-in customer",
  "items": [
    {
      "productId": "p_01...",
      "batchId": "b_01...",
      "quantity": 2,
      "unitPrice": 6.00
    }
  ]
}`,
    responseExample: `{
  "success": true,
  "data": {
    "id": "s_01...",
    "saleNumber": "SALE-0002",
    "saleDate": "2026-04-20T12:00:00.000Z",
    "totalAmount": 12,
    "paidAmount": 12,
    "paymentType": "cash",
    "status": "completed",
    "items": [ /* with product and batch expanded */ ]
  },
  "message": "Sale created successfully"
}`,
    notes:
      "The whole operation runs inside a DB transaction. If any batch is missing or low on stock, nothing is persisted.",
  },
  {
    id: "inventory",
    method: "GET",
    path: "/api/inventory",
    summary: "Current inventory levels",
    description:
      "Returns one row per product with total and currently-available quantity summed across all batches.",
    scope: "Company",
    auth: "Required",
    params: [
      { name: "companyId", in: "query", type: "string", required: true, description: "Company identifier" },
    ],
    responseExample: `{
  "success": true,
  "data": [
    {
      "productId": "p_01...",
      "productCode": "SKU-001",
      "productName": "Paracetamol 500mg",
      "totalQuantity": 200,
      "availableQuantity": 145,
      "batches": [ /* ... */ ]
    }
  ]
}`,
  },
  {
    id: "dashboard",
    method: "GET",
    path: "/api/dashboard",
    summary: "Dashboard summary",
    description:
      "Returns today's revenue & sales count, totals for products and customers, and how many products are below the low-stock threshold (availableQuantity < 10).",
    scope: "Company",
    auth: "Required",
    params: [
      { name: "companyId", in: "query", type: "string", required: true, description: "Company identifier" },
    ],
    responseExample: `{
  "success": true,
  "data": {
    "todayRevenue": 1284.5,
    "todaySalesCount": 12,
    "totalProducts": 87,
    "totalCustomers": 43,
    "lowStockProducts": 6
  }
}`,
  },
];

function methodClass(method: HttpMethod): string {
  switch (method) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    case "POST":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
    case "PUT":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
    case "PATCH":
      return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
    case "DELETE":
      return "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20";
  }
}

function buildExamplePath(spec: EndpointSpec): string {
  let p = spec.path;
  const pathParam = spec.params?.find((x) => x.in === "path");
  if (pathParam) {
    p = p.replace(`{${pathParam.name}}`, pathParam.example ?? "{id}");
  }
  const queryParams = (spec.params || []).filter((x) => x.in === "query");
  if (queryParams.length) {
    const qs = queryParams
      .map((q) => `${q.name}=${encodeURIComponent(q.example || `{${q.name}}`)}`)
      .join("&");
    p += `?${qs}`;
  }
  return p;
}

function buildCurl(spec: EndpointSpec, baseUrl: string, apiKey: string | undefined): string {
  const url = `${baseUrl.replace(/\/+$/, "")}${buildExamplePath(spec)}`;
  const lines: string[] = [`curl -X ${spec.method} "${url}"`];
  if (spec.auth === "Required" && apiKey) {
    lines.push(`  -H "X-API-Key: ${apiKey}"`);
  } else if (spec.auth === "Required") {
    lines.push(`  -H "X-API-Key: <your-api-key>"`);
  }
  lines.push(`  -H "ngrok-skip-browser-warning: omniledger"`);
  if (spec.requestExample) {
    lines.push(`  -H "Content-Type: application/json"`);
    const body = spec.requestExample.replace(/\n\s*/g, " ").replace(/"/g, '\\"');
    lines.push(`  -d "${body}"`);
  }
  return lines.join(" \\\n");
}

function EndpointsSection({
  baseUrl,
  apiKey,
}: {
  baseUrl: string;
  apiKey: string | undefined;
}) {
  const [sectionOpen, setSectionOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENDPOINTS;
    return ENDPOINTS.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }, [query]);

  const allExpanded = filtered.length > 0 && filtered.every((e) => expanded.has(e.id));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(filtered.map((e) => e.id)));
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1500);
  };

  return (
    <Section
      icon={ListTree}
      title="API endpoints"
      description={`${ENDPOINTS.length} REST endpoints exposed by the mobile server`}
      collapsible
      open={sectionOpen}
      onOpenChange={setSectionOpen}
      action={
        <Badge variant="outline" className="text-[10px]">
          {ENDPOINTS.length} endpoints
        </Badge>
      }
    >
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by path, method, or description…"
            className="h-9 pl-3 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleAll}
          disabled={filtered.length === 0}
          className="gap-2"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              allExpanded ? "rotate-180" : "rotate-0",
            )}
          />
          {allExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          No endpoints match "{query}".
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border divide-y">
          {filtered.map((spec) => {
            const open = expanded.has(spec.id);
            return (
              <div key={spec.id} className={cn(open && "bg-muted/20")}>
                <button
                  type="button"
                  onClick={() => toggle(spec.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  aria-expanded={open}
                >
                  <span
                    className={cn(
                      "inline-flex min-w-[56px] shrink-0 justify-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold",
                      methodClass(spec.method),
                    )}
                  >
                    {spec.method}
                  </span>
                  <code className="truncate font-mono text-sm text-foreground">{spec.path}</code>
                  <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                    — {spec.summary}
                  </span>
                  <div className="ml-auto flex shrink-0 items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        spec.auth === "Required"
                          ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                          : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {spec.auth === "Required" ? (
                        <Lock className="mr-1 h-2.5 w-2.5" />
                      ) : (
                        <Unlock className="mr-1 h-2.5 w-2.5" />
                      )}
                      {spec.auth}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {spec.scope}
                    </Badge>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        open ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </div>
                </button>

                {open && (
                  <EndpointDetail
                    spec={spec}
                    baseUrl={baseUrl}
                    apiKey={apiKey}
                    copiedKey={copiedKey}
                    onCopy={copy}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Company-scoped endpoints need a <code className="rounded bg-muted px-1">companyId</code>.{" "}
          <code className="rounded bg-muted px-1">GET /health</code> stays open even when authentication is on —
          everything else requires the API key when it's enabled.
        </span>
      </p>
    </Section>
  );
}

function EndpointDetail({
  spec,
  baseUrl,
  apiKey,
  copiedKey,
  onCopy,
}: {
  spec: EndpointSpec;
  baseUrl: string;
  apiKey: string | undefined;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const curl = useMemo(() => buildCurl(spec, baseUrl, apiKey), [spec, baseUrl, apiKey]);
  const fullUrl = `${baseUrl.replace(/\/+$/, "")}${buildExamplePath(spec)}`;
  const paramsByScope = useMemo(() => {
    const groups: Record<EndpointParam["in"], EndpointParam[]> = { path: [], query: [], body: [] };
    (spec.params || []).forEach((p) => groups[p.in].push(p));
    return groups;
  }, [spec.params]);

  return (
    <div className="space-y-5 border-t bg-background px-4 py-5 sm:px-5">
      {/* Description */}
      <p className="text-sm leading-relaxed text-muted-foreground">{spec.description}</p>

      {/* URL preview */}
      <div>
        <DetailLabel>Full URL</DetailLabel>
        <CopyablePre
          content={fullUrl}
          copied={copiedKey === `url-${spec.id}`}
          onCopy={() => onCopy(fullUrl, `url-${spec.id}`)}
        />
      </div>

      {/* Params */}
      {(paramsByScope.path.length > 0 || paramsByScope.query.length > 0 || paramsByScope.body.length > 0) && (
        <div className="space-y-3">
          <DetailLabel>Parameters</DetailLabel>
          {(["path", "query", "body"] as const).map((group) =>
            paramsByScope[group].length > 0 ? (
              <ParamTable key={group} group={group} params={paramsByScope[group]} />
            ) : null,
          )}
        </div>
      )}

      {/* Request body example */}
      {spec.requestExample && (
        <div>
          <DetailLabel>Request body</DetailLabel>
          <CopyablePre
            content={spec.requestExample}
            copied={copiedKey === `req-${spec.id}`}
            onCopy={() => onCopy(spec.requestExample!, `req-${spec.id}`)}
            language="json"
          />
        </div>
      )}

      {/* Response example */}
      <div>
        <DetailLabel>Example response</DetailLabel>
        <CopyablePre
          content={spec.responseExample}
          copied={copiedKey === `res-${spec.id}`}
          onCopy={() => onCopy(spec.responseExample, `res-${spec.id}`)}
          language="json"
        />
      </div>

      {/* cURL */}
      <div>
        <DetailLabel>cURL example</DetailLabel>
        <CopyablePre
          content={curl}
          copied={copiedKey === `curl-${spec.id}`}
          onCopy={() => onCopy(curl, `curl-${spec.id}`)}
          language="bash"
        />
      </div>

      {/* Notes */}
      {spec.notes && (
        <div className="flex items-start gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-900 dark:text-blue-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-relaxed">{spec.notes}</span>
        </div>
      )}
    </div>
  );
}

function DetailLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function ParamTable({ group, params }: { group: "path" | "query" | "body"; params: EndpointParam[] }) {
  const label = group === "path" ? "Path" : group === "query" ? "Query string" : "Body";
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center justify-between bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span>{params.length} {params.length === 1 ? "field" : "fields"}</span>
      </div>
      <table className="w-full text-xs">
        <tbody className="divide-y">
          {params.map((p) => (
            <tr key={p.name}>
              <td className="whitespace-nowrap px-3 py-2 align-top">
                <code className="font-mono text-xs font-semibold">{p.name}</code>
                {p.required && (
                  <span className="ml-1 text-[10px] font-semibold text-destructive">*</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 align-top">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {p.type}
                </code>
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopyablePre({
  content,
  copied,
  onCopy,
  language,
}: {
  content: string;
  copied: boolean;
  onCopy: () => void;
  language?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-md border bg-muted/40">
      {language && (
        <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
          <span>{language}</span>
        </div>
      )}
      <pre className="overflow-x-auto px-3 py-2.5 text-xs leading-relaxed">
        <code className="font-mono">{content}</code>
      </pre>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCopy}
        className="absolute right-2 top-2 h-7 gap-1.5 px-2 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-500" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
