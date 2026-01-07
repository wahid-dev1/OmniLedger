/**
 * ImportExportTemplate Model
 * Excel Import/Export Templates
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface ImportExportTemplateAttributes {
  id: string;
  name: string;
  type: string; // import or export
  entityType: string; // product, inventory, sale, ledger, customer, vendor
  columnMapping: string; // Map Excel columns to DB fields as JSON string
  fieldMapping: string; // Additional field configurations as JSON string
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ImportExportTemplate extends Model<ImportExportTemplateAttributes> implements ImportExportTemplateAttributes {
  public id!: string;
  public name!: string;
  public type!: string;
  public entityType!: string;
  public columnMapping!: string;
  public fieldMapping!: string;
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeImportExportTemplate(sequelize: Sequelize): void {
  ImportExportTemplate.init(
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
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      columnMapping: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      fieldMapping: {
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
      tableName: 'import_export_templates',
      modelName: 'ImportExportTemplate',
    }
  );
}

