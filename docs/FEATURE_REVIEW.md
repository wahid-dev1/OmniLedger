# OmniLedger - Feature Review & Enhancement Opportunities

This document provides a comprehensive review of the current implementation status and identifies features that can be added to enhance the OmniLedger system.

## ✅ Currently Implemented Features

### Core Infrastructure
- ✅ Multi-company support with data isolation
- ✅ Multi-database configuration (SQLite, PostgreSQL, MySQL, MSSQL)
- ✅ Sequelize ORM with relationship management
- ✅ Database migration system
- ✅ Role-based access control structure (Admin, Manager, Cashier roles defined in User model)

### Inventory Management
- ✅ Product master with SKU, name, category
- ✅ Batch tracking with batch numbers, expiry dates, manufacturing dates
- ✅ Stock levels tracked per product and per batch
- ✅ Product-vendor relationships

### Sales & Purchase Management
- ✅ Point of Sale (Sales) with header-line items structure
- ✅ Batch deduction in sales (FIFO through available quantity)
- ✅ Purchase orders with batch creation
- ✅ Payment tracking (SalePayment, PurchasePayment)
- ✅ Invoice generation (PDF)

### Partners Management
- ✅ Customer Master (C Card) with area code relationship
- ✅ Supplier/Vendor Master (S Card)
- ✅ Area lookup table for categorization

### Financials
- ✅ Double-entry ledger system (Transaction model)
- ✅ Chart of Accounts (Account model with hierarchy)
- ✅ Automatic ledger entry creation for sales and purchases
- ✅ Account balance tracking
- ✅ General Ledger screen with filtering

### Reports
- ✅ Pre-built reports (Sales, Purchase, Inventory, Financial, etc.)
- ✅ PDF generation for reports
- ✅ Batch expiry reports
- ✅ Product performance reports
- ✅ Profit & Loss reports

### UI/UX
- ✅ React + TypeScript frontend
- ✅ shadcn/ui component library
- ✅ Responsive layouts
- ✅ Dashboard with key metrics
- ✅ Customer statement PDF generation

---

## ❌ Missing Features (From Requirements)

### 1. HR & Payroll Management ⚠️ CRITICAL MISSING
**Status:** Not implemented at all

**Required:**
- Employee Master Model:
  - `employee_id` (PK)
  - `employee_name`
  - `designation`
  - `father_name`
  - `cell_number`
  - `address`
  - `company_id`

- Employee Salary Model:
  - `employee_id` (FK)
  - `basic_salary`
  - `daily_rate`
  - `sales_commission`
  - `special_allowance`
  - `monthly_expense`
  - `motorbike_allowance`
  - `total`
  - `net_monthly_income`
  - `month_year` (for tracking monthly payroll)

**Implementation Needed:**
- Create `Employee` model in `src/database/models/Employee.ts`
- Create `EmployeeSalary` model in `src/database/models/EmployeeSalary.ts`
- Add relationships in `relationships.ts`
- Create IPC handlers in `main.ts`:
  - `get-employees`
  - `create-employee`
  - `update-employee`
  - `delete-employee`
  - `get-employee-salaries`
  - `create-employee-salary`
  - `process-payroll`
- Create UI components:
  - `EmployeesScreen.tsx`
  - `EmployeeForm.tsx`
  - `EmployeeDetail.tsx`
  - `PayrollScreen.tsx`
  - `PayrollForm.tsx`
  - `SalaryStatementPDF.tsx`
- Add routes to `App.tsx`

---

### 2. Stock Return Management ⚠️ CRITICAL MISSING
**Status:** Mentioned in requirements but not implemented

**Required:**
- Stock Return Model:
  - `entry_no` (Auto-increment/unique)
  - `return_date`
  - `product_id` (FK)
  - `batch_id` (FK) - **CRITICAL: Must ask which batch**
  - `quantity`
  - `return_amount`
  - `reason` (optional)
  - `status` (pending, approved, rejected, restocked)
  - `company_id`
  - `sale_id` (FK, if returning from a sale)
  - `purchase_id` (FK, if returning to vendor)

