/**
 * User Model
 * User with database configuration
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import { Company } from './Company';

export interface UserAttributes {
  id: string;
  email: string;
  name: string;
  password: string; // Will be hashed
  role: string; // admin, manager, cashier
  companyId: string;
  // Database configuration for this user
  dbType?: string | null; // sqlite, postgresql, mysql, mssql
  dbHost?: string | null;
  dbPort?: number | null;
  dbDatabase?: string | null;
  dbUsername?: string | null;
  dbPassword?: string | null; // Encrypted
  dbConnectionString?: string | null; // For SQLite or custom connections
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public name!: string;
  public password!: string;
  public role!: string;
  public companyId!: string;
  public dbType?: string | null;
  public dbHost?: string | null;
  public dbPort?: number | null;
  public dbDatabase?: string | null;
  public dbUsername?: string | null;
  public dbPassword?: string | null;
  public dbConnectionString?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relations
  public Company?: Company;
}

export function initializeUser(sequelize: Sequelize): void {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: 'cashier',
        allowNull: false,
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
      dbType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dbHost: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dbPort: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      dbDatabase: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dbUsername: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dbPassword: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dbConnectionString: {
        type: DataTypes.STRING,
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
      tableName: 'users',
      modelName: 'User',
    }
  );
}

