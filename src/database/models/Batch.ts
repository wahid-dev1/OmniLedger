/**
 * Batch Model
 * Batch Tracking - Critical for inventory management
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface BatchAttributes {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  availableQuantity: number; // Available for sale
  manufacturingDate?: Date | null;
  expiryDate?: Date | null;
  purchasePrice?: number | null; // Decimal stored as number
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Batch extends Model<BatchAttributes> implements BatchAttributes {
  public id!: string;
  public productId!: string;
  public batchNumber!: string;
  public quantity!: number;
  public availableQuantity!: number;
  public manufacturingDate?: Date | null;
  public expiryDate?: Date | null;
  public purchasePrice?: number | null;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeBatch(sequelize: Sequelize): void {
  Batch.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      batchNumber: {
        type: DataTypes.STRING,
        allowNull: false,
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
      manufacturingDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      purchasePrice: {
        type: DataTypes.DECIMAL(19, 4),
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
      tableName: 'batches',
      modelName: 'Batch',
      indexes: [
        {
          unique: true,
          fields: ['productId', 'batchNumber', 'companyId'],
        },
      ],
    }
  );
}

