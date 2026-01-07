/**
 * Purchase Model
 * Vendor purchases that add inventory
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface PurchaseAttributes {
  id: string;
  purchaseNumber: string;
  vendorId: string;
  companyId: string;
  totalAmount: number; // Decimal stored as number
  paidAmount: number; // Total amount paid (sum of all payments)
  purchaseDate: Date;
  status: string; // completed, pending, cancelled
  paymentType: string; // cash, bank, credit
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Purchase extends Model<PurchaseAttributes> implements PurchaseAttributes {
  public id!: string;
  public purchaseNumber!: string;
  public vendorId!: string;
  public companyId!: string;
  public totalAmount!: number;
  public paidAmount!: number;
  public purchaseDate!: Date;
  public status!: string;
  public paymentType!: string;
  public notes?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializePurchase(sequelize: Sequelize): void {
  Purchase.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      purchaseNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'vendors',
          key: 'id',
        },
        onDelete: 'RESTRICT',
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
      totalAmount: {
        type: DataTypes.DECIMAL(19, 4),
        allowNull: false,
        defaultValue: 0,
      },
      paidAmount: {
        type: DataTypes.DECIMAL(19, 4),
        allowNull: false,
        defaultValue: 0,
      },
      purchaseDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: 'completed',
        allowNull: false,
      },
      paymentType: {
        type: DataTypes.STRING,
        defaultValue: 'cash',
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
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
      tableName: 'purchases',
      modelName: 'Purchase',
      indexes: [
        {
          unique: true,
          fields: ['companyId', 'purchaseNumber'],
        },
      ],
    }
  );
}

