/**
 * Seed Service
 * Populates database with dummy data for testing and development
 * Supports multi-company: add sample companies by category without overwriting existing data
 */

import { Sequelize } from "sequelize";
import { Company } from "../database/models/Company";
import { User } from "../database/models/User";
import { Product } from "../database/models/Product";
import { Batch } from "../database/models/Batch";
import { Area } from "../database/models/Area";
import { Customer } from "../database/models/Customer";
import { Vendor } from "../database/models/Vendor";
import { Account } from "../database/models/Account";
import { Sale } from "../database/models/Sale";
import { SaleItem } from "../database/models/SaleItem";
import { SalePayment } from "../database/models/SalePayment";
import { Purchase } from "../database/models/Purchase";
import { PurchaseItem } from "../database/models/PurchaseItem";
import { PurchasePayment } from "../database/models/PurchasePayment";
import { Transaction } from "../database/models/Transaction";
import { DEFAULT_CURRENCY } from "../shared/constants";
import type { SampleCategory } from "../shared/sample-categories";
import { SAMPLE_CATEGORIES } from "./sample-templates";

export class SeedService {
  /**
   * Seed database with default company (grocery) when empty
   */
  static async seedDatabase(sequelize: Sequelize): Promise<void> {
    console.log("🌱 Starting database seed...");

    const existingCompany = await Company.findOne();
    if (existingCompany) {
      console.log("⚠️  Database already contains data. Use addSampleCompany to add more.");
      return;
    }

    await this.addSampleCompany(sequelize, "grocery");
  }

  /**
   * Add a new sample company by category - never overwrites existing data
   */
  static async addSampleCompany(sequelize: Sequelize, category: SampleCategory): Promise<void> {
    const template = SAMPLE_CATEGORIES[category];
    if (!template) {
      throw new Error(`Unknown sample category: ${category}`);
    }

    console.log(`🌱 Adding sample company: ${template.company.name} (${category})`);

    if (sequelize.getDialect() === "sqlite") {
      await sequelize.query("PRAGMA foreign_keys = OFF");
    }

    const company = await Company.create({
      ...template.company,
      currency: DEFAULT_CURRENCY,
    } as any);
    const companyData = company.toJSON();
    console.log("✅ Created company:", companyData.name);

    // Use company ID in email to ensure uniqueness when adding multiple sample companies
    const emailSuffix = `${companyData.id}@sample.local`;
    await User.create({ email: `admin+${emailSuffix}`, name: "Admin User", password: "hashed_admin", role: "admin", companyId: companyData.id } as any);
    await User.create({ email: `manager+${emailSuffix}`, name: "Manager", password: "hashed_manager", role: "manager", companyId: companyData.id } as any);
    await User.create({ email: `cashier+${emailSuffix}`, name: "Cashier", password: "hashed_cashier", role: "cashier", companyId: companyData.id } as any);
    console.log("✅ Created users");

    const createdProducts: Array<InstanceType<typeof Product>> = [];
    for (const productData of template.products) {
      const product = await Product.create({ ...productData, companyId: companyData.id } as any);
      createdProducts.push(product);
    }
    console.log(`✅ Created ${createdProducts.length} products`);

    const now = new Date();
    const batches: Array<InstanceType<typeof Batch>> = [];
    for (let i = 0; i < createdProducts.length; i++) {
      const product = createdProducts[i];
      const productData = product.toJSON();
      const batchCount = Math.floor(Math.random() * 2) + 1;
      for (let j = 1; j <= batchCount; j++) {
        const manufacturingDate = new Date(now);
        manufacturingDate.setMonth(manufacturingDate.getMonth() - 2);
        const expiryDate = new Date(now);
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        const quantity = Math.floor(Math.random() * 80) + 20;
        const purchasePrice = category === "electronics" ? Math.random() * 5000 + 500 : category === "pharmacy" ? Math.random() * 200 + 50 : Math.random() * 20 + 5;
        const batch = await Batch.create({
          productId: productData.id,
          batchNumber: `BATCH-${productData.sku}-${j}`,
          quantity,
          availableQuantity: quantity,
          manufacturingDate,
          expiryDate,
          purchasePrice,
          companyId: companyData.id,
        } as any);
        batches.push(batch);
      }
    }
    console.log(`✅ Created ${batches.length} batches`);

    const createdAreas: Array<{ toJSON: () => { code: string } }> = [];
    for (const areaData of template.areas) {
      const area = await Area.create({ ...areaData, companyId: companyData.id } as any);
      createdAreas.push(area);
    }
    console.log(`✅ Created ${createdAreas.length} areas`);

    const createdCustomers: Array<InstanceType<typeof Customer>> = [];
    for (const customerData of template.customers) {
      const customer = await Customer.create({ ...customerData, companyId: companyData.id } as any);
      createdCustomers.push(customer);
    }
    console.log(`✅ Created ${createdCustomers.length} customers`);

    const createdVendors: Array<InstanceType<typeof Vendor>> = [];
    for (const vendorData of template.vendors) {
      const vendor = await Vendor.create({ ...vendorData, companyId: companyData.id } as any);
      createdVendors.push(vendor);
    }
    console.log(`✅ Created ${createdVendors.length} vendors`);

    // Create Chart of Accounts
    const accounts = [
      // Assets
      { code: "1000", name: "Cash", type: "asset", parentId: null },
      { code: "1100", name: "Accounts Receivable", type: "asset", parentId: null },
      { code: "1200", name: "Inventory", type: "asset", parentId: null },
      { code: "1500", name: "Fixed Assets", type: "asset", parentId: null },

      // Liabilities
      { code: "2000", name: "Accounts Payable", type: "liability", parentId: null },
      { code: "2500", name: "Loans Payable", type: "liability", parentId: null },

      // Equity
      { code: "3000", name: "Owner's Equity", type: "equity", parentId: null },
      { code: "3100", name: "Retained Earnings", type: "equity", parentId: null },

      // Income
      { code: "4000", name: "Sales Revenue", type: "income", parentId: null },
      { code: "4100", name: "Other Income", type: "income", parentId: null },

      // Expenses
      { code: "5000", name: "Cost of Goods Sold", type: "expense", parentId: null },
      { code: "6000", name: "Operating Expenses", type: "expense", parentId: null },
      { code: "6100", name: "Rent Expense", type: "expense", parentId: null },
      { code: "6200", name: "Utilities Expense", type: "expense", parentId: null },
    ];

    const createdAccounts = [];
    for (const accountData of accounts) {
      const account = await Account.create({
          ...accountData,
          companyId: companyData.id,
        balance: 0,
      } as any);
      createdAccounts.push(account);
    }
    console.log(`✅ Created ${createdAccounts.length} accounts`);

    // Create Sample Sales
    const sales = [];
    for (let i = 1; i <= 5; i++) {
      const customer =
        createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - i);

      // Select random products and batches for this sale
      const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const selectedBatches: Array<{ id: string; productId: string }> = [];
      for (let j = 0; j < itemCount; j++) {
        const batchModel = batches[Math.floor(Math.random() * batches.length)];
        const batchData = batchModel.toJSON();
        if (!selectedBatches.find((b: { id: string }) => b.id === batchData.id)) {
          selectedBatches.push({ id: batchData.id, productId: batchData.productId });
        }
      }

      let totalAmount = 0;
      const saleItems: Array<{
        productId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      for (const selectedBatch of selectedBatches) {
        const product = createdProducts.find((p) => {
          const pData = p.toJSON();
          return pData.id === selectedBatch.productId;
        });
        if (!product) continue;

        const productData = product.toJSON();
        const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 units
        // Use batch purchase price with markup for sale price (seed data)
        // selectedBatch is a lightweight {id, productId} object, so we need the full Batch model instance for pricing fields.
        const batchInstance =
          batches.find((b) => b.id === selectedBatch.id) ||
          (await Batch.findByPk(selectedBatch.id));
        if (!batchInstance) continue;
        const batchData = batchInstance.toJSON();
        const unitPrice = (batchData.purchasePrice || 0) * 1.4; // 40% markup
        const itemTotal = unitPrice * quantity;

        saleItems.push({
          productId: productData.id,
          batchId: selectedBatch.id,
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: itemTotal,
        });

        totalAmount += itemTotal;

        // Update batch available quantity
        await batchInstance.update({
          availableQuantity: (batchInstance.availableQuantity || 0) - quantity,
        });
      }

      const customerData = customer.toJSON();
      const sale = await Sale.create({
          saleNumber: `SALE-${String(i).padStart(4, "0")}`,
          customerId: customerData.id,
          companyId: companyData.id,
          totalAmount: totalAmount,
        paidAmount: totalAmount, // Mark as fully paid
          status: "completed",
        paymentType: "cash",
          saleDate: saleDate,
      } as any);
      const saleData = sale.toJSON();

      // Create sale items
      for (const item of saleItems) {
        await SaleItem.create({
          saleId: saleData.id,
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        } as any);
      }

      sales.push(sale);

      // Create ledger transaction for sale
      const salesAccount = createdAccounts.find((a) => {
        const aData = a.toJSON();
        return aData.code === "4000";
      });
      const cashAccount = createdAccounts.find((a) => {
        const aData = a.toJSON();
        return aData.code === "1000";
      });
      const cogsAccount = createdAccounts.find((a) => {
        const aData = a.toJSON();
        return aData.code === "5000";
      });
      const inventoryAccount = createdAccounts.find((a) => {
        const aData = a.toJSON();
        return aData.code === "1200";
      });

      if (salesAccount && cashAccount && cogsAccount && inventoryAccount) {
        const salesAccountData = salesAccount.toJSON();
        const cashAccountData = cashAccount.toJSON();
        const cogsAccountData = cogsAccount.toJSON();
        const inventoryAccountData = inventoryAccount.toJSON();

        // Sales transaction: Debit Cash, Credit Sales Revenue
        await Transaction.create({
            transactionNumber: `TXN-${String(i * 2 - 1).padStart(4, "0")}`,
            description: `Sale ${saleData.saleNumber}`,
            debitAccountId: cashAccountData.id,
            creditAccountId: salesAccountData.id,
            amount: totalAmount,
            saleId: saleData.id,
            companyId: companyData.id,
            transactionDate: saleDate,
        } as any);

        // COGS transaction: Debit COGS, Credit Inventory
        const cogsAmount = totalAmount * 0.6; // Assume 60% cost
        await Transaction.create({
            transactionNumber: `TXN-${String(i * 2).padStart(4, "0")}`,
            description: `COGS for Sale ${saleData.saleNumber}`,
            debitAccountId: cogsAccountData.id,
            creditAccountId: inventoryAccountData.id,
            amount: cogsAmount,
            saleId: saleData.id,
            companyId: companyData.id,
            transactionDate: saleDate,
        } as any);
      }
    }
    console.log(`✅ Created ${sales.length} sales with transactions`);

    // Create Sample Purchases
    const purchases = [];
    for (let i = 1; i <= 3; i++) {
      const vendor = createdVendors[Math.floor(Math.random() * createdVendors.length)];
      const vendorData = vendor.toJSON();
      const purchaseDate = new Date(now);
      purchaseDate.setDate(purchaseDate.getDate() - (i + 5)); // Earlier than sales

      // Select random products for this purchase
      const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const selectedProducts: Array<{ id: string; sku: string }> = [];
      for (let j = 0; j < itemCount; j++) {
        const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
        const productData = product.toJSON();
        if (!selectedProducts.find((p) => p.id === productData.id)) {
          selectedProducts.push({ 
            id: productData.id, 
            sku: productData.sku
          });
        }
      }

      let totalAmount = 0;
      const purchaseItems: Array<{
        productId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        batchNumber: string;
      }> = [];

      // Create batches for each purchase item
      const priceRange = category === "electronics" ? [500, 5000] : category === "pharmacy" ? [50, 200] : [5, 25];
      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 50) + 10; // 10-60 units
        const unitPrice = Math.random() * (priceRange[1] - priceRange[0]) + priceRange[0];
        const itemTotal = unitPrice * quantity;
        const batchNumber = `PURCH-BATCH-${product.sku}-${i}-${purchaseItems.length + 1}`;

        // Create batch for this purchase
        const manufacturingDate = new Date(purchaseDate);
        manufacturingDate.setMonth(manufacturingDate.getMonth() - 1);
        const expiryDate = new Date(manufacturingDate);
        expiryDate.setMonth(expiryDate.getMonth() + 12);

        const batch = await Batch.create({
          productId: product.id,
          batchNumber: batchNumber,
          quantity: quantity,
          availableQuantity: quantity,
          manufacturingDate: manufacturingDate,
          expiryDate: expiryDate,
          purchasePrice: unitPrice,
          companyId: companyData.id,
        } as any);

        const batchData = batch.toJSON();
        purchaseItems.push({
          productId: product.id,
          batchId: batchData.id,
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: itemTotal,
          batchNumber: batchNumber,
        });

        totalAmount += itemTotal;
      }

      // Determine payment type (mix of cash, bank, and credit)
      const paymentTypes = ["cash", "bank", "credit"];
      const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
      const paidAmount = paymentType === "credit" ? 0 : totalAmount;

      const purchase = await Purchase.create({
        purchaseNumber: `PURCH-${String(i).padStart(4, "0")}`,
        vendorId: vendorData.id,
        companyId: companyData.id,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        status: paidAmount >= totalAmount ? "completed" : "pending",
        paymentType: paymentType,
        purchaseDate: purchaseDate,
      } as any);

      const purchaseData = purchase.toJSON();
      
      // Create purchase items
      for (const item of purchaseItems) {
        await PurchaseItem.create({
          purchaseId: purchaseData.id,
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          batchNumber: item.batchNumber,
        } as any);
      }

      purchases.push(purchase);

      // Create ledger transaction for purchase
      const inventoryAccount = createdAccounts.find((a) => {
        const aData = a.toJSON();
        return aData.code === "1200";
      });
      const cashAccount = createdAccounts.find((a) => {
        const aData = a.toJSON();
        return aData.code === "1000";
      });
      const bankAccount = createdAccounts.find((a) => {
        const aData = a.toJSON();
        return aData.code === "1100";
      });
      const accountsPayableAccount = createdAccounts.find((a) => {
        const aData = a.toJSON();
        return aData.code === "2000";
      });

