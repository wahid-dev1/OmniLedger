/**
 * Sequelize Configuration
 * Handles database connection configuration for multiple database types
 */

import { Sequelize, Options } from 'sequelize';
import type { DatabaseConfig } from '../shared/types';

export class SequelizeConfig {
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
        // Remove 'file:' prefix if present (Prisma format)
        let dbPath = config.connectionString || './data/omniledger.db';
        if (dbPath.startsWith('file:')) {
          dbPath = dbPath.replace('file:', '');
        }
        
        // SQLite-specific optimizations to prevent locking issues:
        // 1. WAL mode (Write-Ahead Logging) - allows concurrent reads during writes
        // 2. Busy timeout - retries when database is locked (5 seconds)
        // 3. Reduced pool size - SQLite works better with fewer connections
        // Note: PRAGMA settings are configured via configureSQLite() method after connection
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

