// Shared types across main and renderer processes

export type DatabaseType = "sqlite" | "postgresql" | "mysql" | "mssql";
export type SSLMode = "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full";

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

