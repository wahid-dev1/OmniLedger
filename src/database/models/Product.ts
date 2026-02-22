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
  trackByBatch: boolean; // true = stock tracked per batch, false = stock at item level
  unitOfMeasurement?: string | null; // e.g. pcs, kg, liter, box
  unitPrice?: number | null; // Retail/unit price (used when trackByBatch=false for sales)
  quantity: number; // Item-level stock (used when trackByBatch=false)
  availableQuantity: number; // Item-level available stock (used when trackByBatch=false)
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
  public trackByBatch!: boolean;
  public unitOfMeasurement?: string | null;
  public unitPrice?: number | null;
  public quantity!: number;
  public availableQuantity!: number;
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
      trackByBatch: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      unitOfMeasurement: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(19, 4),
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      availableQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

