# Runtime Database Configuration

## Overview

OmniLedger supports **runtime database configuration**, meaning users can configure their database connection through the application UI rather than using environment variables. Each user can have their own database configuration (SQLite, PostgreSQL, MySQL, or MSSQL).

## How It Works

### 1. Database Configuration Storage

- Database configuration is stored in the `User` table in the database
- Each user has fields: `dbType`, `dbHost`, `dbPort`, `dbDatabase`, `dbUsername`, `dbPassword`, `dbConnectionString`
- Passwords are encrypted before storage

### 2. Runtime Connection

The `DatabaseService` creates Prisma clients dynamically based on user configuration:

```typescript
import { DatabaseService } from "@services/database.service";

const config: DatabaseConfig = {
  type: "postgresql",
  host: "localhost",
  port: 5432,
  database: "omniledger",
  username: "user",
  password: "password"
};

const client = DatabaseService.getClient(userId, config);
```

### 3. Database Initialization

When a user first connects to their database:

1. **Test Connection**: Verify the database is accessible
2. **Check Schema**: Verify tables exist
3. **Run Migrations**: If needed, run Prisma migrations

```typescript
import { DatabaseMigrationService } from "@services/database-migration.service";

// Check if schema is initialized
const isInitialized = await DatabaseMigrationService.isSchemaInitialized(config);

if (!isInitialized) {
  // Run migrations
  await DatabaseMigrationService.runMigrations(config);
}
```

## Supported Databases

### SQLite (Default)
- File-based database
- No server required
- Best for single-user local installations

### PostgreSQL
- Full-featured relational database
- Best for production multi-user scenarios
- Requires PostgreSQL server

### MySQL
- Popular open-source database
- Good performance and compatibility
- Requires MySQL server

### MSSQL (SQL Server)
- Microsoft SQL Server
- Enterprise-grade features
- Requires SQL Server instance

## Environment Variables

The `.env` file's `DATABASE_URL` is **only used for**:
- Prisma schema generation (`prisma generate`)
- Development/testing with a default SQLite database
- Prisma Studio connection

**It is NOT used for runtime connections** - those are configured per-user in the application.

## Migration Strategy

### Initial Setup
1. User configures their database connection in the UI
2. System tests the connection
3. System checks if schema exists
4. If not, runs migrations to create tables
5. User can then use the application

### Schema Updates
- When the Prisma schema is updated, migrations need to be run
- Users can trigger migrations through the UI
- Or migrations can be run automatically on connection

## Security Considerations

1. **Password Encryption**: Database passwords are encrypted before storage
2. **Connection Isolation**: Each user's connection is isolated
3. **No Hardcoded Credentials**: No database credentials in code or .env files
4. **Secure Storage**: User database configs stored securely

## Example: User Database Setup Flow

1. User opens application for first time
2. User sees "Database Configuration" screen
3. User selects database type (SQLite/PostgreSQL/MySQL/MSSQL)
4. User enters connection details
5. System tests connection
6. System initializes database (runs migrations if needed)
7. User can now use the application

## API Usage

```typescript
// Get database client for a user
const client = DatabaseService.getClient(userId, userDatabaseConfig);

// Use the client
const companies = await client.company.findMany({
  where: { /* ... */ }
});

// Disconnect when done
await DatabaseService.disconnect(userId);
```

## Notes

- Prisma Client is generated once and works with all database providers
- The schema must be compatible across all providers (avoiding provider-specific features)
- Connection pooling is handled per user
- Migrations are run per-database, not globally

