/**
 * SalePayment Model
 * Track partial payments
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SalePaymentAttributes {
  id: string;
  saleId: string;
  amount: number; // Decimal stored as number
  paymentDate: Date;
  paymentType: string; // cash, bank, cod
  notes?: string | null;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SalePayment extends Model<SalePaymentAttributes> implements SalePaymentAttributes {
  public id!: string;
  public saleId!: string;
  public amount!: number;
  public paymentDate!: Date;
  public paymentType!: string;
  public notes?: string | null;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeSalePayment(sequelize: Sequelize): void {
  SalePayment.init(
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
      tableName: 'sale_payments',
      modelName: 'SalePayment',
    }
  );
}

