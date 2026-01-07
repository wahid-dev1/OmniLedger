/**
 * PurchasePayment Model
 * Track partial payments to vendors
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface PurchasePaymentAttributes {
  id: string;
  purchaseId: string;
  amount: number; // Decimal stored as number
  paymentDate: Date;
  paymentType: string; // cash, bank, credit
  notes?: string | null;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PurchasePayment extends Model<PurchasePaymentAttributes> implements PurchasePaymentAttributes {
  public id!: string;
  public purchaseId!: string;
  public amount!: number;
  public paymentDate!: Date;
  public paymentType!: string;
  public notes?: string | null;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializePurchasePayment(sequelize: Sequelize): void {
  PurchasePayment.init(
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
      amount: {
        type: DataTypes.DECIMAL(19, 4),
        allowNull: false,
      },
      paymentDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
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
      tableName: 'purchase_payments',
      modelName: 'PurchasePayment',
    }
  );
}

