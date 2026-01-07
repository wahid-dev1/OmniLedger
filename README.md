# OmniLedger

Desktop Inventory & Accounting System built with Electron, React, TypeScript, and Sequelize.

## Features

- **Multi-Tenancy**: Support for multiple companies with data isolation
- **Inventory Management**: Product tracking with batch numbers and expiry dates
- **Sales & Returns**: Point of Sale with batch tracking and return management
- **Financial Accounting**: Double-entry ledger system with configurable chart of accounts
- **Customer & Supplier Management**: Full CRM/SRM with area-based categorization
- **Purchase Management**: Purchase orders with batch tracking
- **HR & Payroll**: Employee management and payroll processing
- **Excel Import/Export**: Bulk data import/export with template support
- **Runtime Database Configuration**: Per-user database configuration (SQLite, PostgreSQL, MySQL, MSSQL)
- **Role-Based Access Control**: Admin, Manager, and Cashier roles
- **Custom Reporting**: Dynamic query builder for custom reports

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Desktop**: Electron
- **Backend**: Node.js + TypeScript
- **Database**: Sequelize ORM (supports SQLite, PostgreSQL, MySQL, MSSQL)
- **State Management**: Zustand
- **Excel Processing**: exceljs
- **PDF Generation**: jspdf + jspdf-autotable

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- (Optional) PostgreSQL, MySQL, or MSSQL server if not using SQLite

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd PrimeStock
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

   This will:
   - Build the Electron main process
   - Start Vite dev server on http://localhost:5173
   - Launch Electron window automatically

4. **Database Configuration**: 
   - On first launch, configure your database through the application UI
   - Each user can configure their own database (SQLite, PostgreSQL, MySQL, or MSSQL)
   - Database configuration is stored securely and encrypted per user
   - See [Runtime Database Setup Documentation](./docs/RUNTIME_DATABASE_SETUP.md) for details

## Database Setup

OmniLedger uses **runtime database configuration**, meaning you configure your database connection through the application UI rather than environment variables.

### Supported Databases

- **SQLite** (Default): File-based, no server required - best for local installations
- **PostgreSQL**: Full-featured, production-ready - best for multi-user scenarios
- **MySQL**: Popular open-source database with good performance
- **MSSQL**: Microsoft SQL Server with enterprise features

### Initial Setup

1. On first launch, you'll be prompted to configure your database
2. Choose your database type (SQLite recommended for development)
3. Enter connection details (host, port, credentials for remote databases)
4. The system will automatically:
   - Test the connection
   - Create the database schema if needed
   - Initialize default data

For detailed database setup instructions, see:
- [Runtime Database Setup](./docs/RUNTIME_DATABASE_SETUP.md)
- [Using Database Configuration](./docs/USING_DATABASE_CONFIG.md)

## Project Structure

```
src/
├── main/              # Electron main process
│   └── main.ts        # Main Electron entry point
├── preload/           # Electron preload scripts
│   └── preload.ts     # Secure IPC bridge
├── renderer/          # React application (frontend)
│   ├── components/    # React components (shadcn/ui based)
│   ├── lib/           # Utilities and helpers
│   ├── stores/        # Zustand state management
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Frontend utilities
│   ├── App.tsx        # Main React component
│   └── main.tsx       # React entry point
├── database/          # Database layer
│   ├── models/        # Sequelize models
│   ├── sequelize.config.ts  # Database connection config
│   └── index.ts       # Database initialization
├── services/          # Business logic services (API-first design)
│   ├── database.service.ts
│   ├── database-migration.service.ts
│   ├── company.service.ts
│   └── seed.service.ts
└── shared/            # Shared code between main and renderer
    ├── types/         # TypeScript type definitions
    └── utils/         # Shared utilities

dist-electron/         # Compiled Electron code (generated)
data/                  # Default SQLite database location
docs/                  # Documentation files
```

## Available Scripts

### Development
- `npm run dev` - Start development server (Vite + Electron)
- `npm run dev:vite` - Start only Vite dev server
- `npm run dev:electron` - Start only Electron (after Vite is ready)

### Building
- `npm run build` - Build for production (both Vite and Electron)
- `npm run build:vite` - Build only React/Vite frontend
- `npm run build:electron` - Build only Electron main process
- `npm run build:win` - Build Windows installer (.exe)
- `npm run build:win:dir` - Build Windows app directory (no installer)
- `npm run build:mac` - Build macOS application
- `npm run build:mac:dmg` - Build macOS disk image (.dmg)

### Database & Seeding
- `npm run seed` - Seed database with sample data
- `npm run seed:database` - Alternative seeding script

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Database Schema

The application includes comprehensive database models:

### Core Entities
- **Company** - Multi-tenancy support with data isolation
- **User** - User accounts with per-user database configuration
- **Product** - Product catalog with SKU, pricing, categories
- **Batch** - Batch tracking with expiry/manufacturing dates
- **Area** - Geographic area lookup table

### Sales & Purchases
- **Sale** / **SaleItem** - Sales transactions with batch tracking
- **SalePayment** - Payment processing for sales
- **Purchase** / **PurchaseItem** - Purchase orders with batch tracking
- **PurchasePayment** - Payment processing for purchases

### Partners
- **Customer** - Customer master (C Card) with area linking
- **Vendor** - Supplier master (S Card)
- Customer and Supplier ledgers for financial tracking

### Financials
- **Account** - Chart of accounts (hierarchical structure)
- **Transaction** - Double-entry ledger transactions
- Customer/Supplier ledgers with balance tracking

### HR & Payroll
- Employee master with personal information
- Employee salary tracking with commission and allowances

### System
- **ReportConfig** - Custom report configurations
- **ImportExportTemplate** - Excel import/export templates
- **SchemaVersion** - Database schema version tracking

## Documentation

Additional documentation is available in the `docs/` directory:

- [Runtime Database Setup](./docs/RUNTIME_DATABASE_SETUP.md) - Configure databases at runtime
- [Using Database Configuration](./docs/USING_DATABASE_CONFIG.md) - How to use database config features
- [Database Seeding](./docs/DATABASE_SEEDING.md) - Seed database with sample data
- [Database Config Improvements](./docs/DATABASE_CONFIG_IMPROVEMENTS.md) - Recent improvements
- [Phase 2 Implementation](./docs/PHASE2_IMPLEMENTATION.md) - Implementation roadmap

## Architecture

### API-First Design
The application is architected with a clear separation between UI and business logic:
- All business logic resides in the `services/` directory
- Services are designed to be easily migrated to REST APIs in a future SaaS version
- State management uses Zustand for predictable state updates

### Multi-Database Support
- Each user can configure their own database connection
- Database credentials are encrypted and stored securely
- Runtime connection switching without application restart
- Automatic schema initialization and migration

### Batch Tracking
- Every product entry supports batch numbers
- Sales and purchases track specific batches
- Returns require batch identification for accurate auditing
- FIFO or manual batch selection on sales

### Future SaaS Readiness
The codebase includes placeholders and comments for cloud migration:
- File path operations marked for cloud storage migration
- Service layer designed for easy REST API conversion
- State management ready for server synchronization

## Contributing

1. Follow the existing code style (TypeScript, ESLint, Prettier)
2. Use shadcn/ui components for UI elements
3. Add services in the `services/` directory for business logic
4. Update documentation for significant changes

## License

MIT
