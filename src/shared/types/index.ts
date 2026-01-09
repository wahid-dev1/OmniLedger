// Shared types across main and renderer processes

export type DatabaseType = "sqlite" | "postgresql" | "mysql" | "mssql";
export type SSLMode = "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full";

export interface SSHTunnelConfig {
  enabled: boolean;
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  sshPassword?: string; // Will be encrypted
  sshPrivateKey?: string; // Path to private key file (alternative to password)
  sshPassphrase?: string; // Passphrase for private key (if encrypted)
  localPort?: number; // Local port to bind to (auto-assigned if not specified)
  remoteHost?: string; // Remote host to forward to (defaults to database host)
  remotePort?: number; // Remote port to forward to (defaults to database port)
  keepAlive?: boolean; // Keep SSH connection alive
  keepAliveInterval?: number; // Keep alive interval in milliseconds (default: 10000)
}

export interface DatabaseConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string; // Will be encrypted
  connectionString?: string; // For SQLite or custom connections
  // SSL/TLS Configuration
  ssl?: boolean;
  sslMode?: SSLMode;
  sslCa?: string; // Path to CA certificate file
  sslCert?: string; // Path to client certificate file
  sslKey?: string; // Path to client key file
  // SSH Tunnel / Port Forwarding Configuration
  sshTunnel?: SSHTunnelConfig;
  // Profile metadata
  profileName?: string; // Name for this connection profile
  lastUsed?: Date; // Last time this profile was used
}

export interface ConnectionProfile {
  id: string;
  name: string;
  config: DatabaseConfig;
  createdAt: Date;
  lastUsed: Date;
  isDefault?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "cashier";
  companyId: string;
  databaseConfig?: DatabaseConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mobile Server API Configuration
export interface MobileServerConfig {
  enabled: boolean;
  port: number; // Default: 3000
  host: string; // Default: "0.0.0.0" (all interfaces) or "localhost" (local only)
  enableCORS: boolean; // Enable CORS for mobile apps
  allowedOrigins?: string[]; // Specific origins to allow (empty = all)
  requireAuth: boolean; // Require API key/token authentication
  apiKey?: string; // API key for mobile app authentication (auto-generated if not set)
  enableHTTPS: boolean; // Enable HTTPS (requires certificates)
  httpsCertPath?: string; // Path to SSL certificate
  httpsKeyPath?: string; // Path to SSL private key
  // Network discovery
  enableDiscovery: boolean; // Enable network discovery/broadcasting
  serverName?: string; // Server name for discovery (defaults to Company name)
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

