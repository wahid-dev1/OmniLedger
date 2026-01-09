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
            const resolvedPath = path.join(dataDir, dbPath);
            console.log(`[SequelizeConfig] Resolved SQLite path (production): ${resolvedPath}`);
            return resolvedPath;
          } else {
            const resolvedPath = path.join(userDataPath, dbPath);
            console.log(`[SequelizeConfig] Resolved SQLite path (production): ${resolvedPath}`);
            return resolvedPath;
          }
        }
      } catch (error) {
        // App not ready yet, fall through to development resolution
        console.log('[SequelizeConfig] Electron app not ready, using development path resolution');
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
      
      const resolvedPath = dbPath.startsWith('./')
        ? path.join(defaultDataDir, dbPath.replace(/^\.\//, ''))
        : path.join(defaultDataDir, dbPath);
      
      console.log(`[SequelizeConfig] Resolved SQLite path (production fallback): ${resolvedPath}`);
      return resolvedPath;
    }
    
    // Development mode: resolve relative to current working directory
    const resolvedPath = path.resolve(process.cwd(), dbPath);
    console.log(`[SequelizeConfig] Resolved SQLite path (development): ${resolvedPath}`);
    return resolvedPath;
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
    // DEBUG: Log connection configuration
    console.log("🔍 [DEBUG] SequelizeConfig.createSequelize - Creating Sequelize instance:");
    console.log("   Database Type:", config.type);
    if (config.type === "sqlite") {
      console.log("   Connection String:", config.connectionString);
    } else {
      console.log("   Host:", config.host);
      console.log("   Port:", config.port);
      console.log("   Database:", config.database);
      console.log("   Username:", config.username);
      console.log("   Password:", config.password ? "***" + config.password.slice(-3) : "(not set)");
      console.log("   Full Password (DEBUG):", config.password || "(not set)");
    }
    
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
        
        console.log("   Resolved SQLite path:", dbPath);
        
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
        console.log("🔍 [DEBUG] Creating MySQL Sequelize instance with:");
        console.log("   Database:", config.database);
        console.log("   Username:", config.username);
        console.log("   Password:", config.password ? "***" + config.password.slice(-3) : "(not set)");
        console.log("   Full Password (DEBUG):", config.password || "(not set)");
        console.log("   Host:", mysqlConfig.host);
        console.log("   Port:", mysqlConfig.port);
        console.log("   Connection URL (masked):", `mysql://${config.username}:***@${config.host}:${mysqlConfig.port}/${config.database}`);
        
        const sequelize = new Sequelize(
          config.database!,
          config.username!,
          config.password!,
          mysqlConfig
        );
        
        console.log("✅ [DEBUG] MySQL Sequelize instance created");
        return sequelize;
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
      // DEBUG: Log authentication attempt
      if (config) {
        console.log("🔍 [DEBUG] SequelizeConfig.testConnection - Authenticating:");
        console.log("   Database Type:", config.type);
        if (config.type === "sqlite") {
          console.log("   Connection String:", config.connectionString);
        } else {
          console.log("   Host:", config.host);
          console.log("   Port:", config.port);
          console.log("   Database:", config.database);
          console.log("   Username:", config.username);
          console.log("   Password:", config.password ? "***" + config.password.slice(-3) : "(not set)");
          console.log("   Full Password (DEBUG):", config.password || "(not set)");
        }
      }
      
      await sequelize.authenticate();
      console.log("✅ [DEBUG] SequelizeConfig.testConnection - Authentication successful");
      
      // Configure SQLite with PRAGMA settings for better concurrency and locking handling
      if (config?.type === 'sqlite') {
        await this.configureSQLite(sequelize);
      }
      
      return true;
    } catch (error) {
      console.error('❌ [DEBUG] SequelizeConfig.testConnection - Unable to connect to the database:', error);
      if (config) {
        console.error('   Attempted connection details:');
        console.error('   Type:', config.type);
        if (config.type !== "sqlite") {
          console.error('   Host:', config.host);
          console.error('   Port:', config.port);
          console.error('   Database:', config.database);
          console.error('   Username:', config.username);
          console.error('   Password:', config.password ? "***" + config.password.slice(-3) : "(not set)");
          console.error('   Full Password (DEBUG):', config.password || "(not set)");
        }
      }
      return false;
    }
  }
}

