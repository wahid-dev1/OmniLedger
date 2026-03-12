/**
 * Company Service
 * Handles company-related business logic
 */

import { Sequelize } from 'sequelize';
import { DEFAULT_CURRENCY } from '../shared/constants';
import {
  Company,
  User,
  Product,
  Batch,
  Area,
  Customer,
  Vendor,
  Account,
  Sale,
  SaleItem,
  SalePayment,
  Purchase,
  PurchaseItem,
  PurchasePayment,
  Transaction,
  ReportConfig,
  ImportExportTemplate,
} from '../database';

export class CompanyService {
  /**
   * Get all companies with statistics
   */
  static async getAllCompanies(_sequelize: Sequelize) {
    const companies = await Company.findAll({
      order: [['createdAt', 'DESC']],
      raw: false,
    });

    // Get counts for each company
    const companiesWithCounts = await Promise.all(
      companies.map(async (company) => {
        const [usersCount, productsCount, batchesCount, salesCount, customersCount, vendorsCount, accountsCount, transactionsCount] = await Promise.all([
          User.count({ where: { companyId: company.id } }),
          Product.count({ where: { companyId: company.id } }),
          Batch.count({ where: { companyId: company.id } }),
          Sale.count({ where: { companyId: company.id } }),
          Customer.count({ where: { companyId: company.id } }),
          Vendor.count({ where: { companyId: company.id } }),
          Account.count({ where: { companyId: company.id } }),
          Transaction.count({ where: { companyId: company.id } }),
        ]);

        return {
          ...company.toJSON(),
          _count: {
            users: usersCount,
            products: productsCount,
            batches: batchesCount,
            sales: salesCount,
            customers: customersCount,
            vendors: vendorsCount,
            accounts: accountsCount,
            transactions: transactionsCount,
          },
        };
      })
    );

    return companiesWithCounts;
  }