**Implementation Needed:**
- Create `StockReturn` model in `src/database/models/StockReturn.ts`
- Add relationships in `relationships.ts`
- Create IPC handlers in `main.ts`:
  - `get-stock-returns`
  - `create-stock-return`
  - `update-stock-return-status`
  - `process-stock-return` (restock/dispose logic)
- Create UI components:
  - `StockReturnsScreen.tsx`
  - `StockReturnForm.tsx` (with batch selection dropdown)
  - `StockReturnDetail.tsx`
- Add routes to `App.tsx`
- **Batch Selection Logic:** When creating a return, show all batches for the product and allow user to select which batch the returned item belongs to

---

### 3. Stock Ledger / Movement History ⚠️ IMPORTANT MISSING
**Status:** Movements tracked indirectly but no unified Stock Ledger table

**Current State:** Stock movements are inferred from PurchaseItem and SaleItem, but there's no dedicated Stock Ledger table tracking all movements.

**Required:**
- Stock Ledger Model:
  - `entry_no` (Auto-increment)
  - `transaction_date`
  - `product_id` (FK)
  - `batch_id` (FK)
  - `movement_type` (purchase, sale, transfer_out, stock_return, opening_balance, adjustment)
  - `quantity` (signed: positive for in, negative for out)
  - `reference_type` (purchase, sale, stock_return, transfer, adjustment)
  - `reference_id` (ID of the related transaction)
  - `balance` (running balance after this movement)
  - `company_id`

**Benefits:**
- Complete audit trail of all stock movements
- Easier reporting and reconciliation
- Better tracking for expiry management
- Historical stock levels

**Implementation Needed:**
- Create `StockLedger` model
- Update `PurchaseItem` creation to also create Stock Ledger entry
- Update `SaleItem` creation to also create Stock Ledger entry
- Update `StockReturn` creation to also create Stock Ledger entry
- Create IPC handlers:
  - `get-stock-ledger` (with filters: product, batch, date range, movement type)
- Create UI component:
  - `StockLedgerScreen.tsx` (with filters and export)

---

### 4. Customer & Supplier Ledgers ⚠️ PARTIALLY IMPLEMENTED
**Status:** Transaction model exists but no dedicated Customer/Supplier Ledger views

**Current State:** General ledger exists, but there's no dedicated view showing:
- Entry No
- Date
- Particulars
- Debit
- Credit
- Running Balance

**Required:**
- Customer Ledger View/Report:
  - Show all transactions affecting a customer (sales, payments)
  - Entry-by-entry with running balance
  - Separate from general ledger but using same Transaction data

- Supplier Ledger View/Report:
  - Show all transactions affecting a vendor (purchases, payments)
  - Entry-by-entry with running balance

**Implementation Needed:**
- Create IPC handlers:
  - `get-customer-ledger` (customerId, dateFrom?, dateTo?)
  - `get-supplier-ledger` (vendorId, dateFrom?, dateTo?)
- Create UI components:
  - `CustomerLedgerScreen.tsx` (showing ledger entries for a customer)
  - `VendorLedgerScreen.tsx` (showing ledger entries for a vendor)
  - Enhance `CustomerDetail.tsx` to show ledger tab
  - Enhance `VendorDetail.tsx` to show ledger tab
- Add PDF export for customer/supplier ledgers

---

### 5. Cashbook ⚠️ MISSING
**Status:** Not implemented

**Required:**
- Cashbook Model:
  - `entry_no` (Auto-increment)
  - `entry_date`
  - `type` (receipt, payment)
  - `party_type` (customer, vendor, other)
  - `party_id` (FK to Customer/Vendor or null)
  - `party_name` (for "other" entries)
  - `amount`
  - `payment_method` (cash, bank)
  - `account_id` (FK to Account - Cash or Bank)
  - `particulars`
  - `reference` (optional reference number)
  - `company_id`

