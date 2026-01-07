/**
 * Company Model
 * Multi-tenancy: Company structure
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface CompanyAttributes {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  currency: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Company extends Model<CompanyAttributes> implements CompanyAttributes {
  public id!: string;
  public name!: string;
  public address?: string | null;
  public phone?: string | null;
  public email?: string | null;
  public currency!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeCompany(sequelize: Sequelize): void {
  Company.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: 'PKR',
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'companies',
      modelName: 'Company',
    }
  );
}