  /**
   * Get company by ID with full details
   */
  static async getCompanyById(_sequelize: Sequelize, companyId: string) {
    const company = await Company.findByPk(companyId, {
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role'],
        },
        {
          model: Product,
          as: 'products',
          attributes: ['id', 'sku', 'name', 'category'],
          limit: 10,
          order: [['createdAt', 'DESC']],
        },
        {
          model: Customer,
          as: 'customers',
          attributes: ['id', 'name', 'email', 'phone'],
          limit: 10,
          order: [['createdAt', 'DESC']],
        },
        {
          model: Vendor,
          as: 'vendors',
          attributes: ['id', 'name', 'email', 'phone'],
          limit: 10,
          order: [['createdAt', 'DESC']],
        },
      ],
    });

    if (!company) {
      return null;
    }

    // Get counts
    const [usersCount, productsCount, batchesCount, salesCount, customersCount, vendorsCount, accountsCount, transactionsCount] = await Promise.all([
      User.count({ where: { companyId: company.id } }),
      Product.count({ where: { companyId: company.id } }),
      Batch.count({ where: { companyId: company.id } }),
      Sale.count({ where: { companyId: company.id } }),
      Customer.count({ where: { companyId: company.id } }),
      Vendor.count({ where: { companyId: company.id } }),
      Account.count({ where: { companyId: company.id } }),
      Transaction.count({ where: { companyId: company.id } }),
    ]);

    return {
      ...company.toJSON(),
      _count: {
        users: usersCount,
        products: productsCount,
        batches: batchesCount,
        sales: salesCount,
        customers: customersCount,
        vendors: vendorsCount,
        accounts: accountsCount,
        transactions: transactionsCount,
      },
    };
  }

  /**
   * Update an existing company
   */
  static async updateCompany(
    _sequelize: Sequelize,
    companyId: string,
    data: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
      currency?: string;
    }
  ) {
    const company = await Company.findByPk(companyId);
    if (!company) {
      return null;
    }
    await company.update({
      name: data.name,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      currency: data.currency || DEFAULT_CURRENCY,
    });
    return company;
  }

  /**
   * Create a new company
   */
  static async createCompany(
    _sequelize: Sequelize,
    data: {
      name: string;
      address?: string;
      phone?: string;
      email?: string;
      currency?: string;
    }
  ) {
    return await Company.create({
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      currency: data.currency || DEFAULT_CURRENCY,
    } as any);
  }

  /**
   * Delete a company and all its related data
   *
   * This is a destructive operation. It deletes all rows scoped to the companyId
   * in a safe order to avoid FK constraint failures on non-SQLite databases.
   */
  static async deleteCompany(sequelize: Sequelize, companyId: string): Promise<{ deleted: boolean }> {
    const company = await Company.findByPk(companyId);
    if (!company) {
      return { deleted: false };
    }

    const isSqlite = sequelize.getDialect() === 'sqlite';

    // For SQLite: PRAGMA foreign_keys must be set before any transaction, on the same connection.
    // Use raw SQL deletes with PRAGMA to avoid FK mismatch (customers.areaCode -> areas.code).
    if (isSqlite) {
      const run = (sql: string, replacements?: Record<string, string>) =>
        sequelize.query(sql, { replacements: replacements || { companyId } });

      await run('PRAGMA foreign_keys = OFF');
      try {
        await run('DELETE FROM sale_items WHERE saleId IN (SELECT id FROM sales WHERE companyId = :companyId)');
        await run('DELETE FROM sale_payments WHERE saleId IN (SELECT id FROM sales WHERE companyId = :companyId)');
        await run('DELETE FROM transactions WHERE companyId = :companyId');
        await run('DELETE FROM sales WHERE companyId = :companyId');
        await run('DELETE FROM purchase_items WHERE purchaseId IN (SELECT id FROM purchases WHERE companyId = :companyId)');
        await run('DELETE FROM purchase_payments WHERE purchaseId IN (SELECT id FROM purchases WHERE companyId = :companyId)');
        await run('DELETE FROM purchases WHERE companyId = :companyId');
        await run('DELETE FROM batches WHERE companyId = :companyId');
        await run('DELETE FROM products WHERE companyId = :companyId');
        await run('DELETE FROM customers WHERE companyId = :companyId');
        await run('DELETE FROM vendors WHERE companyId = :companyId');
        await run('DELETE FROM areas WHERE companyId = :companyId');
        await run('DELETE FROM accounts WHERE companyId = :companyId');
        await run('DELETE FROM report_configs WHERE companyId = :companyId');
        await run('DELETE FROM import_export_templates WHERE companyId = :companyId');
        await run('DELETE FROM users WHERE companyId = :companyId');
        await run('DELETE FROM companies WHERE id = :companyId', { companyId });
        return { deleted: true };
      } finally {
        await run('PRAGMA foreign_keys = ON');
      }
    }

    // Non-SQLite (PostgreSQL, MySQL, etc.): use transaction with model deletes
    await sequelize.transaction(async (tx) => {
      const sales = await Sale.findAll({ attributes: ['id'], where: { companyId }, transaction: tx });
      const saleIds = sales.map((s) => s.id);
      if (saleIds.length > 0) {
        await SaleItem.destroy({ where: { saleId: saleIds }, transaction: tx } as any);
        await SalePayment.destroy({ where: { saleId: saleIds }, transaction: tx } as any);
      }

      const purchases = await Purchase.findAll({ attributes: ['id'], where: { companyId }, transaction: tx });
      const purchaseIds = purchases.map((p) => p.id);
      if (purchaseIds.length > 0) {
        await PurchaseItem.destroy({ where: { purchaseId: purchaseIds }, transaction: tx } as any);
        await PurchasePayment.destroy({ where: { purchaseId: purchaseIds }, transaction: tx } as any);
      }

      await Transaction.destroy({ where: { companyId }, transaction: tx } as any);
      await Sale.destroy({ where: { companyId }, transaction: tx } as any);
      await Purchase.destroy({ where: { companyId }, transaction: tx } as any);
      await Batch.destroy({ where: { companyId }, transaction: tx } as any);
      await Product.destroy({ where: { companyId }, transaction: tx } as any);
      await Customer.destroy({ where: { companyId }, transaction: tx } as any);
      await Vendor.destroy({ where: { companyId }, transaction: tx } as any);
      await Area.destroy({ where: { companyId }, transaction: tx } as any);
      await Account.destroy({ where: { companyId }, transaction: tx } as any);
      await ReportConfig.destroy({ where: { companyId }, transaction: tx } as any);
      await ImportExportTemplate.destroy({ where: { companyId }, transaction: tx } as any);
      await User.destroy({ where: { companyId }, transaction: tx } as any);
      await Company.destroy({ where: { id: companyId }, transaction: tx } as any);
    });
    return { deleted: true };
  }
}
