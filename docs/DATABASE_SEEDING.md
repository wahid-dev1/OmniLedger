# Database Seeding Guide

This guide explains how to seed databases with default company data in OmniLedger.

## Overview

OmniLedger provides two ways to seed databases with default company data:

1. **Standalone Script** - Run from command line (useful after build)
2. **IPC Handler** - Call from the application UI (useful for runtime seeding)

## Method 1: Standalone Script (After Build)

The standalone script can be run after building the application to seed any database with default company data.

### Usage

```bash
npm run seed:database -- [options]
```

### Options

- `--type <type>` - Database type: `sqlite`, `postgresql`, `mysql`, or `mssql` (required)
- `--connectionString <path>` - For SQLite: path to database file (required for SQLite)
- `--host <host>` - Database host (required for remote databases)
- `--port <port>` - Database port (required for remote databases)
- `--database <name>` - Database name (required for remote databases)
- `--username <user>` - Database username (required for remote databases)
- `--password <pass>` - Database password (required for remote databases)
- `--clear` - Clear existing data before seeding (optional, default: false)
- `--help, -h` - Show help message

### Examples

#### SQLite Database

```bash
# Seed a SQLite database
npm run seed:database -- --type sqlite --connectionString ./data/omniledger.db

# Clear existing data and seed
npm run seed:database -- --type sqlite --connectionString ./data/omniledger.db --clear
```

#### PostgreSQL Database

```bash
npm run seed:database -- \
  --type postgresql \
  --host localhost \
  --port 5432 \
  --database omniledger \
  --username postgres \
  --password mypassword
```

#### MySQL Database

```bash
npm run seed:database -- \
  --type mysql \
  --host localhost \
  --port 3306 \
  --database omniledger \
  --username root \
  --password mypassword
```

#### SQL Server (MSSQL)

```bash
npm run seed:database -- \
  --type mssql \
  --host localhost \
  --port 1433 \
  --database omniledger \
  --username sa \
  --password mypassword
```

### What Gets Seeded

The seed script creates:

- **1 Company**: "Acme Retail Store"
- **3 Users**: admin, manager, and cashier
- **8 Products**: Various products with different categories
- **Multiple Batches**: 1-3 batches per product with manufacturing and expiry dates
- **4 Areas**: Downtown, Uptown, Suburbs, Industrial Zone
- **4 Customers**: Sample customers linked to areas
- **2 Vendors**: Sample suppliers
- **Chart of Accounts**: Complete chart of accounts (Assets, Liabilities, Equity, Income, Expenses)
- **Sample Sales**: 5 sample sales with transactions
- **Sample Purchases**: 3 sample purchases with transactions

### Process Flow

1. **Connection Test**: Verifies database connection
2. **Schema Check**: Checks if database schema is initialized
3. **Migration**: Runs migrations if schema is not initialized
4. **Schema Sync**: Ensures all tables exist
5. **Data Check**: Checks if data already exists
6. **Clear (Optional)**: Clears existing data if `--clear` flag is set
7. **Seeding**: Populates database with default company data

## Method 2: IPC Handler (From Application UI)

The seed functionality is also available via IPC handler, which can be called from the renderer process.

### Usage in Renderer

```typescript
// In your React component or service
const result = await window.electronAPI.seedDatabase(
  {
    type: "sqlite",
    connectionString: "./data/omniledger.db"
  },
  false // clearExisting: optional, default false
);

if (result.success) {
  console.log("Database seeded successfully!");
} else {
  console.error("Error:", result.error);
}
```

### Example: Seeding PostgreSQL from UI

```typescript
const config = {
  type: "postgresql" as const,
  host: "localhost",
  port: 5432,
  database: "omniledger",
  username: "postgres",
  password: "mypassword"
};

const result = await window.electronAPI.seedDatabase(config, true); // Clear existing data
```

## Important Notes

1. **Data Safety**: By default, the seed script will **not** overwrite existing data. Use the `--clear` flag to clear existing data before seeding.

2. **Schema Initialization**: The script automatically checks and initializes the database schema if needed. It will run migrations if the schema is not initialized.

3. **Connection**: Make sure the database is accessible and credentials are correct before running the seed script.

4. **Multi-Company**: The seed script creates one default company. You can create additional companies through the application UI.

5. **Production Use**: The seeded data is intended for development and testing. For production, you should create your own company and data through the application.

## Troubleshooting

### Error: "Database already contains data"

**Solution**: Use the `--clear` flag to clear existing data before seeding:
```bash
npm run seed:database -- --type sqlite --connectionString ./data/omniledger.db --clear
```

### Error: "Database schema not initialized"

**Solution**: The script should automatically initialize the schema. If it fails, check:
- Database connection credentials
- Database server is running (for remote databases)
- User has CREATE TABLE permissions

### Error: "Connection refused" or "Cannot connect"

**Solution**: 
- Verify database server is running
- Check host, port, and credentials
- Ensure firewall allows connections (for remote databases)

### Error: "Invalid database type"

**Solution**: Use one of the supported types: `sqlite`, `postgresql`, `mysql`, or `mssql`

## Integration with Build Process

After building the application, you can seed databases as part of your deployment process:

```bash
# Build the application
npm run build

# Seed the production database
npm run seed:database -- \
  --type postgresql \
  --host production-db.example.com \
  --port 5432 \
  --database omniledger_prod \
  --username prod_user \
  --password prod_password
```

## Security Considerations

1. **Passwords**: Never commit database passwords to version control. Use environment variables or secure configuration management.

2. **Production**: Always use strong passwords and secure connections for production databases.

3. **Permissions**: Ensure database users have appropriate permissions (CREATE, INSERT, UPDATE, DELETE) but follow the principle of least privilege.



