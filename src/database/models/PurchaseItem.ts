/**
 * PurchaseItem Model
 * Products purchased from vendor that create batches
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface PurchaseItemAttributes {
  id: string;
  purchaseId: string;
  productId: string;
  batchId: string; // Unique - Each purchase item creates a unique batch
  quantity: number;
  unitPrice: number; // Decimal stored as number
  totalPrice: number; // Decimal stored as number
  batchNumber: string; // Batch number for this purchase
  manufacturingDate?: Date | null;
  expiryDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PurchaseItem extends Model<PurchaseItemAttributes> implements PurchaseItemAttributes {
  public id!: string;
  public purchaseId!: string;
  public productId!: string;
  public batchId!: string;
  public quantity!: number;
  public unitPrice!: number;
  public totalPrice!: number;
  public batchNumber!: string;
  public manufacturingDate?: Date | null;
  public expiryDate?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializePurchaseItem(sequelize: Sequelize): void {
  PurchaseItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      purchaseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'purchases',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'RESTRICT',
      },
      batchId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'batches',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(19, 4),
        allowNull: false,
      },
      totalPrice: {
        type: DataTypes.DECIMAL(19, 4),
        allowNull: false,
      },
      batchNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      manufacturingDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
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
      tableName: 'purchase_items',
      modelName: 'PurchaseItem',
    }
  );
}

