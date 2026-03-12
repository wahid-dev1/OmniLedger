/**
 * Database Service
 * Handles database connection and configuration per user at runtime
 * Supports SQLite, PostgreSQL, MySQL, and MSSQL
 * 
 * Note: Database configuration is done at runtime, not via .env file
 */

import { Sequelize } from 'sequelize';
import type { DatabaseConfig } from '../shared/types';
import { SequelizeConfig } from '../database/sequelize.config';
import { initializeAllModels } from '../database/models/relationships';
import { validateConnectionConfig } from './connection-manager';

// Type-safe global variable declaration for connection singleton
declare global {
  // eslint-disable-next-line no-var
  var __OMNILEGER_DB_CONNECTIONS__: Map<string, Sequelize> | undefined;
}

// Ensure the connections map is initialized only once (singleton pattern for hot-reloads in development)
if (!global.__OMNILEGER_DB_CONNECTIONS__) {
  global.__OMNILEGER_DB_CONNECTIONS__ = new Map<string, Sequelize>();
}
const connections = global.__OMNILEGER_DB_CONNECTIONS__;

export class DatabaseService {
  /**
   * Get or create a Sequelize instance for a specific user's database configuration
   * Database configuration is provided at runtime, not from .env
   * 
   * For SQLite databases, this will configure PRAGMA settings asynchronously
   * to prevent locking issues. The configuration happens in the background
   * and won't block the return of the connection.
   */
  static getClient(userId: string, config: DatabaseConfig): Sequelize {
    // Check if we already have a connection for this user
    if (connections.has(userId)) {
      return connections.get(userId)!;
    }

    // Create Sequelize instance based on database configuration
    const sequelize = SequelizeConfig.createSequelize(config);

    // Initialize all models and relationships
    initializeAllModels(sequelize);

    // Configure SQLite with PRAGMA settings for better concurrency (non-blocking)
    // This helps prevent "database is locked" errors
    if (config.type === 'sqlite') {
      // Configure asynchronously - this ensures WAL mode and busy timeout are set
      SequelizeConfig.configureSQLite(sequelize).catch((error) => {
        console.error('Failed to configure SQLite settings:', error);
        // Don't throw - connection will still work, just without optimizations
      });
    }

    // Store the connection
    connections.set(userId, sequelize);

    return sequelize;
  }

  /**
   * Disconnect a user's database connection
   */
  static async disconnect(userId: string): Promise<void> {
    const sequelize = connections.get(userId);
    if (sequelize) {
      await sequelize.close();
      connections.delete(userId);
    }
  }

  /**
   * Disconnect all database connections
   */
  static async disconnectAll(): Promise<void> {
    const promises = Array.from(connections.values()).map((sequelize) =>
      sequelize.close()
    );
    await Promise.all(promises);
    connections.clear();
  }

  /**
   * Test database connection
   */
  static async testConnection(config: DatabaseConfig): Promise<{
    success: boolean;
    error?: string;
  }> {
    const validation = validateConnectionConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: `Missing required fields: ${validation.missing?.join(', ')}`,
      };
    }

    try {
      const sequelize = SequelizeConfig.createSequelize(config);
      const isConnected = await SequelizeConfig.testConnection(sequelize, config);
      await sequelize.close();
      
      return isConnected 
        ? { success: true } 
        : { success: false, error: 'Connection test failed' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Connection failed';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Initialize database - create tables if they don't exist
   * This should be called when a user first connects to their database
   */
  static async initializeDatabase(
    config: DatabaseConfig
  ): Promise<{ success: boolean; error?: string; migrated?: boolean; seeded?: boolean }> {
    let sequelize: Sequelize | null = null;
    try {
      // Test connection first
      const connectionTest = await this.testConnection(config);
      if (!connectionTest.success) {
        return connectionTest;
      }

      // Create Sequelize instance and initialize models
      // Use a temporary connection that we'll manage ourselves
      sequelize = SequelizeConfig.createSequelize(config);
      initializeAllModels(sequelize);

      // Import DatabaseMigrationService dynamically to avoid circular dependencies
      const { DatabaseMigrationService } = await import('./database-migration.service');

      // Always run migrations - creates tables if needed, adds new columns (trackByBatch, unitPrice, etc.)
      const migrationResult = await DatabaseMigrationService.runMigrations(config, sequelize);
      
      if (!migrationResult.success) {
        if (sequelize) {
          await sequelize.close();
        }
        return {
          success: false,
          error: migrationResult.error || 'Failed to run database migrations',
        };
      }

      // After successful table sync, check if database is empty and seed it
      let seeded = false;
      try {
        const { Company } = await import('../database/models/Company');
        const existingCompanies = await Company.count();
        
        if (existingCompanies === 0) {
          const { SeedService } = await import('./seed.service');
          await SeedService.seedDatabase(sequelize);
          seeded = true;
        }
      } catch {
        // Don't fail initialization if seeding fails
      }
      
      // Close the connection
      if (sequelize) {
        await sequelize.close();
      }

      return { success: true, migrated: true, seeded };
    } catch (error) {
      // Ensure we close the connection even on error
      if (sequelize) {
        try {
          await sequelize.close();
        } catch (closeError) {
          console.error('Error closing sequelize connection:', closeError);
        }
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Initialization failed';
      return { success: false, error: errorMessage };
    }
  }
}
