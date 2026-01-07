/**
 * Customer Model
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface CustomerAttributes {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  areaCode?: string | null;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Customer extends Model<CustomerAttributes> implements CustomerAttributes {
  public id!: string;
  public name!: string;
  public email?: string | null;
  public phone?: string | null;
  public address?: string | null;
  public areaCode?: string | null;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeCustomer(sequelize: Sequelize): void {
  Customer.init(
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
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      areaCode: {
        type: DataTypes.STRING,
        allowNull: true,
        // Note: No foreign key constraint here because areas.code is not unique alone
        // The relationship is handled in relationships.ts with constraints: false
        // This allows areaCode to reference areas.code without a database-level constraint
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
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
      tableName: 'customers',
      modelName: 'Customer',
    }
  );
}

