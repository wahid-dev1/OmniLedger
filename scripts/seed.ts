/**
 * Sequelize Seed Script
 * This file is used to seed the database with dummy data
 * Run with: npm run seed
 */

import { SequelizeConfig } from "../src/database/sequelize.config";
import { initializeAllModels } from "../src/database/models/relationships";
import { SeedService } from "../src/services/seed.service";
import { Company } from "../src/database/models/Company";

async function main() {
  console.log("Starting seed process...");

  // Create a dummy config for seeding, assuming SQLite for simplicity
  const seedConfig = {
    type: "sqlite" as const,
    connectionString: "./data/omniledger.db",
  };

  const sequelize = SequelizeConfig.createSequelize(seedConfig);
  initializeAllModels(sequelize); // Initialize models with the sequelize instance

  try {
    await sequelize.authenticate();
    console.log('Database connection for seeding has been established successfully.');

    // Sync database schema (create tables if they don't exist)
    console.log('Syncing database schema...');
    await sequelize.sync({ alter: false, force: false });
    console.log('Database schema synchronized.');

    // Check if data already exists using Sequelize
    const existingCompany = await Company.findOne();
    if (existingCompany) {
      console.log("⚠️  Database already contains data.");
      console.log("   Clearing existing data...");
      await SeedService.clearDatabase(sequelize);
    }

    // Seed the database
    await SeedService.seedDatabase(sequelize);
    
    console.log("\n✅ Seed process completed successfully!");
  } catch (error) {
    console.error("Error during seeding process:", error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  });

