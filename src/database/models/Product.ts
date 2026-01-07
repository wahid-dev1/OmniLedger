/**
 * Product Model
 * Product Management
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface ProductAttributes {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  vendorId?: string | null; // Optional: Product can be linked to a vendor
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Product extends Model<ProductAttributes> implements ProductAttributes {
  public id!: string;
  public sku!: string;
  public name!: string;
  public description?: string | null;
  public category?: string | null;
  public vendorId?: string | null;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeProduct(sequelize: Sequelize): void {
  Product.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'vendors',
          key: 'id',
        },
        onDelete: 'SET NULL',
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
      tableName: 'products',
      modelName: 'Product',
      indexes: [
        {
          unique: true,
          fields: ['companyId', 'sku'],
        },
      ],
    }
  );
}

