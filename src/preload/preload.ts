import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  getCompanies: () => ipcRenderer.invoke("get-companies"),
  getCompany: (companyId: string) => ipcRenderer.invoke("get-company", companyId),
  createCompany: (data: any) => ipcRenderer.invoke("create-company", data),
  getProducts: (companyId: string) => ipcRenderer.invoke("get-products", companyId),
  getProduct: (productId: string) => ipcRenderer.invoke("get-product", productId),
    createProduct: (data: any) => ipcRenderer.invoke("create-product", data),
    updateProduct: (productId: string, data: any) => ipcRenderer.invoke("update-product", productId, data),
  deleteProduct: (productId: string) => ipcRenderer.invoke("delete-product", productId),
  getAllBatches: (companyId: string) => ipcRenderer.invoke("get-all-batches", companyId),
  getBatches: (productId: string) => ipcRenderer.invoke("get-batches", productId),
  getBatch: (batchId: string) => ipcRenderer.invoke("get-batch", batchId),
  createBatch: (data: any) => ipcRenderer.invoke("create-batch", data),
  updateBatch: (batchId: string, data: any) => ipcRenderer.invoke("update-batch", batchId, data),
  deleteBatch: (batchId: string) => ipcRenderer.invoke("delete-batch", batchId),
  getProductsWithBatches: (companyId: string) => ipcRenderer.invoke("get-products-with-batches", companyId),
  getSales: (companyId: string) => ipcRenderer.invoke("get-sales", companyId),
  getSale: (saleId: string) => ipcRenderer.invoke("get-sale", saleId),
  createSale: (data: any) => ipcRenderer.invoke("create-sale", data),
  updateSaleStatus: (saleId: string, status: string) => ipcRenderer.invoke("update-sale-status", saleId, status),
  updateSalePaymentType: (saleId: string, paymentType: string) => ipcRenderer.invoke("update-sale-payment-type", saleId, paymentType),
  deleteSale: (saleId: string) => ipcRenderer.invoke("delete-sale", saleId),
  getAccounts: (companyId: string) => ipcRenderer.invoke("get-accounts", companyId),
  getAccount: (accountId: string) => ipcRenderer.invoke("get-account", accountId),
  createAccount: (data: any) => ipcRenderer.invoke("create-account", data),
  updateAccount: (accountId: string, data: any) => ipcRenderer.invoke("update-account", accountId, data),
  deleteAccount: (accountId: string) => ipcRenderer.invoke("delete-account", accountId),
  getTransactions: (companyId: string) => ipcRenderer.invoke("get-transactions", companyId),
  getTransaction: (transactionId: string) => ipcRenderer.invoke("get-transaction", transactionId),
  deleteTransaction: (transactionId: string) => ipcRenderer.invoke("delete-transaction", transactionId),
  createSaleTransactions: (saleId: string) => ipcRenderer.invoke("create-sale-transactions", saleId),
  getCustomers: (companyId: string) => ipcRenderer.invoke("get-customers", companyId),
  getCustomer: (customerId: string) => ipcRenderer.invoke("get-customer", customerId),
  createCustomer: (data: any) => ipcRenderer.invoke("create-customer", data),
  updateCustomer: (customerId: string, data: any) => ipcRenderer.invoke("update-customer", customerId, data),
  deleteCustomer: (customerId: string) => ipcRenderer.invoke("delete-customer", customerId),
  getAreas: (companyId: string) => ipcRenderer.invoke("get-areas", companyId),
  createArea: (data: any) => ipcRenderer.invoke("create-area", data),
  deleteArea: (areaId: string) => ipcRenderer.invoke("delete-area", areaId),
  getVendors: (companyId: string) => ipcRenderer.invoke("get-vendors", companyId),
  getVendor: (vendorId: string) => ipcRenderer.invoke("get-vendor", vendorId),
  createVendor: (data: any) => ipcRenderer.invoke("create-vendor", data),
  updateVendor: (vendorId: string, data: any) => ipcRenderer.invoke("update-vendor", vendorId, data),
  deleteVendor: (vendorId: string) => ipcRenderer.invoke("delete-vendor", vendorId),
  recalculateAccountBalances: (companyId: string) => ipcRenderer.invoke("recalculate-account-balances", companyId),
  addSalePayment: (saleId: string, data: any) => ipcRenderer.invoke("add-sale-payment", saleId, data),
  getPurchases: (companyId: string) => ipcRenderer.invoke("get-purchases", companyId),
  getPurchase: (purchaseId: string) => ipcRenderer.invoke("get-purchase", purchaseId),
  createPurchase: (data: any) => ipcRenderer.invoke("create-purchase", data),
  deletePurchase: (purchaseId: string) => ipcRenderer.invoke("delete-purchase", purchaseId),
  addPurchasePayment: (purchaseId: string, data: any) => ipcRenderer.invoke("add-purchase-payment", purchaseId, data),
  getVendorPurchases: (vendorId: string) => ipcRenderer.invoke("get-vendor-purchases", vendorId),
  setActiveDatabaseConfig: (config: any) =>
    ipcRenderer.invoke("set-active-database-config", config),
  getActiveDatabaseConfig: () =>
    ipcRenderer.invoke("get-active-database-config"),
  testDatabaseConnection: (config: any) =>
    ipcRenderer.invoke("test-database-connection", config),
  checkSchemaInitialized: (config: any) =>
    ipcRenderer.invoke("check-schema-initialized", config),
  initializeDatabaseSchema: (config: any) =>
    ipcRenderer.invoke("initialize-database-schema", config),
  runDatabaseMigrations: (config: any) =>
    ipcRenderer.invoke("run-database-migrations", config),
  checkMigrationNeeded: (config: any) =>
    ipcRenderer.invoke("check-migration-needed", config),
  seedDatabase: (config: any, clearExisting?: boolean) =>
    ipcRenderer.invoke("seed-database", config, clearExisting),
  // Mobile API Server
  startMobileServer: (config: any) => ipcRenderer.invoke("mobile-server:start", config),
  stopMobileServer: () => ipcRenderer.invoke("mobile-server:stop"),
  getMobileServerStatus: () => ipcRenderer.invoke("mobile-server:status"),
  getMobileServerConfig: () => ipcRenderer.invoke("mobile-server:get-config"),
  getNetworkInfo: () => ipcRenderer.invoke("mobile-server:get-network-info"),
});

