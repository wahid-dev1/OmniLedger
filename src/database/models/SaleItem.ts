/**
 * SaleItem Model
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SaleItemAttributes {
  id: string;
  saleId: string;
  productId: string;
  batchId: string;
  quantity: number;
  unitPrice: number; // Decimal stored as number
  totalPrice: number; // Decimal stored as number
  createdAt?: Date;
  updatedAt?: Date;
}

export class SaleItem extends Model<SaleItemAttributes> implements SaleItemAttributes {
  public id!: string;
  public saleId!: string;
  public productId!: string;
  public batchId!: string;
  public quantity!: number;
  public unitPrice!: number;
  public totalPrice!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeSaleItem(sequelize: Sequelize): void {
  SaleItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      saleId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'sales',
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
        references: {
          model: 'batches',
          key: 'id',
        },
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
      tableName: 'sale_items',
      modelName: 'SaleItem',
    }
  );
}

