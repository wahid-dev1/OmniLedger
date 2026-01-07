/**
 * Model Relationships
 * Defines all associations between Sequelize models
 */

import { Sequelize } from 'sequelize';
import { Company } from './Company';
import { User } from './User';
import { Product } from './Product';
import { Batch } from './Batch';
import { Area } from './Area';
import { Customer } from './Customer';
import { Vendor } from './Vendor';
import { Purchase } from './Purchase';
import { PurchaseItem } from './PurchaseItem';
import { PurchasePayment } from './PurchasePayment';
import { Sale } from './Sale';
import { SalePayment } from './SalePayment';
import { SaleItem } from './SaleItem';
import { Account } from './Account';
import { Transaction } from './Transaction';
import { ReportConfig } from './ReportConfig';
import { ImportExportTemplate } from './ImportExportTemplate';
import { SchemaVersion } from './SchemaVersion';

// Import initialize functions
import { initializeCompany } from './Company';
import { initializeUser } from './User';
import { initializeArea } from './Area';
import { initializeCustomer } from './Customer';
import { initializeVendor } from './Vendor';
import { initializeProduct } from './Product';
import { initializeBatch } from './Batch';
import { initializeAccount } from './Account';
import { initializePurchase } from './Purchase';
import { initializePurchaseItem } from './PurchaseItem';
import { initializePurchasePayment } from './PurchasePayment';
import { initializeSale } from './Sale';
import { initializeSaleItem } from './SaleItem';
import { initializeSalePayment } from './SalePayment';
import { initializeTransaction } from './Transaction';
import { initializeReportConfig } from './ReportConfig';
import { initializeImportExportTemplate } from './ImportExportTemplate';
import { initializeSchemaVersion } from './SchemaVersion';

export function initializeRelationships(): void {
  // Company relationships
  Company.hasMany(User, { foreignKey: 'companyId', as: 'users' });
  Company.hasMany(Product, { foreignKey: 'companyId', as: 'products' });
  Company.hasMany(Batch, { foreignKey: 'companyId', as: 'batches' });
  Company.hasMany(Purchase, { foreignKey: 'companyId', as: 'purchases' });
  Company.hasMany(PurchasePayment, { foreignKey: 'companyId', as: 'purchasePayments' });
  Company.hasMany(Sale, { foreignKey: 'companyId', as: 'sales' });
  Company.hasMany(SalePayment, { foreignKey: 'companyId', as: 'salePayments' });
  Company.hasMany(Customer, { foreignKey: 'companyId', as: 'customers' });
  Company.hasMany(Vendor, { foreignKey: 'companyId', as: 'vendors' });
  Company.hasMany(Area, { foreignKey: 'companyId', as: 'areas' });
  Company.hasMany(Account, { foreignKey: 'companyId', as: 'accounts' });
  Company.hasMany(Transaction, { foreignKey: 'companyId', as: 'transactions' });
  Company.hasMany(ReportConfig, { foreignKey: 'companyId', as: 'reportConfigs' });
  Company.hasMany(ImportExportTemplate, { foreignKey: 'companyId', as: 'importExportTemplates' });

  // User relationships
  User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // Product relationships
  Product.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Product.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
  Product.hasMany(Batch, { foreignKey: 'productId', as: 'batches' });
  Product.hasMany(SaleItem, { foreignKey: 'productId', as: 'saleItems' });
  Product.hasMany(PurchaseItem, { foreignKey: 'productId', as: 'purchaseItems' });

  // Batch relationships
  Batch.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  Batch.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Batch.hasMany(SaleItem, { foreignKey: 'batchId', as: 'saleItems' });
  Batch.hasOne(PurchaseItem, { foreignKey: 'batchId', as: 'purchaseItem' });

  // Area relationships
  Area.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Area.hasMany(Customer, { foreignKey: 'areaCode', sourceKey: 'code', as: 'customers' });

  // Customer relationships
  Customer.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Customer.belongsTo(Area, { 
    foreignKey: 'areaCode', 
    targetKey: 'code',
    constraints: false,
    as: 'area' 
  });
  Customer.hasMany(Sale, { foreignKey: 'customerId', as: 'sales' });

  // Vendor relationships
  Vendor.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Vendor.hasMany(Purchase, { foreignKey: 'vendorId', as: 'purchases' });
  Vendor.hasMany(Product, { foreignKey: 'vendorId', as: 'products' });

  // Purchase relationships
  Purchase.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Purchase.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
  Purchase.hasMany(PurchaseItem, { foreignKey: 'purchaseId', as: 'items' });
  Purchase.hasMany(PurchasePayment, { foreignKey: 'purchaseId', as: 'payments' });
  Purchase.hasMany(Transaction, { foreignKey: 'purchaseId', as: 'transactions' });

  // PurchaseItem relationships
  PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchaseId', as: 'purchase' });
  PurchaseItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  PurchaseItem.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });

  // PurchasePayment relationships
  PurchasePayment.belongsTo(Purchase, { foreignKey: 'purchaseId', as: 'purchase' });
  PurchasePayment.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // Sale relationships
  Sale.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Sale.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
  Sale.hasMany(SaleItem, { foreignKey: 'saleId', as: 'items' });
  Sale.hasMany(SalePayment, { foreignKey: 'saleId', as: 'payments' });
  Sale.hasMany(Transaction, { foreignKey: 'saleId', as: 'transactions' });

  // SaleItem relationships
  SaleItem.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
  SaleItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  SaleItem.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });

  // SalePayment relationships
  SalePayment.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
  SalePayment.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // Account relationships
  Account.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Account.belongsTo(Account, { foreignKey: 'parentId', as: 'parent' });
  Account.hasMany(Account, { foreignKey: 'parentId', as: 'children' });
  Account.hasMany(Transaction, { foreignKey: 'debitAccountId', as: 'debits' });
  Account.hasMany(Transaction, { foreignKey: 'creditAccountId', as: 'credits' });

  // Transaction relationships
  Transaction.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  Transaction.belongsTo(Account, { foreignKey: 'debitAccountId', as: 'debitAccount' });
  Transaction.belongsTo(Account, { foreignKey: 'creditAccountId', as: 'creditAccount' });
  Transaction.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
  Transaction.belongsTo(Purchase, { foreignKey: 'purchaseId', as: 'purchase' });

  // ReportConfig relationships
  ReportConfig.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // ImportExportTemplate relationships
  ImportExportTemplate.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

  // SchemaVersion relationships
  SchemaVersion.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
}

/**
 * Initialize all models and relationships
 */
export function initializeAllModels(sequelize: Sequelize): void {
  // Initialize all models (order matters due to foreign keys)
  initializeCompany(sequelize);
  initializeUser(sequelize);
  initializeArea(sequelize);
  initializeCustomer(sequelize);
  initializeVendor(sequelize);
  initializeProduct(sequelize);
  initializeBatch(sequelize);
  initializeAccount(sequelize);
  initializePurchase(sequelize);
  initializePurchaseItem(sequelize);
  initializePurchasePayment(sequelize);
  initializeSale(sequelize);
  initializeSaleItem(sequelize);
  initializeSalePayment(sequelize);
  initializeTransaction(sequelize);
  initializeReportConfig(sequelize);
  initializeImportExportTemplate(sequelize);
  initializeSchemaVersion(sequelize);

  // Initialize relationships
  initializeRelationships();
}

