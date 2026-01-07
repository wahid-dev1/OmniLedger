/**
 * Company Service
 * Handles company-related business logic
 */

import { Sequelize } from 'sequelize';
import { Company, User, Product, Batch, Sale, Customer, Vendor, Account, Transaction } from '../database';

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
      currency: data.currency || 'PKR',
    } as any);
  }
}