**Purpose:**
- Track direct cash payments/receipts separately from sales/purchases
- Quick entry for miscellaneous cash transactions
- Better cash flow tracking

**Implementation Needed:**
- Create `Cashbook` model
- Add relationship to Customer, Vendor, Account
- Create IPC handlers:
  - `get-cashbook-entries`
  - `create-cashbook-entry`
  - `update-cashbook-entry`
  - `delete-cashbook-entry`
- Automatically create Transaction entries for double-entry accounting
- Create UI components:
  - `CashbookScreen.tsx`
  - `CashbookForm.tsx`
  - `CashbookReport.tsx`

---

### 6. Excel Import/Export ⚠️ CRITICAL MISSING
**Status:** `ImportExportTemplate` model exists but no actual implementation
**Note:** `exceljs` is in dependencies but not used

**Required Import Functionality:**
- Bulk import of products (with batch information)
- Import of inventory data
- Import of sales transactions
- Import of ledger entries
- Import of customer/vendor data
- Import of employee data
- Template-based imports (download Excel templates)
- Data validation with detailed error reports
- Column mapping configuration

**Required Export Functionality:**
- Export all product data (with batch details)
- Export inventory levels
- Export sales reports
- Export purchase reports
- Export financial/ledger data
- Export customer/vendor data
- Export custom reports
- Filtered exports (export only selected data)

**Implementation Needed:**
- Create service: `src/services/excel.service.ts`
  - `importProducts(filePath, templateId?, companyId)`
  - `exportProducts(filters, templateId?, companyId)`
  - `importCustomers(filePath, templateId?, companyId)`
  - `exportCustomers(filters, templateId?, companyId)`
  - `importSales(filePath, templateId?, companyId)`
  - `exportSales(filters, templateId?, companyId)`
  - `generateTemplate(entityType, companyId)`
  - `validateImportData(data, entityType, companyId)`
- Create IPC handlers in `main.ts`:
  - `import-excel-data` (entityType, filePath, templateId?)
  - `export-excel-data` (entityType, filters, templateId?)
  - `generate-excel-template` (entityType)
  - `get-import-templates`
  - `save-import-template`
  - `validate-excel-file`
- Create UI components:
  - `ExcelImportDialog.tsx` (for importing data)
  - `ExcelExportDialog.tsx` (for exporting data)
  - `TemplateManager.tsx` (for managing import/export templates)
- Add import/export buttons to relevant screens:
  - ProductsScreen
  - CustomersScreen
  - VendorsScreen
  - SalesScreen
  - PurchasesScreen
  - ReportsScreen

---

### 7. Dynamic Query Builder for Reports ⚠️ MISSING
**Status:** Pre-built reports exist, but no dynamic query builder

**Required:**
- User interface to:
  - Select tables/entities
  - Select columns to include
  - Add filters (WHERE conditions)
  - Group by fields
  - Aggregate functions (SUM, COUNT, AVG)
  - Order by fields
- Save custom reports
- Export custom reports (PDF, Excel)

**Implementation Needed:**
- Enhance `ReportConfig` model usage
- Create UI component: `CustomReportBuilder.tsx`
  - Column selector
  - Filter builder
  - Group by selector
  - Aggregation selector
  - Preview
  - Save/load configurations
- Create service: `src/services/report-builder.service.ts`
  - Build dynamic queries based on configuration
  - Execute queries safely (SQL injection prevention)
  - Generate preview data
- Create IPC handlers:
  - `build-custom-report` (config)
  - `save-report-config`
  - `get-report-configs`
  - `execute-custom-report`

---

### 8. Stock Transfers ⚠️ NOT IN REQUIREMENTS BUT USEFUL
**Status:** Not mentioned but useful for multi-location/warehouse scenarios

**Optional Enhancement:**
- Transfer stock between locations/warehouses
- Transfer stock between batches
- Track transfer history
- Approval workflow for transfers

