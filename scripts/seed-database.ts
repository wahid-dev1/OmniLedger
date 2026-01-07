/**
 * Standalone Database Seeding Script
 * This script can be run after build to seed any database with default company data
 * 
 * Usage:
 *   npm run seed:database -- --type sqlite --connectionString ./data/omniledger.db
 *   npm run seed:database -- --type postgresql --host localhost --port 5432 --database omniledger --username user --password pass
 *   npm run seed:database -- --type mysql --host localhost --port 3306 --database omniledger --username user --password pass
 *   npm run seed:database -- --type mssql --host localhost --port 1433 --database omniledger --username user --password pass
 * 
 * Options:
 *   --type: Database type (sqlite, postgresql, mysql, mssql)
 *   --connectionString: For SQLite, path to database file
 *   --host: Database host (for remote databases)
 *   --port: Database port (for remote databases)
 *   --database: Database name (for remote databases)
 *   --username: Database username (for remote databases)
 *   --password: Database password (for remote databases)
 *   --clear: Clear existing data before seeding (optional, default: false)
 */

import { SequelizeConfig } from "../src/database/sequelize.config";
import { initializeAllModels } from "../src/database/models/relationships";
import { SeedService } from "../src/services/seed.service";
import { DatabaseMigrationService } from "../src/services/database-migration.service";
import type { DatabaseConfig } from "../src/shared/types";
import { Company } from "../src/database/models/Company";

// Parse command line arguments
function parseArgs(): { config: DatabaseConfig; clearExisting: boolean } {
  const args = process.argv.slice(2);
  const config: DatabaseConfig = {
    type: "sqlite",
  };
  let clearExisting = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--type":
        if (nextArg && ["sqlite", "postgresql", "mysql", "mssql"].includes(nextArg)) {
          config.type = nextArg as DatabaseConfig["type"];
          i++;
        } else {
          throw new Error("Invalid database type. Must be: sqlite, postgresql, mysql, or mssql");
        }
        break;
      case "--connectionString":
        if (nextArg) {
          config.connectionString = nextArg;
          i++;
        } else {
          throw new Error("--connectionString requires a value");
        }
        break;
      case "--host":
        if (nextArg) {
          config.host = nextArg;
          i++;
        } else {
          throw new Error("--host requires a value");
        }
        break;
      case "--port":
        if (nextArg) {
          config.port = parseInt(nextArg, 10);
          if (isNaN(config.port)) {
            throw new Error("--port must be a number");
          }
          i++;
        } else {
          throw new Error("--port requires a value");
        }
        break;
      case "--database":
        if (nextArg) {
          config.database = nextArg;
          i++;
        } else {
          throw new Error("--database requires a value");
        }
        break;
      case "--username":
        if (nextArg) {
          config.username = nextArg;
          i++;
        } else {
          throw new Error("--username requires a value");
        }
        break;
      case "--password":
        if (nextArg) {
          config.password = nextArg;
          i++;
        } else {
          throw new Error("--password requires a value");
        }
        break;
      case "--clear":
        clearExisting = true;
        break;
      case "--help":
      case "-h":
        console.log(`
Standalone Database Seeding Script

Usage:
  npm run seed:database -- [options]

Options:
  --type <type>              Database type: sqlite, postgresql, mysql, mssql (required)
  --connectionString <path>  For SQLite: path to database file (required for SQLite)
  --host <host>             Database host (required for remote databases)
  --port <port>             Database port (required for remote databases)
  --database <name>         Database name (required for remote databases)
  --username <user>         Database username (required for remote databases)
  --password <pass>         Database password (required for remote databases)
  --clear                   Clear existing data before seeding (optional)
  --help, -h                Show this help message

Examples:
  # SQLite
  npm run seed:database -- --type sqlite --connectionString ./data/omniledger.db

  # PostgreSQL
  npm run seed:database -- --type postgresql --host localhost --port 5432 --database omniledger --username user --password pass

  # MySQL
  npm run seed:database -- --type mysql --host localhost --port 3306 --database omniledger --username user --password pass

  # SQL Server
  npm run seed:database -- --type mssql --host localhost --port 1433 --database omniledger --username user --password pass

  # Clear existing data before seeding
  npm run seed:database -- --type sqlite --connectionString ./data/omniledger.db --clear
        `);
        process.exit(0);
        break;
    }
  }

  // Validate required fields based on database type
  if (config.type === "sqlite") {
    if (!config.connectionString) {
      throw new Error("--connectionString is required for SQLite");
    }
  } else {
    if (!config.host || !config.port || !config.database || !config.username || !config.password) {
      throw new Error(
        `For ${config.type}, the following are required: --host, --port, --database, --username, --password`
      );
    }
  }

  return { config, clearExisting };
}

async function main() {
  try {
    console.log("🌱 Starting database seed process...\n");

    // Parse command line arguments
    const { config, clearExisting } = parseArgs();

    console.log("📋 Database Configuration:");
    console.log(`   Type: ${config.type}`);
    if (config.type === "sqlite") {
      console.log(`   Connection String: ${config.connectionString}`);
    } else {
      console.log(`   Host: ${config.host}`);
      console.log(`   Port: ${config.port}`);
      console.log(`   Database: ${config.database}`);
      console.log(`   Username: ${config.username}`);
    }
    console.log(`   Clear Existing: ${clearExisting ? "Yes" : "No"}\n`);

    // Create Sequelize instance
    const sequelize = SequelizeConfig.createSequelize(config);
    initializeAllModels(sequelize);

    // Configure SQLite if needed
    if (config.type === "sqlite") {
      await SequelizeConfig.configureSQLite(sequelize);
    }

    // Test connection
    console.log("🔌 Testing database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully\n");

    // Check if schema is initialized
    console.log("📋 Checking database schema...");
    const isInitialized = await DatabaseMigrationService.isSchemaInitialized(config);
    
    if (!isInitialized) {
      console.log("⚠️  Database schema not initialized. Running migrations...");
      const migrationResult = await DatabaseMigrationService.runMigrations(config);
      if (!migrationResult.success) {
        throw new Error(`Failed to run migrations: ${migrationResult.error}`);
      }
      console.log("✅ Database schema initialized\n");
    } else {
      console.log("✅ Database schema is already initialized\n");
    }

    // Sync database schema (ensure all tables exist)
    console.log("📋 Syncing database schema...");
    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database schema synchronized\n");

    // Check if data already exists
    const existingCompany = await Company.findOne();
    
    if (existingCompany && clearExisting) {
      console.log("⚠️  Database contains existing data. Clearing...");
      await SeedService.clearDatabase(sequelize);
      console.log("✅ Existing data cleared\n");
    } else if (existingCompany && !clearExisting) {
      console.log("⚠️  Database already contains data.");
      console.log("   Use --clear flag to overwrite existing data.");
      console.log("   Exiting without seeding.\n");
      await sequelize.close();
      process.exit(1);
    }

    // Seed the database
    console.log("🌱 Seeding database with default company data...\n");
    await SeedService.seedDatabase(sequelize);

    // Close the connection
    await sequelize.close();

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log("   ✅ Company created: Acme Retail Store");
    console.log("   ✅ Users created: 3 (admin, manager, cashier)");
    console.log("   ✅ Products, batches, customers, vendors, and accounts created");
    console.log("   ✅ Sample sales and purchases created");
    console.log("\n✨ You can now use the application with the seeded data.");
  } catch (error) {
    console.error("\n❌ Error during seeding process:");
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the script
main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });



