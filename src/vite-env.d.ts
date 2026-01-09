/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

interface Window {
  electronAPI?: {
    getCompanies: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
    getCompany: (companyId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getProducts: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    getProduct: (productId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    createProduct: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    getBatches: (productId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    createBatch: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    getProductsWithBatches: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    getSales: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    getSale: (saleId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    createSale: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    updateSaleStatus: (saleId: string, status: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    updateSalePaymentType: (saleId: string, paymentType: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    getAccounts: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    getAccount: (accountId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    createAccount: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    updateAccount: (accountId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    deleteAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>;
    getTransactions: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    getTransaction: (transactionId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    createSaleTransactions: (saleId: string) => Promise<{ success: boolean; data?: any; message?: string; error?: string }>;
    getCustomers: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    getCustomer: (customerId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    createCustomer: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    updateCustomer: (customerId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    getAreas: (companyId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
    createArea: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    recalculateAccountBalances: (companyId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
    addSalePayment: (saleId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
    testDatabaseConnection: (config: any) => Promise<{ success: boolean; error?: string }>;
  };
}

