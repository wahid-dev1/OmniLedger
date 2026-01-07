/**
 * Vendor Model
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface VendorAttributes {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Vendor extends Model<VendorAttributes> implements VendorAttributes {
  public id!: string;
  public name!: string;
  public email?: string | null;
  public phone?: string | null;
  public address?: string | null;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeVendor(sequelize: Sequelize): void {
  Vendor.init(
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
      tableName: 'vendors',
      modelName: 'Vendor',
    }
  );
}