---

### 9. Enhanced Security Features ⚠️ PARTIALLY IMPLEMENTED
**Status:** Role structure exists but authentication not fully implemented

**Current State:**
- User model has `role` field (admin, manager, cashier)
- Password field exists but likely not hashed

**Required:**
- Password hashing (bcrypt)
- Login/authentication screen
- Session management
- Permission checks on IPC handlers
- UI permission checks (hide/show buttons based on role)
- Audit log for sensitive operations

**Implementation Needed:**
- Add password hashing service
- Create authentication service
- Create login UI component
- Add session management (JWT or similar)
- Add permission middleware for IPC handlers
- Create audit log model for tracking sensitive operations

---

### 10. Password Encryption for Database Credentials ⚠️ PARTIALLY IMPLEMENTED
**Status:** User model has `dbPassword` field marked as encrypted, but encryption might not be implemented

**Required:**
- Encrypt database passwords in User model
- Encryption key management
- Secure storage of credentials

**Implementation Needed:**
- Review and implement encryption service
- Add encryption/decryption utilities
- Ensure credentials are encrypted at rest

---

## 🔄 Enhancements to Existing Features

### 1. Sales Return Workflow
- Add "Return Items" button in SaleDetail
- Create return from existing sale (pre-fill batch info)
- Track returned quantities
- Restock functionality

### 2. Batch FIFO/LIFO Selection
- Currently uses FIFO (available quantity filter)
- Add option to choose FIFO, LIFO, or manual selection
- Add batch selection UI in SalesForm

### 3. Advanced Reporting
- Add more report templates
- Schedule reports (if future SaaS migration)
- Email reports (if future SaaS migration)

### 4. Product Categories
- Currently product has category field but no Category master
- Create Category model for better organization
- Category-based reporting

### 5. Tax Management
- Add tax fields to products
- Tax calculation in sales/purchases
- Tax reports

### 6. Discounts & Promotions
- Discount fields in sales
- Promotional pricing
- Discount reports

### 7. Barcode/QR Code Support
- Generate barcodes for products
- Barcode scanning for sales
- QR code for invoices

### 8. Multi-Currency Support
- Currently currency is per company
- Add currency conversion
- Track exchange rates
- Multi-currency transactions

### 9. Notifications & Alerts
- Low stock alerts
- Batch expiry warnings
- Payment due reminders
- System notifications

### 10. Backup & Restore
- Database backup functionality
- Scheduled backups
- Restore from backup
- Export/import entire database

---

## 📊 Priority Recommendations

### High Priority (Core Requirements Missing)
1. **HR & Payroll Management** - Complete module
2. **Stock Return Management** - With batch tracking
3. **Excel Import/Export** - Full implementation
4. **Customer/Supplier Ledgers** - Dedicated views
5. **Cashbook** - Direct cash transaction tracking

### Medium Priority (Important Enhancements)
6. **Stock Ledger** - Unified movement tracking
7. **Dynamic Query Builder** - Custom reports
8. **Security & Authentication** - Complete implementation

### Low Priority (Nice to Have)
9. Stock Transfers
10. Advanced reporting features
11. Multi-currency
12. Barcode support

---

## 📝 Notes

- The `exceljs` package is already installed but not used - ready for Excel implementation
- The `ImportExportTemplate` model exists but needs actual import/export service
- Authentication structure is in place but needs implementation
- Most core features are well-implemented
- Database structure is solid and can support all missing features

---

## 🚀 Quick Wins

1. **Stock Return Model** - Can be implemented quickly as it's similar to existing Sale/Purchase models
2. **Customer/Supplier Ledger Views** - Can reuse existing Transaction data with new queries
3. **Excel Export** - Start with simple exports (Products, Customers, Sales) using existing exceljs
4. **Cashbook** - Simple model that extends Transaction concept

---

Last Updated: 2024-01-XX
