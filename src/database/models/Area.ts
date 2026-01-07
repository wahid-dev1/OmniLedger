/**
 * Area Model
 * Area Lookup Table
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface AreaAttributes {
  id: string;
  code: string;
  name: string;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Area extends Model<AreaAttributes> implements AreaAttributes {
  public id!: string;
  public code!: string;
  public name!: string;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeArea(sequelize: Sequelize): void {
  Area.init(
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
      tableName: 'areas',
      modelName: 'Area',
      indexes: [
        {
          unique: true,
          fields: ['companyId', 'code'],
        },
      ],
    }
  );
}