      if (inventoryAccount && (cashAccount || bankAccount || accountsPayableAccount)) {
        const inventoryAccountData = inventoryAccount.toJSON();
        const paymentAccount = paymentType === "bank" && bankAccount 
          ? bankAccount 
          : paymentType === "cash" && cashAccount
          ? cashAccount
          : accountsPayableAccount;

        if (paymentAccount) {
          const paymentAccountData = paymentAccount.toJSON();
          // Purchase transaction: Debit Inventory, Credit Cash/Bank/Accounts Payable
          await Transaction.create({
            transactionNumber: `TXN-P${String(i).padStart(4, "0")}`,
            description: `Purchase ${purchaseData.purchaseNumber}`,
            debitAccountId: inventoryAccountData.id,
            creditAccountId: paymentAccountData.id,
            amount: totalAmount,
            purchaseId: purchaseData.id,
            companyId: companyData.id,
            transactionDate: purchaseDate,
          } as any);
        }
      }
    }
    console.log(`✅ Created ${purchases.length} purchases with transactions`);

    if (sequelize.getDialect() === "sqlite") {
      await sequelize.query("PRAGMA foreign_keys = ON");
    }
    console.log("🎉 Sample company added successfully!");
  }

  /**
   * Clear all data (use with caution!)
   */
  static async clearDatabase(sequelize: Sequelize): Promise<void> {
    console.log("🗑️  Clearing database...");

    // For SQLite, disable foreign key checks temporarily
    if (sequelize.getDialect() === 'sqlite') {
      await sequelize.query('PRAGMA foreign_keys = OFF');
    }

    try {
      // Delete all records (order doesn't matter with FK checks disabled)
      await Transaction.destroy({ where: {}, truncate: false, force: true });
      await SalePayment.destroy({ where: {}, truncate: false, force: true });
      await SaleItem.destroy({ where: {}, truncate: false, force: true });
      await PurchasePayment.destroy({ where: {}, truncate: false, force: true });
      await PurchaseItem.destroy({ where: {}, truncate: false, force: true });
      await Sale.destroy({ where: {}, truncate: false, force: true });
      await Purchase.destroy({ where: {}, truncate: false, force: true });
      await Batch.destroy({ where: {}, truncate: false, force: true });
      await Customer.destroy({ where: {}, truncate: false, force: true });
      await Area.destroy({ where: {}, truncate: false, force: true });
      await Product.destroy({ where: {}, truncate: false, force: true });
      await Account.destroy({ where: {}, truncate: false, force: true });
      await Vendor.destroy({ where: {}, truncate: false, force: true });
      await User.destroy({ where: {}, truncate: false, force: true });
      await Company.destroy({ where: {}, truncate: false, force: true });
    } finally {
      // Re-enable foreign key checks
      if (sequelize.getDialect() === 'sqlite') {
        await sequelize.query('PRAGMA foreign_keys = ON');
      }
    }

    console.log("✅ Database cleared");
  }
}

