/**
 * Transaction Model
 * Double-Entry Ledger Transactions
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface TransactionAttributes {
  id: string;
  transactionNumber: string;
  description: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number; // Decimal stored as number
  saleId?: string | null; // Link to sale if applicable
  purchaseId?: string | null; // Link to purchase if applicable
  companyId: string;
  transactionDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Transaction extends Model<TransactionAttributes> implements TransactionAttributes {
  public id!: string;
  public transactionNumber!: string;
  public description!: string;
  public debitAccountId!: string;
  public creditAccountId!: string;
  public amount!: number;
  public saleId?: string | null;
  public purchaseId?: string | null;
  public companyId!: string;
  public transactionDate!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeTransaction(sequelize: Sequelize): void {
  Transaction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      transactionNumber: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      debitAccountId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'accounts',
          key: 'id',
        },
      },
      creditAccountId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'accounts',
          key: 'id',
        },
      },
      amount: {
        type: DataTypes.DECIMAL(19, 4),
        allowNull: false,
      },
      saleId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'sales',
          key: 'id',
        },
      },
      purchaseId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'purchases',
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
      transactionDate: {
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
      tableName: 'transactions',
      modelName: 'Transaction',
      indexes: [
        {
          unique: true,
          fields: ['companyId', 'transactionNumber'],
        },
      ],
    }
  );
}