// Type definitions for the exposed API
export type ElectronAPI = {
  getCompanies: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getCompany: (companyId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createCompany: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  getProducts: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getProduct: (productId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createProduct: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateProduct: (productId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
  getAllBatches: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getBatches: (productId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getBatch: (batchId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createBatch: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateBatch: (batchId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteBatch: (batchId: string) => Promise<{ success: boolean; error?: string }>;
  getProductsWithBatches: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getSales: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getSale: (saleId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createSale: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateSaleStatus: (saleId: string, status: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateSalePaymentType: (saleId: string, paymentType: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteSale: (saleId: string) => Promise<{ success: boolean; error?: string }>;
  getAccounts: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getAccount: (accountId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createAccount: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateAccount: (accountId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  getTransactions: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getTransaction: (transactionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteTransaction: (transactionId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  createSaleTransactions: (saleId: string) => Promise<{ success: boolean; data?: any; message?: string; error?: string }>;
  getCustomers: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getCustomer: (customerId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createCustomer: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateCustomer: (customerId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteCustomer: (customerId: string) => Promise<{ success: boolean; error?: string }>;
  getAreas: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  createArea: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteArea: (areaId: string) => Promise<{ success: boolean; error?: string }>;
  getVendors: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getVendor: (vendorId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createVendor: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  updateVendor: (vendorId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deleteVendor: (vendorId: string) => Promise<{ success: boolean; error?: string }>;
  recalculateAccountBalances: (companyId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  addSalePayment: (saleId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  getPurchases: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  getPurchase: (purchaseId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  createPurchase: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  deletePurchase: (purchaseId: string) => Promise<{ success: boolean; error?: string }>;
  addPurchasePayment: (purchaseId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  getVendorPurchases: (vendorId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  setActiveDatabaseConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  getActiveDatabaseConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
  testDatabaseConnection: (config: any) => Promise<{ success: boolean; error?: string }>;
  checkSchemaInitialized: (config: any) => Promise<{ success: boolean; isInitialized?: boolean; error?: string }>;
  initializeDatabaseSchema: (config: any) => Promise<{ success: boolean; migrated?: boolean; seeded?: boolean; error?: string }>;
  runDatabaseMigrations: (config: any) => Promise<{ success: boolean; error?: string }>;
  checkMigrationNeeded: (config: any) => Promise<{ needed: boolean; currentVersion?: string | null; requiredVersion: string; error?: string }>;
  seedDatabase: (config: any, clearExisting?: boolean) => Promise<{ success: boolean; message?: string; error?: string }>;
  // Mobile API Server
  startMobileServer: (config: any) => Promise<{ success: boolean; error?: string; port?: number; apiKey?: string }>;
  stopMobileServer: () => Promise<{ success: boolean; error?: string }>;
  getMobileServerStatus: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getMobileServerConfig: () => Promise<{ success: boolean; data?: any; error?: string }>;
  getNetworkInfo: () => Promise<{ success: boolean; data?: Array<{ interface: string; address: string; family: string }>; error?: string }>;
};

