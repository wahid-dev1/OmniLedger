/**
 * Sale Model
 * Sales & Returns
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SaleAttributes {
  id: string;
  saleNumber: string;
  customerId?: string | null;
  companyId: string;
  totalAmount: number; // Decimal stored as number
  paidAmount: number; // Total amount paid (sum of all payments)
  status: string; // in_progress, completed, returned, partial_return
  paymentType: string; // cash, bank, cod
  saleDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Sale extends Model<SaleAttributes> implements SaleAttributes {
  public id!: string;
  public saleNumber!: string;
  public customerId?: string | null;
  public companyId!: string;
  public totalAmount!: number;
  public paidAmount!: number;
  public status!: string;
  public paymentType!: string;
  public saleDate!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeSale(sequelize: Sequelize): void {
  Sale.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      saleNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'customers',
          key: 'id',
        },
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
      saleDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
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
      tableName: 'sales',
      modelName: 'Sale',
      indexes: [
        {
          unique: true,
          fields: ['companyId', 'saleNumber'],
        },
      ],
    }
  );
}

