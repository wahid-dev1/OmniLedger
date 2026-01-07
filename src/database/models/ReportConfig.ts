/**
 * ReportConfig Model
 * Custom Reporting
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface ReportConfigAttributes {
  id: string;
  name: string;
  description?: string | null;
  queryConfig: string; // Store dynamic query configuration as JSON string
  columns: string; // Selected columns as JSON string
  filters: string; // Applied filters as JSON string
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ReportConfig extends Model<ReportConfigAttributes> implements ReportConfigAttributes {
  public id!: string;
  public name!: string;
  public description?: string | null;
  public queryConfig!: string;
  public columns!: string;
  public filters!: string;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeReportConfig(sequelize: Sequelize): void {
  ReportConfig.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      queryConfig: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      columns: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      filters: {
        type: DataTypes.TEXT,
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
      tableName: 'report_configs',
      modelName: 'ReportConfig',
    }
  );
}

