/**
 * Schema Version Model
 * Tracks database schema version for migration detection
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SchemaVersionAttributes {
  id: string;
  version: string; // e.g., "1.0.0", "1.1.0"
  description?: string | null;
  appliedAt: Date;
  companyId?: string | null; // Optional: for multi-company setups, null means global schema
  createdAt?: Date;
  updatedAt?: Date;
}

export class SchemaVersion extends Model<SchemaVersionAttributes> implements SchemaVersionAttributes {
  public id!: string;
  public version!: string;
  public description?: string | null;
  public appliedAt!: Date;
  public companyId?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export function initializeSchemaVersion(sequelize: Sequelize): void {
  SchemaVersion.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      version: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      appliedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'SET NULL',
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
      tableName: 'schema_versions',
      modelName: 'SchemaVersion',
      indexes: [
        {
          unique: true,
          fields: ['version', 'companyId'],
        },
      ],
    }
  );
}

