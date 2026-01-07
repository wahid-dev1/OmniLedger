# Project Setup Guide

## Initial Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
# For SQLite (default)
DATABASE_URL="file:./data/omniledger.db"

# Or for other databases:
# DATABASE_URL="postgresql://user:password@localhost:5432/omniledger?schema=public"
# DATABASE_URL="mysql://user:password@localhost:3306/omniledger"
# DATABASE_URL="sqlserver://localhost:1433;database=omniledger;user=sa;password=YourPassword;encrypt=true"

NODE_ENV=development
```

### 3. Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Create database and run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 4. Start Development Server

```bash
npm run dev
```

This will:
- Start Vite dev server on http://localhost:5173
- Launch Electron window automatically

## Project Structure

```
PrimeStock/
├── src/
│   ├── main/              # Electron main process
│   │   └── main.ts        # Main Electron entry point
│   ├── preload/           # Electron preload scripts
│   │   └── preload.ts     # Preload script for secure IPC
│   ├── renderer/          # React application (frontend)
│   │   ├── components/    # React components (to be created)
│   │   ├── lib/           # Utilities
│   │   ├── stores/        # Zustand stores
│   │   ├── App.tsx        # Main React component
│   │   └── main.tsx       # React entry point
│   ├── services/          # Business logic services (API-first)
│   │   ├── database.service.ts
│   │   └── index.ts
│   └── shared/            # Shared code between main and renderer
│       ├── types/         # TypeScript type definitions
│       └── utils/         # Shared utilities
├── prisma/
│   └── schema.prisma      # Database schema
└── dist-electron/         # Compiled Electron code (generated)
```

## Next Steps

1. **Set up shadcn/ui components**: Run `npx shadcn-ui@latest init` and add components as needed
2. **Create service layer**: Implement services for Inventory, Sales, Ledger, etc.
3. **Build UI components**: Create React components using shadcn/ui
4. **Implement authentication**: Add login and user management
5. **Add database configuration UI**: Allow users to configure their database connections

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Database Schema Overview

The Prisma schema includes:

- **Company** - Multi-tenancy support
- **User** - Users with per-user database configuration
- **Product** - Product catalog
- **Batch** - Batch tracking with expiry dates
- **Customer/Vendor** - Contact management
- **Sale/SaleItem** - Sales transactions with batch tracking
- **Account** - Chart of accounts (hierarchical)
- **Transaction** - Double-entry ledger transactions
- **ReportConfig** - Custom report configurations
- **ImportExportTemplate** - Excel import/export templates

## Architecture Notes

- **API-First Design**: All business logic is in the `services/` directory
- **Multi-Database Support**: Each user can configure their own database
- **State Management**: Using Zustand for global state
- **UI Components**: Using shadcn/ui for consistent, accessible components
- **Type Safety**: Full TypeScript coverage with Prisma-generated types

