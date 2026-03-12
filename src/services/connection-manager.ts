/**
 * Connection Manager
 * Professional database connection handling with health checks, retry logic,
 * and secure logging. Never logs credentials.
 */

import type { DatabaseConfig } from '../shared/types';

/** Connection result with structured error details */
export interface ConnectionResult {
  success: boolean;
  error?: string;
  latencyMs?: number;
  retriesUsed?: number;
}

/** Options for connection attempts */
export interface ConnectionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: ConnectionOptions = {
  timeout: 15000,
  maxRetries: 2,
  retryDelayMs: 1000,
};

/** Safe description of config for logging (never includes password) */
export function describeConfig(config: DatabaseConfig): string {
  if (config.type === 'sqlite') {
    return `SQLite (${config.connectionString ?? 'default'})`;
  }
  return `${config.type}://${config.username ?? '?'}@${config.host ?? '?'}:${config.port ?? '?'}/${config.database ?? '?'}`;
}

/** Check if config has required fields for its type */
export function validateConnectionConfig(config: DatabaseConfig): { valid: boolean; missing?: string[] } {
  const missing: string[] = [];
  
  if (config.type === 'sqlite') {
    if (!config.connectionString?.trim()) {
      missing.push('connection path');
    }
    return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
  }

  if (!config.host?.trim()) missing.push('Host');
  if (!config.database?.trim()) missing.push('Database');
  if (!config.username?.trim()) missing.push('Username');
  if (!config.password) missing.push('Password');

  return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
}

/** Delay helper for retries */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a connection attempt with retry logic.
 * Pass the actual connection logic as a callback.
 */
export async function withRetry<T>(
  attemptFn: () => Promise<T>,
  options: ConnectionOptions = {}
): Promise<{ result: T; retriesUsed: number } | { error: string; retriesUsed: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let retriesUsed = 0;

  for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
    try {
      const result = await attemptFn();
      return { result, retriesUsed };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < opts.maxRetries!) {
        await delay(opts.retryDelayMs!);
        retriesUsed++;
      }
    }
  }

  return {
    error: lastError instanceof Error ? lastError.message : String(lastError),
    retriesUsed,
  };
}
