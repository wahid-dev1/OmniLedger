# 📊 OmniLedger

<div align="center">

**A comprehensive Desktop Inventory & Accounting System for modern businesses**

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/wahid-dev1/omniledger)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-28+-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)

[Features](#-features) • [Quick Start](#-getting-started) • [Documentation](#-documentation) • [Contributing](#-contributing) • [Report Bug](https://github.com/wahid-dev1/omniledger/issues)

</div>

---

> **OmniLedger** is a powerful desktop application for inventory management, sales tracking, financial accounting, and business operations. Built with modern technologies and designed for scalability, it supports multiple companies, batch tracking, double-entry bookkeeping, and seamless Excel integration.

## ✨ Features

### 🏢 Enterprise Capabilities
- **Multi-Tenancy**: Support for multiple companies with complete data isolation
- **Runtime Database Configuration**: Per-user database setup (SQLite, PostgreSQL, MySQL, MSSQL)
- **Role-Based Access Control**: Admin, Manager, and Cashier roles with secure permissions
- **API-First Architecture**: Designed for easy migration to SaaS/web deployment

### 📦 Inventory & Sales
- **Advanced Inventory Management**: Product tracking with SKU, pricing, and categories
- **Batch Tracking**: Comprehensive batch number tracking with expiry/manufacturing dates
- **Point of Sale (POS)**: Streamlined sales interface with batch deduction (FIFO or manual)
- **Sales Returns**: Intelligent return management with batch identification for auditing
- **Purchase Orders**: Complete purchase management with batch tracking

### 💰 Financial Management
- **Double-Entry Accounting**: Full double-entry ledger system with audit trail
- **Chart of Accounts**: Configurable hierarchical account structure
- **Customer & Supplier Ledgers**: Individual ledger tracking with balance management
- **Cashbook**: Direct cash payment/receipt tracking

### 👥 Business Operations
- **Customer Management (C Card)**: Complete CRM with customer codes, addresses, area tracking
- **Supplier Management (S Card)**: Full supplier relationship management
- **HR & Payroll**: Employee management with salary, commission, and allowance tracking
- **Area-Based Categorization**: Geographic area lookup and reporting

### 📊 Data & Reporting
- **Excel Import/Export**: Bulk data operations with template support and validation
- **Custom Reporting Engine**: Dynamic query builder for personalized reports
- **PDF Generation**: Professional PDF reports with automatic table formatting
- **Data Validation**: Comprehensive validation during import with detailed error reports

### 🚀 Technical Excellence
- **Modern UI**: Built with React, TypeScript, Tailwind CSS, and shadcn/ui components
- **Cross-Platform**: Windows, macOS, and Linux support
- **Type-Safe**: Full TypeScript coverage for reliability
- **Scalable Architecture**: Service-based design ready for cloud migration

---

## 🎯 Use Cases

OmniLedger is perfect for:

- 🏪 **Retail Businesses**: Track inventory with batch numbers, manage POS, and handle returns
- 🏭 **Manufacturing**: Monitor batch production, expiry dates, and stock movements
- 📊 **Accounting Firms**: Multi-company financial management with double-entry bookkeeping
- 🏢 **Multi-Location Businesses**: Manage inventory and sales across different locations/companies
- 💼 **Small to Medium Enterprises**: Complete business management solution in one desktop app

---

## 📸 Screenshots

> 💡 *Screenshots coming soon! Add your application screenshots here to showcase the interface.*

<!-- 
Add screenshots like this:
![Dashboard](./docs/screenshots/dashboard.png)
![Inventory](./docs/screenshots/inventory.png)
![Sales](./docs/screenshots/sales.png)
-->

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher (comes with Node.js)
- **Git** (for cloning the repository)
- *(Optional)* PostgreSQL, MySQL, or MSSQL server if not using SQLite

### Quick Installation

Get OmniLedger up and running in minutes:

```bash
# 1. Clone the repository
git clone https://github.com/wahid-dev1/omniledger.git
cd PrimeStock

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

That's it! The application will:
- ✅ Build the Electron main process
- ✅ Start the Vite development server on `http://localhost:5173`
- ✅ Launch the Electron window automatically

### 🗄️ Database Configuration

On first launch, you'll be prompted to configure your database:

1. **Choose Database Type**: Select SQLite (recommended for development), PostgreSQL, MySQL, or MSSQL
2. **Enter Connection Details**: For remote databases, provide host, port, username, and password
3. **Automatic Setup**: The system will:
   - Test your connection
   - Create the database schema automatically
   - Initialize default data

📖 **Learn More**: See [Runtime Database Setup Guide](./docs/RUNTIME_DATABASE_SETUP.md) for detailed instructions.

> 💡 **Tip**: SQLite is perfect for getting started - no server setup required! Switch to PostgreSQL or MySQL for production or multi-user scenarios.

---

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Desktop**: Electron
- **Backend**: Node.js + TypeScript
- **Database**: Sequelize ORM (supports SQLite, PostgreSQL, MySQL, MSSQL)
- **State Management**: Zustand
- **Excel Processing**: exceljs
- **PDF Generation**: jspdf + jspdf-autotable

---

## 🗄️ Database Setup

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

## 📜 Available Scripts

### Development
```bash
npm run dev           # Start development server (Vite + Electron)
npm run dev:vite      # Start only Vite dev server
npm run dev:electron  # Start only Electron (after Vite is ready)
```

### Building for Production
```bash
npm run build         # Build for production (both Vite and Electron)
npm run build:vite    # Build only React/Vite frontend
npm run build:electron # Build only Electron main process

# Platform-specific builds
npm run build:win     # Build Windows installer (.exe)
npm run build:win:dir # Build Windows app directory (no installer)
npm run build:mac     # Build macOS application
npm run build:mac:dmg # Build macOS disk image (.dmg)
```

### Database & Seeding
```bash
npm run seed          # Seed database with sample data
npm run seed:database # Alternative seeding script
```

### Code Quality
```bash
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
```

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

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

### Setup & Configuration
- 📖 [Runtime Database Setup](./docs/RUNTIME_DATABASE_SETUP.md) - Configure databases at runtime
- 📖 [Using Database Configuration](./docs/USING_DATABASE_CONFIG.md) - How to use database config features
- 📖 [Database Seeding](./docs/DATABASE_SEEDING.md) - Seed database with sample data

### Development & Architecture
- 📖 [Database Config Improvements](./docs/DATABASE_CONFIG_IMPROVEMENTS.md) - Recent improvements
- 📖 [Phase 2 Implementation](./docs/PHASE2_IMPLEMENTATION.md) - Implementation roadmap

> 💡 **Tip**: Start with the [Runtime Database Setup](./docs/RUNTIME_DATABASE_SETUP.md) guide to get your database configured quickly!

## 🏗️ Architecture

### API-First Design
The application is architected with a clear separation between UI and business logic:
- ✅ All business logic resides in the `services/` directory
- ✅ Services are designed to be easily migrated to REST APIs in a future SaaS version
- ✅ State management uses Zustand for predictable state updates
- ✅ Clean separation allows for easy testing and maintenance

### Multi-Database Support
- 🔄 Each user can configure their own database connection
- 🔒 Database credentials are encrypted and stored securely
- ⚡ Runtime connection switching without application restart
- 🚀 Automatic schema initialization and migration
- 🌐 Supports SQLite, PostgreSQL, MySQL, and MSSQL

### Batch Tracking System
- 📦 Every product entry supports batch numbers
- 🔍 Sales and purchases track specific batches
- 🔄 Returns require batch identification for accurate auditing
- 📊 FIFO or manual batch selection on sales
- ⏰ Expiry and manufacturing date tracking per batch

### Future SaaS Readiness
The codebase is designed with cloud migration in mind:
- ☁️ File path operations marked for cloud storage migration
- 🌐 Service layer designed for easy REST API conversion
- 🔄 State management ready for server synchronization
- 📡 API-first architecture allows seamless transition to web service

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository** and create your branch from `main`
2. **Follow coding standards**: TypeScript, ESLint, Prettier
3. **Use shadcn/ui components** for UI elements
4. **Add services** in the `services/` directory for business logic
5. **Update documentation** for significant changes
6. **Write clear commit messages** following conventional commits

### Development Guidelines

- Follow the existing code style and architecture patterns
- Write tests for new features and bug fixes
- Ensure TypeScript types are properly defined
- Update relevant documentation
- Test across different database types when applicable

See our [Contributing Guide](./CONTRIBUTING.md) for more details.

---

## ❓ Support & Questions

- 🐛 **Found a bug?** [Open an issue](https://github.com/wahid-dev1/omniledger/issues)
- 💡 **Have a feature request?** [Submit a feature request](https://github.com/wahid-dev1/omniledger/issues)
- 📖 **Need help?** Check the [Documentation](./docs/) or open a discussion

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [Wahid](https://github.com/wahid-dev1)**

[⭐ Star us on GitHub](https://github.com/wahid-dev1/omniledger) • [🐛 Report Bug](https://github.com/wahid-dev1/omniledger/issues) • [💡 Request Feature](https://github.com/wahid-dev1/omniledger/issues)

</div>
