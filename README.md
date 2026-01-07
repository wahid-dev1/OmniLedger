# OmniLedger

Desktop Inventory & Accounting System built with Electron, React, TypeScript, and Prisma.

## Features

- **Multi-Tenancy**: Support for multiple companies with data isolation
- **Inventory Management**: Product tracking with batch numbers and expiry dates
- **Sales & Returns**: Point of Sale with batch tracking and return management
- **Financial Accounting**: Double-entry ledger system with configurable chart of accounts
- **Excel Import/Export**: Bulk data import/export with template support
- **Flexible Database**: Support for SQLite, PostgreSQL, MySQL, and MSSQL (configurable per user)
- **Role-Based Access Control**: Admin, Manager, and Cashier roles

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Desktop**: Electron
- **Backend**: Node.js + TypeScript
- **Database**: Prisma ORM (supports SQLite, PostgreSQL, MySQL, MSSQL)
- **State Management**: Zustand
- **Excel Processing**: exceljs

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Initialize Prisma:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── main/           # Electron main process
├── preload/        # Electron preload scripts
├── renderer/       # React application
│   ├── components/ # React components
│   ├── lib/        # Utilities
│   └── stores/     # Zustand stores
├── services/       # Business logic services (API-first design)
└── shared/         # Shared types and utilities
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## License

MIT

