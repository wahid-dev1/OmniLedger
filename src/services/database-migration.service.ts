/**
 * Database Migration Service
 * Handles database migrations at runtime for user-configured databases
 * 
 * Note: Uses Sequelize sync() to create tables if they don't exist
 */

import { Sequelize } from 'sequelize';
import type { DatabaseConfig } from '../shared/types';
import { DatabaseService } from './database.service';

// Current schema version - increment this when schema changes
export const CURRENT_SCHEMA_VERSION = '1.1.0'; // Updated after removing unitPrice from products

export class DatabaseMigrationService {
  /**
   * Check if database schema is initialized
   * Returns true if all required tables exist
   */
  static async isSchemaInitialized(
    config: DatabaseConfig
  ): Promise<boolean> {
    try {
      const sequelize = DatabaseService.getClient('temp-check', config);
      
      // Try to query a table that should exist (Company table)
      await sequelize.getQueryInterface().describeTable('companies');
      await DatabaseService.disconnect('temp-check');
      
      return true;
    } catch (error) {
      // If tables don't exist, schema is not initialized
      await DatabaseService.disconnect('temp-check').catch(() => {});
      return false;
    }
  }

  /**
   * Run migrations - sync tables (create if they don't exist)
   * This uses Sequelize sync() to create all tables based on models
   * 
   * Note: If a sequelize instance is provided, it will be used and NOT closed.
   * The caller is responsible for closing it. If no instance is provided,
   * a new one will be created and managed internally.
   */
  static async runMigrations(
    config: DatabaseConfig,
    sequelize?: Sequelize
  ): Promise<{ success: boolean; error?: string }> {
    let db: Sequelize | null = null;
    let shouldClose = false;
    
    try {
      console.log("🔍 [DEBUG] DatabaseMigrationService.runMigrations - Starting table sync...");
      console.log("   Database Type:", config.type);
      if (config.type !== "sqlite") {
        console.log("   Host:", config.host);
        console.log("   Database:", config.database);
      }

      if (sequelize) {
        db = sequelize;
        shouldClose = false; // Caller manages this connection
        console.log("   Using provided Sequelize instance (caller will close)");
      } else {
        // Create a new connection for migration
        db = DatabaseService.getClient('temp-migration', config);
        shouldClose = true;
        console.log("   Created new Sequelize instance for migration");
      }

      if (!db) {
        throw new Error("Failed to get database connection");
      }

      // Ensure models are initialized on this connection
      const { initializeAllModels } = await import('../database/models/relationships');
      initializeAllModels(db);

      console.log("   Syncing tables (alter: false, force: false)...");
      
      // For strict databases (PostgreSQL, MySQL, MSSQL), we need to handle the Customer table specially
      // because it references areas.code which is not unique alone (only unique with companyId)
      if (config.type === 'postgresql' || config.type === 'mysql' || config.type === 'mssql') {
        console.log("   Detected strict database, syncing with special handling for Customer table...");
        
        // Import models
        const { Customer } = await import('../database/models/Customer');
        const { Area } = await import('../database/models/Area');
        const { Company } = await import('../database/models/Company');
        const { User } = await import('../database/models/User');
        const { Product } = await import('../database/models/Product');
        const { Batch } = await import('../database/models/Batch');
        const { Vendor } = await import('../database/models/Vendor');
        const { Account } = await import('../database/models/Account');
        const { Purchase } = await import('../database/models/Purchase');
        const { PurchaseItem } = await import('../database/models/PurchaseItem');
        const { PurchasePayment } = await import('../database/models/PurchasePayment');
        const { Sale } = await import('../database/models/Sale');
        const { SaleItem } = await import('../database/models/SaleItem');
        const { SalePayment } = await import('../database/models/SalePayment');
        const { Transaction } = await import('../database/models/Transaction');
        const { ReportConfig } = await import('../database/models/ReportConfig');
        const { ImportExportTemplate } = await import('../database/models/ImportExportTemplate');
        
        // Sync tables in dependency order with individual error handling
        // This ensures one failure doesn't stop the entire process
        
        const syncTable = async (model: any, name: string) => {
          try {
            await model.sync({ alter: false, force: false });
            console.log(`   ✅ ${name} table synced`);
            return { success: true, name };
          } catch (error: any) {
            console.error(`   ❌ Failed to sync ${name} table:`, error.message);
            if (error?.parent?.message) {
              console.error(`   Database error:`, error.parent.message);
            }
            if (error.stack) {
              console.error(`   Stack:`, error.stack);
            }
            return { success: false, name, error: error.message };
          }
        };
        
        const results: Array<{ success: boolean; name: string; error?: string }> = [];
        
        // Sync base tables first
        results.push(await syncTable(Company, 'Companies'));
        results.push(await syncTable(Area, 'Areas'));
        results.push(await syncTable(User, 'Users'));
        results.push(await syncTable(Vendor, 'Vendors'));
        results.push(await syncTable(Account, 'Accounts'));
        results.push(await syncTable(Product, 'Products'));
        results.push(await syncTable(Batch, 'Batches'));
        
        // For Customer table, handle the foreign key constraint issue
        try {
          await Customer.sync({ alter: false, force: false });
          console.log("   ✅ Customers table synced");
          results.push({ success: true, name: 'Customers' });
        } catch (customerError: any) {
          // If it fails due to foreign key constraint, create table manually without the constraint
          if (customerError?.parent?.code === '42830' || customerError?.message?.includes('unique constraint') || customerError?.parent?.message?.includes('unique constraint')) {
            console.log("   ⚠️ Customer sync failed due to foreign key constraint, creating table manually...");
            const queryInterface = db.getQueryInterface();
            const DataTypes = (await import('sequelize')).DataTypes;
            
            try {
              const tableExists = await queryInterface.tableExists('customers');
              if (!tableExists) {
                // Create table using Sequelize DataTypes for compatibility
                await queryInterface.createTable('customers', {
                  id: {
                    type: DataTypes.UUID,
                    primaryKey: true,
                    defaultValue: DataTypes.UUIDV4,
                  },
                  name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                  },
                  email: {
                    type: DataTypes.STRING,
                    allowNull: true,
                  },
                  phone: {
                    type: DataTypes.STRING,
                    allowNull: true,
                  },
                  address: {
                    type: DataTypes.STRING,
                    allowNull: true,
                  },
                  areaCode: {
                    type: DataTypes.STRING,
                    allowNull: true,
                    // No foreign key constraint - areaCode references areas.code which is not unique alone
                    // The relationship is handled at application level with constraints: false
                  },
                  companyId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: {
                      model: 'companies',
                      key: 'id',
                    },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                  },
                  createdAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                  },
                  updatedAt: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW,
                  },
                });
                console.log("   ✅ Customers table created without areaCode foreign key constraint");
                results.push({ success: true, name: 'Customers' });
              } else {
                console.log("   ℹ️ Customers table already exists");
                results.push({ success: true, name: 'Customers' });
              }
            } catch (manualError: any) {
              console.error("   ❌ Failed to create Customers table manually:", manualError.message);
              results.push({ success: false, name: 'Customers', error: manualError.message });
            }
          } else {
            // Re-throw if it's a different error
            console.error("   ❌ Customer sync failed with unexpected error:", customerError.message);
            results.push({ success: false, name: 'Customers', error: customerError.message });
          }
        }
        
        // Sync remaining tables with error handling
        results.push(await syncTable(Purchase, 'Purchases'));
        results.push(await syncTable(PurchaseItem, 'PurchaseItems'));
        results.push(await syncTable(PurchasePayment, 'PurchasePayments'));
        results.push(await syncTable(Sale, 'Sales'));
        results.push(await syncTable(SaleItem, 'SaleItems'));
        results.push(await syncTable(SalePayment, 'SalePayments'));
        results.push(await syncTable(Transaction, 'Transactions'));
        results.push(await syncTable(ReportConfig, 'ReportConfigs'));
        results.push(await syncTable(ImportExportTemplate, 'ImportExportTemplates'));
        
        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        console.log(`\n   📊 Sync Summary: ${successful} tables synced successfully, ${failed} failed`);
        if (failed > 0) {
          console.log("   ❌ Failed tables:");
          results.filter(r => !r.success).forEach(r => {
            console.log(`      - ${r.name}: ${r.error}`);
          });
        }
      } else {
        // For SQLite, regular sync works fine (SQLite is more lenient with foreign keys)
        await db.sync({ alter: false, force: false });
      }

      console.log("✅ [DEBUG] DatabaseMigrationService.runMigrations - Tables synced successfully");

      // Run specific migrations based on schema version
      await this.runVersionSpecificMigrations(db, config);

      // Record schema version after successful migration
      await this.recordSchemaVersion(
        config,
        CURRENT_SCHEMA_VERSION,
        `Schema migrated to ${CURRENT_SCHEMA_VERSION} - Removed unitPrice from products table`,
        db
      );

      // Only disconnect if we created the connection ourselves
      if (shouldClose && db) {
        await DatabaseService.disconnect('temp-migration');
      }

      return { success: true };
    } catch (error) {
      // Only close if we created the connection
      if (shouldClose && db) {
        try {
          await DatabaseService.disconnect('temp-migration');
        } catch (closeError) {
          console.error('Error closing migration connection:', closeError);
        }
      }
      
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [DEBUG] DatabaseMigrationService.runMigrations - Migration failed:', errorMessage);
      console.error('   Full error:', error);
      if (error instanceof Error && error.stack) {
        console.error('   Stack trace:', error.stack);
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get the current schema version from the database
   * Returns null if schema_versions table doesn't exist or no version is recorded
   */
  static async getCurrentSchemaVersion(
    config: DatabaseConfig
  ): Promise<string | null> {
    try {
      const sequelize = DatabaseService.getClient('temp-version-check', config);
      
      // Check if schema_versions table exists
      try {
        await sequelize.getQueryInterface().describeTable('schema_versions');
      } catch (error) {
        // Table doesn't exist yet
        await DatabaseService.disconnect('temp-version-check');
        return null;
      }

      // Import SchemaVersion model
      const { SchemaVersion } = await import('../database/models/SchemaVersion');
      const { initializeSchemaVersion } = await import('../database/models/SchemaVersion');
      initializeSchemaVersion(sequelize);

      // Get the latest version (global, not company-specific)
      const latestVersion = await SchemaVersion.findOne({
        where: { companyId: null },
        order: [['appliedAt', 'DESC']],
      });

      await DatabaseService.disconnect('temp-version-check');
      
      return latestVersion ? latestVersion.version : null;
    } catch (error) {
      await DatabaseService.disconnect('temp-version-check').catch(() => {});
      console.error('Error getting schema version:', error);
      return null;
    }
  }

  /**
   * Check if database migration is needed
   * Returns true if current schema version is older than required version
   */
  static async isMigrationNeeded(
    config: DatabaseConfig
  ): Promise<{ needed: boolean; currentVersion?: string | null; requiredVersion: string }> {
    try {
      const currentVersion = await this.getCurrentSchemaVersion(config);
      const requiredVersion = CURRENT_SCHEMA_VERSION;

      // If no version recorded, migration is needed
      if (!currentVersion) {
        return { needed: true, currentVersion: null, requiredVersion };
      }

      // Compare versions (simple string comparison works for semantic versioning)
      const needsMigration = this.compareVersions(currentVersion, requiredVersion) < 0;

      return {
        needed: needsMigration,
        currentVersion,
        requiredVersion,
      };
    } catch (error) {
      console.error('Error checking migration status:', error);
      // If we can't check, assume migration is needed to be safe
      return { needed: true, requiredVersion: CURRENT_SCHEMA_VERSION };
    }
  }

  /**
   * Record schema version after successful migration
   */
  static async recordSchemaVersion(
    config: DatabaseConfig,
    version: string,
    description?: string,
    sequelize?: Sequelize
  ): Promise<{ success: boolean; error?: string }> {
    let db: Sequelize | null = null;
    let shouldClose = false;

    try {
      if (sequelize) {
        db = sequelize;
        shouldClose = false;
      } else {
        db = DatabaseService.getClient('temp-version-record', config);
        shouldClose = true;
      }

      // Import SchemaVersion model
      const { SchemaVersion } = await import('../database/models/SchemaVersion');
      const { initializeSchemaVersion } = await import('../database/models/SchemaVersion');
      initializeSchemaVersion(db);

      // Check if this version already exists
      const existing = await SchemaVersion.findOne({
        where: { version, companyId: null },
      });

      if (!existing) {
        await SchemaVersion.create({
          version,
          description: description || `Schema version ${version}`,
          appliedAt: new Date(),
          companyId: null, // Global schema version
        } as any);
        console.log(`✅ Recorded schema version: ${version}`);
      } else {
        console.log(`ℹ️ Schema version ${version} already recorded`);
      }

      if (shouldClose && db) {
        await DatabaseService.disconnect('temp-version-record');
      }

      return { success: true };
    } catch (error) {
      if (shouldClose && db) {
        await DatabaseService.disconnect('temp-version-record').catch(() => {});
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error recording schema version:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Run version-specific migrations
   * This handles schema changes that require data migration or column removal
   */
  private static async runVersionSpecificMigrations(
    sequelize: Sequelize,
    config: DatabaseConfig
  ): Promise<void> {
    try {
      const currentVersion = await this.getCurrentSchemaVersion(config);
      
      // Migration 1.1.0: Remove unitPrice column from products table
      if (!currentVersion || this.compareVersions(currentVersion, '1.1.0') < 0) {
        console.log("🔧 Running migration 1.1.0: Removing unitPrice column from products table...");
        
        const queryInterface = sequelize.getQueryInterface();
        
        // Check if products table exists and has unitPrice column
        try {
          const tableDescription = await queryInterface.describeTable('products');
          
          if (tableDescription.unitPrice) {
            // Remove the column
            // Note: For some databases, we need to handle this differently
            if (config.type === 'sqlite') {
              // SQLite doesn't support DROP COLUMN directly, need to recreate table
              console.log("   ⚠️ SQLite detected - unitPrice column will remain but won't be used");
              console.log("   ℹ️ For SQLite, consider using a database migration tool for column removal");
            } else {
              // For PostgreSQL, MySQL, MSSQL - can drop column directly
              try {
                await queryInterface.removeColumn('products', 'unitPrice');
                console.log("   ✅ Removed unitPrice column from products table");
              } catch (error: any) {
                // Column might not exist or already removed
                if (error.message?.includes('does not exist') || error.message?.includes('Unknown column')) {
                  console.log("   ℹ️ unitPrice column does not exist (already removed)");
                } else {
                  console.error("   ⚠️ Could not remove unitPrice column:", error.message);
                  // Don't fail the migration - column will just be unused
                }
              }
            }
          } else {
            console.log("   ℹ️ unitPrice column does not exist (already removed)");
          }
        } catch (error: any) {
          // Table might not exist yet (new database)
          if (error.message?.includes('does not exist') || error.message?.includes('Unknown table')) {
            console.log("   ℹ️ Products table does not exist yet (will be created without unitPrice)");
          } else {
            console.error("   ⚠️ Error checking products table:", error.message);
          }
        }
      }
    } catch (error) {
      console.error("⚠️ Error running version-specific migrations:", error);
      // Don't throw - allow migration to continue
    }
  }

  /**
   * Simple version comparison
   * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  private static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }
}
