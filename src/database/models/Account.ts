/**
 * Account Model
 * Financials & Double-Entry Ledger
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface AccountAttributes {
  id: string;
  code: string;
  name: string;
  type: string; // asset, liability, equity, income, expense
  parentId?: string | null; // For hierarchical chart of accounts
  companyId: string;
  balance: number; // Decimal stored as number
  createdAt?: Date;
  updatedAt?: Date;
}

export class Account extends Model<AccountAttributes> implements AccountAttributes {
  public id!: string;
  public code!: string;
  public name!: string;
  public type!: string;
  public parentId?: string | null;
  public companyId!: string;
  public balance!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeAccount(sequelize: Sequelize): void {
  Account.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'accounts',
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
      balance: {
        type: DataTypes.DECIMAL(19, 4),
        allowNull: false,
        defaultValue: 0,
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
      tableName: 'accounts',
      modelName: 'Account',
      indexes: [
        {
          unique: true,
          fields: ['companyId', 'code'],
        },
      ],
    }
  );
}

