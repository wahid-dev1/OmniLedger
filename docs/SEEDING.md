# Database Seeding Guide

## Overview

The seed service populates the database with realistic dummy data for testing and development purposes.

## What Gets Created

When you run the seed, it creates:

- **1 Company**: "Acme Retail Store" with contact information
- **3 Users**: 
  - Admin (admin@acmeretail.com)
  - Manager (manager@acmeretail.com)
  - Cashier (cashier@acmeretail.com)
- **8 Products**: Various products across categories (Beverages, Confectionery, Health)
- **Multiple Batches**: 1-3 batches per product with expiry dates and quantities
- **4 Customers**: Sample customer records
- **2 Vendors**: Supplier records
- **15 Chart of Accounts**: Complete accounting structure (Assets, Liabilities, Equity, Income, Expenses)
- **5 Sales Transactions**: Sample sales with line items
- **10 Ledger Transactions**: Double-entry accounting transactions linked to sales

## Running the Seed

### Method 1: Using npm script (Recommended)

```bash
npm run prisma:seed
```

### Method 2: Using Prisma CLI

```bash
npx prisma db seed
```

### Prerequisites

1. Database must be initialized:
   ```bash
   npm run prisma:migrate
   ```

2. Prisma client must be generated:
   ```bash
   npm run prisma:generate
   ```

## Using SeedService Programmatically

You can also use the SeedService in your code:

```typescript
import { PrismaClient } from "@prisma/client";
import { SeedService } from "@services/seed.service";

const prisma = new PrismaClient();

// Seed the database
await SeedService.seedDatabase(prisma);

// Or clear all data first (use with caution!)
await SeedService.clearDatabase(prisma);
await SeedService.seedDatabase(prisma);
```

## Safety Features

- The seed script checks if data already exists
- If data is found, it will skip seeding to prevent duplicates
- Use `SeedService.clearDatabase()` if you want to reset and reseed

## Sample Data Details

### Products
- Coffee Beans, Tea, Chocolate Bars, Water, Energy Drinks, Protein Bars, Vitamins
- Prices range from $1.50 to $25.99
- Categories: Beverages, Confectionery, Health

### Batches
- Each product has 1-3 batches
- Manufacturing dates: 2 months ago
- Expiry dates: 6 months from now
- Quantities: 20-120 units per batch

### Sales
- 5 completed sales transactions
- Random customers assigned
- Multiple line items per sale
- Linked to specific batches
- Includes double-entry ledger transactions

### Accounts
- Complete chart of accounts structure
- Assets: Cash, Accounts Receivable, Inventory, Fixed Assets
- Liabilities: Accounts Payable, Loans Payable
- Equity: Owner's Equity, Retained Earnings
- Income: Sales Revenue, Other Income
- Expenses: COGS, Operating Expenses, Rent, Utilities

## Notes

- Passwords are placeholders (not hashed) - update before production use
- All dates are relative to the current date
- Sales are linked to batches for accurate inventory tracking
- Ledger transactions follow double-entry accounting principles

