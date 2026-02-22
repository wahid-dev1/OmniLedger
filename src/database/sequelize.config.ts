/**
 * Sequelize Configuration
 * Handles database connection configuration for multiple database types
 */

import { Sequelize, Options } from 'sequelize';
import path from 'path';
import fs from 'fs';
import os from 'os';
import type { DatabaseConfig } from '../shared/types';

// Import Electron app only in main process context (will be undefined in renderer)
let electronApp: typeof import('electron').app | null = null;
try {
  // Only import in main process - check if we're in Node.js environment
  // In Electron main process, window is not defined, but process is
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    electronApp = require('electron').app;
  }
} catch {
  // Not in Electron context or in renderer - that's okay
}

export class SequelizeConfig {
  /**
   * Resolve SQLite database path to absolute path
   * In production Electron builds, relative paths won't work correctly
   * This function ensures the path is absolute and resolves to userData directory
   */
  static resolveSQLitePath(connectionString: string | undefined): string {
    let dbPath = connectionString || './data/omniledger.db';
    
    // Remove 'file:' prefix if present (Prisma format)
    if (dbPath.startsWith('file:')) {
      dbPath = dbPath.replace('file:', '');
    }
    
    // If path is already absolute, use it as-is (but ensure directory exists)
    if (path.isAbsolute(dbPath)) {
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      return dbPath;
    }
    
    // Try to use Electron app.getPath if available and ready
    // This handles production builds correctly
    const isProduction = process.env.NODE_ENV === 'production' || 
                         (electronApp && electronApp.isPackaged);
    
    if (electronApp) {
      try {
        // Check if app is ready (will throw if not ready)
        if (electronApp.isReady()) {
          const userDataPath = electronApp.getPath('userData');
          const dataDir = path.join(userDataPath, 'data');
          
          // Ensure data directory exists
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          
          // If relative path starts with './', resolve from data directory
          // Otherwise, resolve from userData directory
          if (dbPath.startsWith('./')) {
            dbPath = dbPath.replace(/^\.\//, '');
            return path.join(dataDir, dbPath);
          } else {
            return path.join(userDataPath, dbPath);
          }
        }
      } catch {
        // App not ready yet, fall through to development resolution
      }
    }
    
    // In development or when Electron app is not available/ready:
    // Resolve relative to current working directory
    // Also check if we're in a packaged Electron app (production mode)
    // In that case, try to use a sensible default location
    if (isProduction) {
      // In production but app not ready, use OS-specific default location
      const defaultDataDir = process.platform === 'win32'
        ? path.join(os.homedir(), 'AppData', 'Roaming', 'OmniLedger', 'data')
        : process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support', 'OmniLedger', 'data')
        : path.join(os.homedir(), '.config', 'OmniLedger', 'data');
      
      if (!fs.existsSync(defaultDataDir)) {
        fs.mkdirSync(defaultDataDir, { recursive: true });
      }
      
      return dbPath.startsWith('./')
        ? path.join(defaultDataDir, dbPath.replace(/^\.\//, ''))
        : path.join(defaultDataDir, dbPath);
    }
    
    // Development mode: resolve relative to current working directory
    return path.resolve(process.cwd(), dbPath);
  }

  /**
   * Configure SQLite database with PRAGMA settings for better concurrency
   * This should be called after the connection is established
   */
  static async configureSQLite(sequelize: Sequelize): Promise<void> {
    try {
      // Enable WAL mode for better concurrency (allows multiple readers during writes)
      await sequelize.query('PRAGMA journal_mode = WAL;');
      // Set busy timeout to 5 seconds (SQLite will retry for 5 seconds if locked)
      await sequelize.query('PRAGMA busy_timeout = 5000;');
      // Optimize for better performance
      await sequelize.query('PRAGMA synchronous = NORMAL;');
      await sequelize.query('PRAGMA foreign_keys = ON;');
      // Set cache size for better performance (64MB)
      await sequelize.query('PRAGMA cache_size = -64000;');
    } catch (error) {
      console.error('Error configuring SQLite PRAGMA settings:', error);
      // Don't throw - connection can still work without these optimizations
    }
  }

  /**
   * Create Sequelize instance based on database configuration
   */
  static createSequelize(config: DatabaseConfig): Sequelize {
    const sequelizeOptions: Options = {
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true, // Don't pluralize table names
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    };

    switch (config.type) {
      case 'sqlite': {
        // SQLite configuration
        // Resolve path to absolute path (important for production builds)
        const dbPath = this.resolveSQLitePath(config.connectionString);
        
        // Ensure the directory exists before creating the database
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }
        
        // SQLite-specific optimizations to prevent locking issues:
        // 1. WAL mode (Write-Ahead Logging) - allows concurrent reads during writes
        // 2. Busy timeout - retries when database is locked (5 seconds)
        // 3. Reduced pool size - SQLite works better with fewer connections
        // Note: PRAGMA settings are configured via configureSQLite() method after connection
        // Note: sqlite3 native module must be rebuilt for Electron's architecture using electron-rebuild
        return new Sequelize({
          dialect: 'sqlite',
          storage: dbPath,
          logging: sequelizeOptions.logging,
          define: sequelizeOptions.define,
          pool: {
            max: 1, // SQLite works better with a single connection
            min: 0,
            acquire: 30000,
            idle: 10000,
          },
          retry: {
            max: 3, // Retry failed queries up to 3 times
          },
        });
      }

      case 'postgresql': {
        return new Sequelize(
          config.database!,
          config.username!,
          config.password!,
          {
            host: config.host,
            port: config.port || 5432,
            dialect: 'postgres',
            ...sequelizeOptions,
          }
        );
      }

      case 'mysql': {
        const mysqlConfig = {
          host: config.host,
          port: config.port || 3306,
          dialect: 'mysql' as const,
          ...sequelizeOptions,
        };
        return new Sequelize(
          config.database!,
          config.username!,
          config.password!,
          mysqlConfig
        );
      }

      case 'mssql': {
        return new Sequelize(
          config.database!,
          config.username!,
          config.password!,
          {
            host: config.host,
            port: config.port || 1433,
            dialect: 'mssql',
            dialectOptions: {
              options: {
                encrypt: true,
              },
            },
            ...sequelizeOptions,
          }
        );
      }

      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  /**
   * Test database connection
   * For SQLite, also configures PRAGMA settings for better concurrency
   */
  static async testConnection(sequelize: Sequelize, config?: DatabaseConfig): Promise<boolean> {
    try {
      await sequelize.authenticate();
      
      // Configure SQLite with PRAGMA settings for better concurrency and locking handling
      if (config?.type === 'sqlite') {
        await this.configureSQLite(sequelize);
      }
      
      return true;
    } catch (error) {
      // Log error without exposing credentials
      const errMsg = error instanceof Error ? error.message : 'Connection failed';
      if (process.env.NODE_ENV === 'development') {
        console.error('[Sequelize] Connection failed:', errMsg);
      }
      return false;
    }
  }
}

