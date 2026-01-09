// Electron main process - Database operations using Sequelize
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { Op, Sequelize } from "sequelize";
import { CompanyService } from "../services/company.service";
import { DatabaseService } from "../services/database.service";
import {
  CURRENT_SCHEMA_VERSION,
  DatabaseMigrationService,
} from "../services/database-migration.service";
import { SeedService } from "../services/seed.service";
import type { DatabaseConfig } from "../shared/types";
import { SequelizeConfig } from "../database/sequelize.config";
import { initializeAllModels } from "../database/models/relationships";
// Import all models
import { Company } from "../database/models/Company";
import { Product } from "../database/models/Product";
import { Batch } from "../database/models/Batch";
import { Area } from "../database/models/Area";
import { Customer } from "../database/models/Customer";
import { Vendor } from "../database/models/Vendor";
import { Purchase } from "../database/models/Purchase";
import { PurchaseItem } from "../database/models/PurchaseItem";
import { PurchasePayment } from "../database/models/PurchasePayment";
import { Sale } from "../database/models/Sale";
import { SaleItem } from "../database/models/SaleItem";
import { SalePayment } from "../database/models/SalePayment";
import { Account } from "../database/models/Account";
import { Transaction } from "../database/models/Transaction";
// ReportConfig and ImportExportTemplate models imported but not directly used in main.ts

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Suppress SSL certificate errors in development (harmless warnings)
if (isDev) {
  app.commandLine.appendSwitch('--ignore-certificate-errors');
  app.commandLine.appendSwitch('--ignore-ssl-errors');
}

function createWindow() {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: "default",
    show: false,
  });

  // Load the app
  if (isDev) {
    const url = "http://localhost:5173";
    console.log("Loading URL:", url);
    mainWindow.loadURL(url).catch((err) => {
      console.error("Failed to load URL:", err);
    });
  } else {
    // In production, the renderer files are in dist/ directory
    // Use loadURL with file:// protocol to ensure proper base path for relative assets
    const htmlPath = path.join(__dirname, "..", "..", "dist", "index.html");
    console.log("Production mode - Loading HTML from:", htmlPath);
    console.log("__dirname:", __dirname);
    console.log("app.getAppPath():", app.getAppPath());
    
    // Verify the file exists before loading
    if (fs.existsSync(htmlPath)) {
      console.log("HTML file found, loading with file:// URL...");
      // Use loadURL with file:// protocol to ensure relative asset paths resolve correctly
      // pathToFileURL properly formats the path for cross-platform compatibility
      const fileUrl = pathToFileURL(htmlPath).href;
      console.log("File URL:", fileUrl);
      mainWindow.loadURL(fileUrl).catch((err) => {
        console.error("Failed to load URL:", err);
        // Fallback to loadFile if loadURL fails
        mainWindow.loadFile(htmlPath).catch((loadFileErr) => {
          console.error("Failed to load file:", loadFileErr);
        });
      });
    } else {
      // Try alternative path - sometimes app.getAppPath() works better when packaged
      const altPath = path.join(app.getAppPath(), "dist", "index.html");
      console.log("HTML not found at primary path, trying:", altPath);
      if (fs.existsSync(altPath)) {
        const altFileUrl = pathToFileURL(altPath).href;
        console.log("Alternative file URL:", altFileUrl);
        mainWindow.loadURL(altFileUrl).catch((err) => {
          console.error("Failed to load URL from alternative path:", err);
          mainWindow.loadFile(altPath).catch((loadFileErr) => {
            console.error("Failed to load file:", loadFileErr);
          });
        });
      } else {
        console.error("ERROR: HTML file not found at either path!");
        console.error("Primary path:", htmlPath);
        console.error("Alternative path:", altPath);
      }
    }
    
    // Enhanced error logging for debugging
    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      console.error("Failed to load:", {
        errorCode,
        errorDescription,
        url: validatedURL,
        isMainFrame
      });
    });
    
    // Log console messages from renderer
    mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      const levelName = level === 0 ? "DEBUG" : level === 1 ? "INFO" : level === 2 ? "WARN" : "ERROR";
      console.log(`[Renderer ${levelName}]`, message, sourceId ? `(${sourceId}:${line})` : "");
    });
  }

  // Handle errors
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error("Failed to load:", errorCode, errorDescription);
  });

  mainWindow.once("ready-to-show", () => {
    console.log("Window ready to show");
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Initialize database connection with saved config (if available)
  await initializeDatabaseConnection();
  
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC Handlers for database operations
// Helper function to get default SQLite database path
// Uses app.getPath('userData') in production for proper directory
const getDefaultDbPath = (): string => {
  if (app.isReady()) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'data', 'omniledger.db');
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return dbPath;
  }
  // Fallback for when app is not ready yet
  return './data/omniledger.db';
};

// Default SQLite connection for the app
// TODO: Make this work with runtime database configuration per user
const getDefaultDbConfig = (): DatabaseConfig => ({
  type: "sqlite",
  connectionString: getDefaultDbPath(),
});

// Store the active database configuration (set by user via UI)
// This is used when recreating connections after they're closed
let activeDbConfig: DatabaseConfig | null = null;

// Path to store the active database config
const getConfigFilePath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'active-db-config.json');
};

// Load active database config from file
const loadActiveDbConfig = (): DatabaseConfig | null => {
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as DatabaseConfig;
      console.log('Loaded active database config from file:', {
        type: config.type,
        ...(config.type === 'sqlite' 
          ? { connectionString: config.connectionString }
          : { host: config.host, database: config.database })
      });
      return config;
    }
  } catch (error) {
    console.error('Failed to load active database config:', error);
  }
  return null;
};

// Save active database config to file
const saveActiveDbConfig = (config: DatabaseConfig | null): void => {
  try {
    const configPath = getConfigFilePath();
    if (config) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log('Saved active database config to file');
    } else {
      // Remove config file if config is null
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        console.log('Removed active database config file');
      }
    }
  } catch (error) {
    console.error('Failed to save active database config:', error);
  }
};

// Create default Sequelize instance
// Note: Using 'let' instead of 'const' so we can recreate it if the connection is closed
let defaultSequelize: Sequelize;

// Initialize database connection with saved config or default
const initializeDatabaseConnection = async () => {
  try {
    // Load saved config (app must be ready for app.getPath to work)
    const savedActiveConfig: DatabaseConfig | null = app.isReady() ? loadActiveDbConfig() : null;
    if (savedActiveConfig) {
      activeDbConfig = savedActiveConfig;
    }
    
    // Use saved config if available, otherwise use default SQLite
    // Get default config dynamically to ensure proper path resolution
    const configToUse = savedActiveConfig || getDefaultDbConfig();
    
    // Create Sequelize instance with the appropriate config
    defaultSequelize = SequelizeConfig.createSequelize(configToUse);
    initializeAllModels(defaultSequelize);
    
    // Authenticate and sync
    await defaultSequelize.authenticate();
    console.log(`Database connection established (${configToUse.type}).`);
    
    // Sync models to create tables if they don't exist
    await defaultSequelize.sync({ alter: false, force: false });
    console.log('Database schema synchronized.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // If saved config fails, fall back to default SQLite
    const savedConfig = loadActiveDbConfig();
    if (savedConfig) {
      console.log('Falling back to default SQLite connection...');
      try {
        const fallbackConfig = getDefaultDbConfig();
        defaultSequelize = SequelizeConfig.createSequelize(fallbackConfig);
        initializeAllModels(defaultSequelize);
        await defaultSequelize.authenticate();
        console.log('Default SQLite connection established.');
        await defaultSequelize.sync({ alter: false, force: false });
        // Clear the saved config since it failed
        activeDbConfig = null;
        saveActiveDbConfig(null);
      } catch (fallbackError) {
        console.error('Failed to initialize default database:', fallbackError);
        // Don't throw - allow app to start even if DB init fails
        // User can configure database later through the UI
      }
    }
  }
};

// Helper function to generate the next unique transaction number for a company
// Uses MAX query to find the highest transaction number, then increments
async function generateNextTransactionNumber(
  sequelize: any,
  companyId: string,
  transaction?: any,
  startNumber: number = 1
): Promise<string> {
  const { Transaction } = await import("../database/models/Transaction");
  
  try {
    // Query for the maximum transaction number for this company
    const result = await sequelize.query(
      `SELECT MAX(CAST(SUBSTR(transactionNumber, 5) AS INTEGER)) as maxNum 
       FROM transactions 
       WHERE companyId = :companyId AND transactionNumber LIKE 'TXN-%'`,
      {
        replacements: { companyId },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const maxNum = result[0]?.maxNum;
    const nextNum = maxNum ? maxNum + startNumber : startNumber;
    
    return `TXN-${String(nextNum).padStart(4, "0")}`;
  } catch (error) {
    // Fallback: if query fails, try finding the last transaction
    const lastTransaction = await Transaction.findOne({
      where: { companyId },
      order: [['transactionNumber', 'DESC']],
      transaction,
    });

    if (lastTransaction) {
      const lastNum = parseInt(lastTransaction.transactionNumber.split("-")[1] || "0");
      return `TXN-${String(lastNum + startNumber).padStart(4, "0")}`;
    }

    return `TXN-${String(startNumber).padStart(4, "0")}`;
  }
}

// Helper function to update account balance based on transaction
// In double-entry accounting:
// - Assets & Expenses: Debit increases, Credit decreases
// - Liabilities, Equity, Income: Debit decreases, Credit increases
// Includes retry logic for SQLite busy errors
async function updateAccountBalance(
  _sequelize: any,
  accountId: string,
  amount: number,
  isDebit: boolean,
  transaction?: any,
  retries: number = 3
): Promise<void> {
  const { Account } = await import("../database/models/Account");
  
  try {
    const account = await Account.findByPk(accountId, { transaction });

    if (!account) return;

    const accountJson = account.toJSON();
    const currentBalance = typeof accountJson.balance === 'number'
      ? accountJson.balance
      : parseFloat(String(accountJson.balance || 0));

    let newBalance: number;

    // Determine if this account type increases with debits or credits
    if (account.type === "asset" || account.type === "expense") {
      // Assets and Expenses: Debit increases, Credit decreases
      newBalance = isDebit ? currentBalance + amount : currentBalance - amount;
    } else {
      // Liabilities, Equity, Income: Debit decreases, Credit increases
      newBalance = isDebit ? currentBalance - amount : currentBalance + amount;
    }

    await account.update({ balance: newBalance }, { transaction });
  } catch (error: any) {
    // Retry on SQLite busy errors
    if (
      error?.parent?.code === 'SQLITE_BUSY' ||
      error?.original?.code === 'SQLITE_BUSY' ||
      error?.name === 'SequelizeTimeoutError'
    ) {
      if (retries > 0) {
        // Wait a random amount between 50-200ms before retrying (exponential backoff)
        const delay = Math.random() * 150 + 50;
        await new Promise(resolve => setTimeout(resolve, delay));
        return updateAccountBalance(_sequelize, accountId, amount, isDebit, transaction, retries - 1);
      }
    }
    throw error;
  }
}

// Helper function to recreate the default database connection
// This should only be called when we detect the connection manager is closed
// Uses the active database configuration if available, otherwise falls back to default SQLite
async function recreateDefaultConnection(): Promise<Sequelize> {
  console.warn('Default database connection was closed, recreating...');
  try {
    // Use active config if available, otherwise use default SQLite config
    const configToUse = activeDbConfig || getDefaultDbConfig();
    
    console.log('Recreating connection with config:', {
      type: configToUse.type,
      ...(configToUse.type === 'sqlite' 
        ? { connectionString: configToUse.connectionString }
        : { host: configToUse.host, database: configToUse.database })
    });
    
    // Recreate the Sequelize instance with the appropriate config
    defaultSequelize = SequelizeConfig.createSequelize(configToUse);
    
    // Reinitialize all models with the new connection (this rebinds models to the new instance)
    initializeAllModels(defaultSequelize);
    
    // Authenticate the new connection
    await defaultSequelize.authenticate();
    console.log('Default database connection recreated successfully');
    
    return defaultSequelize;
  } catch (recreateError) {
    console.error('Failed to recreate default database connection:', recreateError);
    throw new Error('Database connection failed and could not be recreated');
  }
}

// Helper function to execute a database operation with automatic connection recovery
// If the connection is closed, it will recreate it and retry the operation once
async function withConnectionRecovery<T>(
  operation: (sequelize: Sequelize) => Promise<T>
): Promise<T> {
  try {
    return await operation(defaultSequelize);
  } catch (error: any) {
    // Check if this is the "connection manager closed" error
    // The error message is: "ConnectionManager.getConnection was called after the connection manager was closed!"
    const errorMessage = error?.message || '';
    if (errorMessage.includes('ConnectionManager.getConnection was called after the connection manager was closed') ||
        (errorMessage.includes('closed') && errorMessage.includes('ConnectionManager'))) {
      console.warn('Database connection was closed during operation, recreating and retrying...');
      
      // Recreate the connection
      await recreateDefaultConnection();
      
      // Retry the operation once with the new connection
      return await operation(defaultSequelize);
    }
    // For other errors, just rethrow
    throw error;
  }
}

// Get all companies
ipcMain.handle("get-companies", async () => {
  try {
    const companies = await withConnectionRecovery(async (sequelize) => {
      return await CompanyService.getAllCompanies(sequelize);
    });
    return { success: true, data: serializeForIPC(companies) };
  } catch (error) {
    console.error("Error fetching companies:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Helper function to deeply serialize data for IPC
// Uses a Set to track visited objects and prevent circular references
function serializeForIPC(data: any, visited: Set<object> = new Set()): any {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return data;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeForIPC(item, visited));
  }

  // Handle Sequelize model instances - convert to JSON first (before checking for circular refs)
  if (data && typeof data.toJSON === 'function') {
    try {
      const jsonData = data.toJSON();
      // Recursively serialize the JSON representation
      return serializeForIPC(jsonData, visited);
    } catch (e) {
      console.warn('Error calling toJSON on model instance:', e);
      // Fall through to handle as regular object
    }
  }

  // Handle circular references (check after toJSON conversion)
  if (visited.has(data)) {
    // Return a reference marker instead of the circular object
    return '[Circular]';
  }

  // Mark this object as visited
  visited.add(data);

  try {
    // Handle regular objects
    const result: any = {};
    for (const key in data) {
      // Only process own properties (not prototype chain)
      if (!data.hasOwnProperty(key)) {
        continue;
      }

      // Skip internal Sequelize/ORM properties that might cause cloning issues
      // But allow _count which is a valid data property we add
      if ((key.startsWith('_') && key !== '_count') || key === 'Model' || key === 'sequelize' || key === 'dataValues') {
        continue;
      }

      try {
        const value = data[key];
        
        // Skip functions
        if (typeof value === 'function') {
          continue;
        }

        // Skip undefined (but keep null)
        if (value === undefined) {
          continue;
        }

          // Handle Date objects
          if (value instanceof Date) {
            result[key] = value.toISOString();
            continue;
          }

          // Handle Decimal types - Sequelize returns DECIMAL as strings, but handle legacy types too
          if (value && typeof value === 'object') {
            // Check for toNumber method (legacy Prisma Decimal support)
            if (typeof value.toNumber === 'function') {
              try {
                const num = value.toNumber();
                result[key] = isNaN(num) ? 0 : num;
                continue;
              } catch {
                try {
                  result[key] = parseFloat(value.toString());
                  continue;
                } catch {
                  result[key] = 0;
                  continue;
                }
              }
            }
          }

        // Recursively serialize nested objects and arrays
        result[key] = serializeForIPC(value, visited);
      } catch (e) {
        console.warn(`Skipping property ${key} during serialization:`, e);
      }
    }
    
    return result;
  } catch (error) {
    console.error("Serialization error:", error);
    return '[Serialization Error]';
  }
}

// Get company by ID
ipcMain.handle("get-company", async (_event, companyId: string) => {
  try {
    const company = await withConnectionRecovery(async (sequelize) => {
      return await CompanyService.getCompanyById(sequelize, companyId);
    });
    
    if (!company) {
      return { success: false, error: "Company not found" };
    }
    
    // Serialize the data
    const safeData = serializeForIPC(company);
    
    return { success: true, data: safeData };
  } catch (error) {
    console.error("Error fetching company:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new company
ipcMain.handle("create-company", async (_event, data: {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
}) => {
  try {
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      return {
        success: false,
        error: "Company name is required",
      };
    }

    const company = await withConnectionRecovery(async (sequelize) => {
      return await CompanyService.createCompany(sequelize, {
        name: data.name.trim(),
        address: data.address?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        currency: data.currency?.trim() || "PKR",
      });
    });

    return { success: true, data: serializeForIPC(company) };
  } catch (error) {
    console.error("Error creating company:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get products for a company with stock information
ipcMain.handle("get-products", async (_event, companyId: string) => {
  try {
    console.log("[get-products] Fetching products for companyId:", companyId);
    
    const products = await Product.findAll({
      where: { companyId },
      include: [
        {
          model: Batch,
          as: 'batches',
          attributes: ['quantity', 'availableQuantity', 'expiryDate'],
        },
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    console.log("[get-products] Found", products.length, "products");
    if (products.length > 0) {
      const firstProductJson = products[0].toJSON();
      if ((firstProductJson as any).batches) {
        console.log("[get-products] First product has", (firstProductJson as any).batches.length, "batches");
      }
    }

    // Helper function to safely convert to number
    const toNumber = (value: any): number => {
      if (value == null) return 0;
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      // Handle Prisma Decimal
      if (value && typeof value.toNumber === 'function') {
        try {
          return value.toNumber();
        } catch {
          return 0;
        }
      }
      // Try to convert to number
      try {
        return Number(value) || 0;
      } catch {
        return 0;
      }
    };

    // Helper function to parse date from various formats
    const parseDate = (value: any): Date | null => {
      if (!value) return null;
      if (value instanceof Date) {
        // Check if date is valid
        return isNaN(value.getTime()) ? null : value;
      }
      if (typeof value === 'number') {
        // Handle Unix timestamp (both seconds and milliseconds)
        // SQLite stores dates as INTEGER (milliseconds since epoch)
        const timestamp = value > 1000000000000 ? value : value * 1000;
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? null : date;
      }
      if (typeof value === 'string') {
        // Try parsing as ISO string first
        let date = new Date(value);
        if (isNaN(date.getTime())) {
          // Try parsing as number string (Unix timestamp)
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            const timestamp = numValue > 1000000000000 ? numValue : numValue * 1000;
            date = new Date(timestamp);
          }
        }
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    };

    // Calculate stock information for each product
    const productsWithStock = products.map((product, index) => {
      let totalStock = 0;
      let availableStock = 0;
      let nearestExpiryDate: Date | null = null as Date | null;
      let hasExpiringSoon = false;

      const productJson = product.toJSON ? product.toJSON() : product;
      const batches = (productJson as any).batches || [];
      
      if (batches && batches.length > 0) {
        // Calculate total and available stock
        batches.forEach((batch: any, batchIndex: number) => {
          const qty = toNumber(batch.quantity);
          const availQty = toNumber(batch.availableQuantity);
          
          if (index === 0 && batchIndex === 0) {
            console.log(`[get-products] Processing first batch: qty=${qty}, availQty=${availQty}, expiryDate=`, batch.expiryDate, typeof batch.expiryDate);
          }
          
          totalStock += qty;
          availableStock += availQty;

          // Find nearest expiry date (only for batches with available stock)
          if (availQty > 0 && batch.expiryDate != null) {
            // Prisma should return DateTime as Date object, but handle all cases
            let expiryDate: Date | null = null;
            
            if (batch.expiryDate instanceof Date) {
              expiryDate = batch.expiryDate;
            } else {
              expiryDate = parseDate(batch.expiryDate);
            }
            
            if (expiryDate && !isNaN(expiryDate.getTime())) {
              if (!nearestExpiryDate || expiryDate < nearestExpiryDate) {
                nearestExpiryDate = expiryDate;
              }

              // Check if expiring within 30 days
              const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
                hasExpiringSoon = true;
              }
            }
          }
        });
      }

      if (index === 0) {
        console.log(`[get-products] Calculated for first product: totalStock=${totalStock}, availableStock=${availableStock}, isInStock=${availableStock > 0}, nearestExpiryDate=`, nearestExpiryDate);
      }

      // Format expiry date as ISO string
      let formattedExpiryDate: string | null = null;
      if (nearestExpiryDate instanceof Date) {
        formattedExpiryDate = nearestExpiryDate.toISOString();
      }
      
      // Explicitly construct the product object with all necessary fields
      // Convert all values to plain types to avoid serialization issues
      const productWithStock: any = {
        id: String(productJson.id),
        companyId: String(productJson.companyId),
        sku: String(productJson.sku),
        name: String(productJson.name),
        description: productJson.description ? String(productJson.description) : null,
        category: productJson.category ? String(productJson.category) : null,
        vendor: (productJson as any).vendor ? {
          id: String((productJson as any).vendor.id),
          name: String((productJson as any).vendor.name),
        } : null,
        createdAt: productJson.createdAt instanceof Date 
          ? productJson.createdAt.toISOString() 
          : String(productJson.createdAt),
        updatedAt: productJson.updatedAt instanceof Date 
          ? productJson.updatedAt.toISOString() 
          : String(productJson.updatedAt),
        // Add our calculated inventory fields explicitly as plain types
        totalStock: Number(totalStock),
        availableStock: Number(availableStock),
        isInStock: Boolean(availableStock > 0),
        nearestExpiryDate: formattedExpiryDate ? String(formattedExpiryDate) : null,
        hasExpiringSoon: Boolean(hasExpiringSoon),
      };

      if (index === 0) {
        console.log(`[get-products] Constructed product object keys:`, Object.keys(productWithStock));
        console.log(`[get-products] Product object values:`, {
          totalStock: productWithStock.totalStock,
          availableStock: productWithStock.availableStock,
          isInStock: productWithStock.isInStock,
          nearestExpiryDate: productWithStock.nearestExpiryDate,
          hasExpiringSoon: productWithStock.hasExpiringSoon,
        });
        console.log(`[get-products] Product object type check:`, {
          totalStock_type: typeof productWithStock.totalStock,
          availableStock_type: typeof productWithStock.availableStock,
          isInStock_type: typeof productWithStock.isInStock,
        });
      }

      return productWithStock;
    });

    // Debug: Log first product with stock info BEFORE serialization
    if (productsWithStock.length > 0) {
      console.log("Sample product BEFORE serialization:", {
        name: productsWithStock[0].name,
        totalStock: productsWithStock[0].totalStock,
        availableStock: productsWithStock[0].availableStock,
        isInStock: productsWithStock[0].isInStock,
        nearestExpiryDate: productsWithStock[0].nearestExpiryDate,
        hasExpiringSoon: productsWithStock[0].hasExpiringSoon,
        keys: Object.keys(productsWithStock[0]),
      });
    }

    // Since we've already converted everything to plain types, serialization should be safe
    // But let's verify the data structure before serializing
    if (productsWithStock.length > 0) {
      const first = productsWithStock[0];
      console.log("[get-products] First product before serialization - has inventory fields:", {
        hasTotalStock: 'totalStock' in first,
        hasAvailableStock: 'availableStock' in first,
        hasIsInStock: 'isInStock' in first,
        hasNearestExpiryDate: 'nearestExpiryDate' in first,
        hasHasExpiringSoon: 'hasExpiringSoon' in first,
        totalStockValue: first.totalStock,
        availableStockValue: first.availableStock,
      });
    }

    const serialized = serializeForIPC(productsWithStock);
    
    // Debug: Log first product AFTER serialization
    if (serialized && serialized.length > 0) {
      const firstProduct = serialized[0];
      console.log("[get-products] First product AFTER serialization:", {
        name: firstProduct.name,
        totalStock: firstProduct.totalStock,
        availableStock: firstProduct.availableStock,
        isInStock: firstProduct.isInStock,
        nearestExpiryDate: firstProduct.nearestExpiryDate,
        hasExpiringSoon: firstProduct.hasExpiringSoon,
        keys: Object.keys(firstProduct),
      });
      
      // Check if fields are missing
      if (firstProduct.totalStock === undefined) {
        console.error("[get-products] ERROR: totalStock is undefined after serialization!");
      }
      if (firstProduct.availableStock === undefined) {
        console.error("[get-products] ERROR: availableStock is undefined after serialization!");
      }
    } else {
      console.warn("[get-products] Serialized data is empty or invalid:", serialized);
    }

    // Ensure fields are present - add defaults if missing
    const verified = serialized.map((p: any) => {
      const verifiedProduct = {
        ...p,
        totalStock: typeof p.totalStock === 'number' ? p.totalStock : (p.totalStock ?? 0),
        availableStock: typeof p.availableStock === 'number' ? p.availableStock : (p.availableStock ?? 0),
        isInStock: typeof p.isInStock === 'boolean' ? p.isInStock : (p.availableStock > 0),
        nearestExpiryDate: p.nearestExpiryDate ?? null,
        hasExpiringSoon: typeof p.hasExpiringSoon === 'boolean' ? p.hasExpiringSoon : false,
      };
      return verifiedProduct;
    });

    console.log("[get-products] Returning", verified.length, "products with inventory data");
    if (verified.length > 0) {
      console.log("[get-products] First verified product:", {
        name: verified[0].name,
        totalStock: verified[0].totalStock,
        availableStock: verified[0].availableStock,
        isInStock: verified[0].isInStock,
      });
    }

    return { success: true, data: verified };
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get sales for a company
ipcMain.handle("get-sales", async (_event, companyId: string) => {
  try {
    const sales = await Sale.findAll({
      where: { companyId },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'areaCode'],
          include: [
            {
              model: Area,
              as: 'area',
              attributes: ['code', 'name'],
            },
          ],
        },
      ],
      order: [['saleDate', 'DESC']],
    });

    // Get item counts for each sale
    const salesWithCounts = await Promise.all(
      sales.map(async (sale) => {
        const itemCount = await SaleItem.count({ where: { saleId: sale.id } });
        const saleJson = sale.toJSON();
        return {
          ...saleJson,
          _count: { items: itemCount },
        };
      })
    );
    
    // Normalize areaCode - use area.code if areaCode is null but area exists
    // Ensure customer.id is always preserved - use customerId from sale if customer.id is missing
    const salesWithNormalizedArea = salesWithCounts.map((sale: any) => {
      const saleJson = typeof sale.toJSON === 'function' ? sale.toJSON() : sale;
      
      if (!saleJson.customer) {
        return saleJson;
      }
      
      // Get customerId from the sale's customerId field as fallback
      const saleCustomerId = saleJson.customerId;
      const customerId = saleJson.customer?.id || saleCustomerId;
      
      // Debug: Check what we're getting from Sequelize
      if (!customerId) {
        console.error("[get-sales] Customer missing id in Sequelize result:", {
          saleNumber: saleJson.saleNumber,
          saleId: saleJson.id,
          saleCustomerId: saleCustomerId,
          customer: saleJson.customer,
          customerKeys: saleJson.customer ? Object.keys(saleJson.customer) : [],
          hasCustomerId: !!saleJson.customer?.id,
        });
      }
      
      // Always ensure customer object has id - preserve all original customer fields
      const customerData: any = {
        id: customerId || saleCustomerId, // Use customerId from sale if customer.id is missing
        name: saleJson.customer.name,
        email: saleJson.customer.email,
        areaCode: saleJson.customer.areaCode || (saleJson.customer.area?.code || null),
      };
      
      // Final check - if id is still missing, this is a data integrity issue
      if (!customerData.id) {
        console.error("[get-sales] Customer id still missing after normalization:", {
          saleNumber: sale.saleNumber,
          saleId: sale.id,
          saleCustomerId: saleCustomerId,
          originalCustomer: sale.customer,
          normalizedCustomer: customerData
        });
      }
      
      return {
        ...sale,
        customer: customerData,
      };
    });
    // Debug: Check customer area codes before processing
    console.log("[get-sales] Total sales found:", salesWithNormalizedArea.length);
    if (salesWithNormalizedArea.length > 0) {
      const salesWithAreaCodes = salesWithNormalizedArea.filter(s => s.customer?.areaCode);
      console.log("[get-sales] Sales with area codes (after normalization):", salesWithAreaCodes.length);
      if (salesWithAreaCodes.length > 0) {
        console.log("[get-sales] Sample sale with area code:", {
          saleNumber: salesWithAreaCodes[0].saleNumber,
          customerName: salesWithAreaCodes[0].customer?.name,
          areaCode: salesWithAreaCodes[0].customer?.areaCode
        });
      } else {
        // Check first sale to see what customer data we're getting
        const firstSale = salesWithNormalizedArea[0];
        console.log("[get-sales] First sale customer data:", {
          saleNumber: firstSale.saleNumber,
          customer: firstSale.customer,
          customerKeys: firstSale.customer ? Object.keys(firstSale.customer) : null
        });
      }
    }
    
    // Calculate remaining balance for each sale
    const salesWithBalance = salesWithNormalizedArea.map((sale) => {
      const total = typeof sale.totalAmount === 'number' 
        ? sale.totalAmount 
        : parseFloat(sale.totalAmount.toString());
      const paid = typeof sale.paidAmount === 'number'
        ? sale.paidAmount
        : parseFloat(sale.paidAmount.toString());
      
      return {
        ...sale,
        remainingBalance: total - paid,
      };
    });
    
    return { success: true, data: serializeForIPC(salesWithBalance) };
  } catch (error) {
    console.error("Error fetching sales:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get a single sale by ID with all details
ipcMain.handle("get-sale", async (_event, saleId: string) => {
  try {
    const sale = await Sale.findByPk(saleId, {
      include: [
        {
          model: Customer,
          as: 'customer',
          required: false,
        },
        {
          model: SaleItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'name'],
            },
            {
              model: Batch,
              as: 'batch',
              attributes: ['id', 'batchNumber', 'expiryDate'],
            },
          ],
        },
        {
          model: SalePayment,
          as: 'payments',
          order: [['paymentDate', 'DESC']],
        },
        {
          model: Transaction,
          as: 'transactions',
          include: [
            {
              model: Account,
              as: 'debitAccount',
              attributes: ['code', 'name'],
            },
            {
              model: Account,
              as: 'creditAccount',
              attributes: ['code', 'name'],
            },
          ],
          order: [['transactionDate', 'ASC']],
        },
      ],
    });
    if (!sale) {
      return { success: false, error: "Sale not found" };
    }
    return { success: true, data: serializeForIPC(sale) };
  } catch (error) {
    console.error("Error fetching sale:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Update sale status
ipcMain.handle("update-sale-status", async (_event, saleId: string, status: string) => {
  try {
    // Validate status
    const validStatuses = ["in_progress", "completed", "returned", "partial_return"];
    if (!validStatuses.includes(status)) {
      return {
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      };
    }

    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      return { success: false, error: "Sale not found" };
    }
    await sale.update({ status });

    return { success: true, data: serializeForIPC(sale) };
  } catch (error) {
    console.error("Error updating sale status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Update sale payment type
ipcMain.handle("update-sale-payment-type", async (_event, saleId: string, paymentType: string) => {
  try {
    // Validate payment type
    const validPaymentTypes = ["cash", "bank", "cod"];
    if (!validPaymentTypes.includes(paymentType)) {
      return {
        success: false,
        error: `Invalid payment type. Must be one of: ${validPaymentTypes.join(", ")}`,
      };
    }

    const sale = await Sale.findByPk(saleId);
    if (!sale) {
      return { success: false, error: "Sale not found" };
    }
    await sale.update({ paymentType });

    return { success: true, data: serializeForIPC(sale) };
  } catch (error) {
    console.error("Error updating sale payment type:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete a sale
ipcMain.handle("delete-sale", async (_event, saleId: string) => {
  try {
    const sale = await Sale.findByPk(saleId, {
      include: [
        {
          model: SaleItem,
          as: 'items',
          include: [
            {
              model: Batch,
              as: 'batch',
            },
          ],
        },
        {
          model: SalePayment,
          as: 'payments',
        },
        {
          model: Transaction,
          as: 'transactions',
        },
      ],
    });

    if (!sale) {
      return { success: false, error: "Sale not found" };
    }

    const saleJson = sale.toJSON();

    // Check if sale has payments
    if ((saleJson as any).payments && (saleJson as any).payments.length > 0) {
      return {
        success: false,
        error: "Cannot delete sale that has payments. Delete payments first.",
      };
    }

    // Check if sale has transactions
    if ((saleJson as any).transactions && (saleJson as any).transactions.length > 0) {
      return {
        success: false,
        error: "Cannot delete sale that has ledger transactions. Delete transactions first.",
      };
    }

    // Use transaction to ensure atomicity
    await defaultSequelize.transaction(async (tx) => {
      // Restore batch quantities
      const items = (saleJson as any).items || [];
      for (const item of items) {
        if (item.batch) {
          const batch = await Batch.findByPk(item.batch.id, { transaction: tx });
          if (batch) {
            await batch.update({
              availableQuantity: (batch.availableQuantity || 0) + (item.quantity || 0),
            }, { transaction: tx });
          }
        }
      }

      // Delete sale items
      await SaleItem.destroy({
        where: { saleId },
        transaction: tx,
      });

      // Delete sale
      await sale.destroy({ transaction: tx });
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting sale:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get accounts for a company
ipcMain.handle("get-accounts", async (_event, companyId: string) => {
  try {
    const accounts = await Account.findAll({
      where: { companyId },
      include: [
        {
          model: Account,
          as: 'parent',
          attributes: ['code', 'name'],
          required: false,
        },
      ],
      order: [['code', 'ASC']],
    });
    return { success: true, data: serializeForIPC(accounts) };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get a single account by ID
ipcMain.handle("get-account", async (_event, accountId: string) => {
  try {
    const account = await Account.findByPk(accountId, {
      include: [
        {
          model: Account,
          as: 'parent',
          required: false,
        },
      ],
    });
    if (!account) {
      return { success: false, error: "Account not found" };
    }
    return { success: true, data: serializeForIPC(account) };
  } catch (error) {
    console.error("Error fetching account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new account
ipcMain.handle("create-account", async (_event, data: {
  companyId: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
}) => {
  try {
    // Check if account code already exists for this company
    const existing = await Account.findOne({
      where: {
        companyId: data.companyId,
        code: data.code,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Account with code "${data.code}" already exists`,
      };
    }

    const account = await Account.create({
      companyId: data.companyId,
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      balance: 0,
    } as any);

    return { success: true, data: serializeForIPC(account) };
  } catch (error) {
    console.error("Error creating account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Update an account
ipcMain.handle("update-account", async (_event, accountId: string, data: {
  code: string;
  name: string;
  type: string;
  parentId?: string;
}) => {
  try {
    // Check if account code already exists for another account in this company
    const account = await Account.findByPk(accountId);

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const existing = await Account.findOne({
      where: {
        companyId: account.companyId,
        code: data.code,
        id: { [Op.ne]: accountId },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Account with code "${data.code}" already exists`,
      };
    }

    const updatedAccount = await account.update({
        code: data.code,
        name: data.name,
        type: data.type,
        parentId: data.parentId || null,
    });

    return { success: true, data: serializeForIPC(updatedAccount) };
  } catch (error) {
    console.error("Error updating account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete an account
ipcMain.handle("delete-account", async (_event, accountId: string) => {
  try {
    const account = await Account.findByPk(accountId, {
      include: [
        {
          model: Transaction,
          as: 'debits',
        },
        {
          model: Transaction,
          as: 'credits',
        },
        {
          model: Account,
          as: 'children',
        },
      ],
    });

    if (!account) {
      return { success: false, error: "Account not found" };
    }

    const accountJson = account.toJSON();

    // Check if account has transactions
    if (((accountJson as any).debits && (accountJson as any).debits.length > 0) || ((accountJson as any).credits && (accountJson as any).credits.length > 0)) {
      return {
        success: false,
        error: "Cannot delete account with existing transactions",
      };
    }

    // Check if account has child accounts
    if ((accountJson as any).children && (accountJson as any).children.length > 0) {
      return {
        success: false,
        error: "Cannot delete account with child accounts",
      };
    }

    await account.destroy();

    return { success: true };
  } catch (error) {
    console.error("Error deleting account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Recalculate account balances from all transactions
ipcMain.handle("recalculate-account-balances", async (_event, companyId: string) => {
  try {
    // Get all accounts for the company
    const accounts = await Account.findAll({
      where: { companyId },
    });

    // Reset all balances to zero first
    await Account.update(
      { balance: 0 },
      { where: { companyId } }
    );

    // Get all transactions for the company
    const transactions = await Transaction.findAll({
      where: { companyId },
      include: [
        {
          model: Account,
          as: 'debitAccount',
        },
        {
          model: Account,
          as: 'creditAccount',
        },
      ],
    });

    // Recalculate balances from transactions
    await defaultSequelize.transaction(async (tx) => {
      for (const transaction of transactions) {
        const amount = typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(String(transaction.amount || 0));

        await updateAccountBalance(defaultSequelize, transaction.debitAccountId, amount, true, tx);
        await updateAccountBalance(defaultSequelize, transaction.creditAccountId, amount, false, tx);
      }
    });

    return { success: true, message: `Recalculated balances for ${accounts.length} accounts based on ${transactions.length} transactions` };
  } catch (error) {
    console.error("Error recalculating account balances:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get transactions for a company
ipcMain.handle("get-transactions", async (_event, companyId: string) => {
  try {
    const transactions = await Transaction.findAll({
      where: { companyId },
      include: [
        {
          model: Account,
          as: 'debitAccount',
          attributes: ['id', 'code', 'name'],
        },
        {
          model: Account,
          as: 'creditAccount',
          attributes: ['id', 'code', 'name'],
        },
        {
          model: Sale,
          as: 'sale',
          attributes: ['id', 'saleNumber'],
          required: false,
        },
        {
          model: Purchase,
          as: 'purchase',
          attributes: ['id', 'purchaseNumber'],
          required: false,
        },
      ],
      order: [['transactionDate', 'DESC']],
    });
    return { success: true, data: serializeForIPC(transactions) };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete a transaction
ipcMain.handle("delete-transaction", async (_event, transactionId: string) => {
  try {
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Account,
          as: 'debitAccount',
        },
        {
          model: Account,
          as: 'creditAccount',
        },
        {
          model: Sale,
          as: 'sale',
          required: false,
        },
        {
          model: Purchase,
          as: 'purchase',
          required: false,
        },
      ],
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    const transactionJson = transaction.toJSON();

    // Warn if transaction is linked to a sale or purchase
    const linkedEntity = (transactionJson as any).sale 
      ? `sale ${(transactionJson as any).sale.saleNumber}` 
      : (transactionJson as any).purchase 
      ? `purchase ${(transactionJson as any).purchase.purchaseNumber}` 
      : null;

    // Use transaction to ensure atomicity
    await defaultSequelize.transaction(async (tx) => {
      const amount = typeof transactionJson.amount === 'number' 
        ? transactionJson.amount 
        : parseFloat(String(transactionJson.amount || 0));

      // Reverse the transaction by updating account balances
      // Debit account: subtract amount (reverse debit)
      const debitAccount = await Account.findByPk(transactionJson.debitAccountId, { transaction: tx });
      if (debitAccount) {
        await debitAccount.update({
          balance: (debitAccount.balance || 0) - amount,
        }, { transaction: tx });
      }

      // Credit account: add amount (reverse credit)
      const creditAccount = await Account.findByPk(transactionJson.creditAccountId, { transaction: tx });
      if (creditAccount) {
        await creditAccount.update({
          balance: (creditAccount.balance || 0) + amount,
        }, { transaction: tx });
      }

      // Delete the transaction
      await transaction.destroy({ transaction: tx });
    });

    return { 
      success: true, 
      message: linkedEntity 
        ? `Transaction deleted. Note: This transaction was linked to ${linkedEntity}.` 
        : "Transaction deleted successfully." 
    };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create transactions for an existing sale
ipcMain.handle("create-sale-transactions", async (_event, saleId: string) => {
  try {
    // Get the sale
    const sale = await Sale.findByPk(saleId, {
      include: [
        {
          model: Transaction,
          as: 'transactions',
        },
      ],
    });

    if (!sale) {
      return { success: false, error: "Sale not found" };
    }

    const saleJson = sale.toJSON();

    // Check if transactions already exist
    if ((saleJson as any).transactions && (saleJson as any).transactions.length > 0) {
      return {
        success: false,
        error: "Transactions already exist for this sale",
      };
    }

    // Find accounts
    const salesAccount = await Account.findOne({
      where: { companyId: saleJson.companyId, code: "4000" }, // Sales Revenue
    });
    const cashAccount = await Account.findOne({
      where: { companyId: saleJson.companyId, code: "1000" }, // Cash
    });
    const bankAccount = await Account.findOne({
      where: { companyId: saleJson.companyId, code: "1100" }, // Bank
    });
    const cogsAccount = await Account.findOne({
      where: { companyId: saleJson.companyId, code: "5000" }, // COGS
    });
    const inventoryAccount = await Account.findOne({
      where: { companyId: saleJson.companyId, code: "1200" }, // Inventory
    });

    if (!salesAccount || (!cashAccount && !bankAccount) || !cogsAccount || !inventoryAccount) {
      return {
        success: false,
        error: "Required accounts not found. Please ensure accounts with codes 1000 (Cash), 1100 (Bank), 4000 (Sales), 5000 (COGS), and 1200 (Inventory) exist.",
      };
    }

    // Determine payment account based on payment type
    const paymentAccount = saleJson.paymentType === "bank" && bankAccount ? bankAccount : cashAccount;
    
    if (!paymentAccount) {
      return {
        success: false,
        error: "Payment account not found for the selected payment type",
      };
    }

    const totalAmount = typeof saleJson.totalAmount === 'number' 
      ? saleJson.totalAmount 
      : parseFloat(String(saleJson.totalAmount || 0));

    // Create transactions in a transaction
    const result = await defaultSequelize.transaction(async (tx) => {
      // Generate transaction numbers (need 2: one for sales, one for COGS)
      // Generate first number, then increment locally for the second to avoid race conditions
      const salesTransactionNumber = await generateNextTransactionNumber(defaultSequelize, saleJson.companyId, tx, 1);
      const salesNum = parseInt(salesTransactionNumber.split("-")[1] || "0");
      const cogsTransactionNumber = `TXN-${String(salesNum + 1).padStart(4, "0")}`;

      // Sales transaction: Debit Cash/Bank, Credit Sales Revenue
      const salesTransaction = await Transaction.create({
        transactionNumber: salesTransactionNumber,
        description: `Sale ${saleJson.saleNumber}`,
        debitAccountId: paymentAccount.id,
        creditAccountId: salesAccount!.id,
        amount: totalAmount,
        saleId: saleJson.id,
        companyId: saleJson.companyId,
        transactionDate: saleJson.saleDate,
      } as any, { transaction: tx });

      // Update account balances for sales transaction
      await updateAccountBalance(defaultSequelize, paymentAccount.id, totalAmount, true, tx); // Debit
      await updateAccountBalance(defaultSequelize, salesAccount!.id, totalAmount, false, tx); // Credit

      // COGS transaction: Debit COGS, Credit Inventory
      // Calculate COGS as 60% of sale amount (can be customized)
      const cogsAmount = totalAmount * 0.6;
      
      const cogsTransaction = await Transaction.create({
        transactionNumber: cogsTransactionNumber,
        description: `COGS for Sale ${saleJson.saleNumber}`,
        debitAccountId: cogsAccount!.id,
        creditAccountId: inventoryAccount!.id,
        amount: cogsAmount,
        saleId: saleJson.id,
        companyId: saleJson.companyId,
        transactionDate: saleJson.saleDate,
      } as any, { transaction: tx });

      // Update account balances for COGS transaction
      await updateAccountBalance(defaultSequelize, cogsAccount!.id, cogsAmount, true, tx); // Debit
      await updateAccountBalance(defaultSequelize, inventoryAccount!.id, cogsAmount, false, tx); // Credit

      return { salesTransaction: salesTransaction.toJSON(), cogsTransaction: cogsTransaction.toJSON() };
    });

    return { 
      success: true, 
      data: serializeForIPC(result),
      message: "Transactions created successfully" 
    };
  } catch (error) {
    console.error("Error creating sale transactions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get a single transaction by ID with all details
ipcMain.handle("get-transaction", async (_event, transactionId: string) => {
  try {
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Account,
          as: 'debitAccount',
          attributes: ['id', 'code', 'name', 'type'],
        },
        {
          model: Account,
          as: 'creditAccount',
          attributes: ['id', 'code', 'name', 'type'],
        },
        {
          model: Sale,
          as: 'sale',
          attributes: ['id', 'saleNumber', 'totalAmount', 'saleDate', 'status', 'paymentType'],
          required: false,
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: ['name', 'email', 'phone'],
              required: false,
            },
          ],
        },
      ],
    });
    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }
    return { success: true, data: serializeForIPC(transaction) };
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get customers for a company
ipcMain.handle("get-customers", async (_event, companyId: string) => {
  try {
    const customers = await Customer.findAll({
      where: { companyId },
      include: [
        {
          model: Area,
          as: 'area',
          required: false,
        },
        {
          model: Sale,
          as: 'sales',
          attributes: ['totalAmount', 'paidAmount'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Calculate paid amount and remaining balance for each customer
    const customersWithBalances = customers.map((customer) => {
      const customerJson = customer.toJSON();
      let totalAmount = 0;
      let paidAmount = 0;

      if ((customerJson as any).sales && (customerJson as any).sales.length > 0) {
        (customerJson as any).sales.forEach((sale: any) => {
          // Helper to convert Decimal to number
          const toNumber = (value: any): number => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'number') return value || 0;
            if (typeof value === 'string') return parseFloat(value) || 0;
            // Handle Prisma Decimal type
            if (value && typeof value.toNumber === 'function') {
              try {
                const num = value.toNumber();
                return isNaN(num) ? 0 : num;
              } catch {
                try {
                  return parseFloat(value.toString()) || 0;
                } catch {
                  return 0;
                }
              }
            }
            // Try toString as fallback
            if (value && typeof value.toString === 'function') {
              try {
                return parseFloat(value.toString()) || 0;
              } catch {
                return 0;
              }
            }
            return 0;
          };
          
          const saleTotal = toNumber(sale.totalAmount);
          const salePaid = toNumber(sale.paidAmount);
          
          totalAmount += saleTotal;
          paidAmount += salePaid;
        });
      }

      const remainingBalance = totalAmount - paidAmount;

      return {
        ...customerJson,
        totalAmount,
        paidAmount,
        remainingBalance,
      };
    });

    return { success: true, data: serializeForIPC(customersWithBalances) };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get a single customer by ID
ipcMain.handle("get-customer", async (_event, customerId: string) => {
  try {
    const customer = await Customer.findByPk(customerId, {
      include: [
        {
          model: Area,
          as: 'area',
          required: false,
        },
        {
          model: Sale,
          as: 'sales',
          attributes: ['id', 'saleNumber', 'totalAmount', 'paidAmount', 'saleDate', 'status', 'paymentType'],
          order: [['saleDate', 'DESC']],
          required: false,
        },
      ],
    });
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const customerJson = customer.toJSON();
    // Note: salesCount is calculated but not currently used - may be needed for future features
    // const salesCount = await Sale.count({ where: { customerId } });

    // Calculate paid amount and remaining balance
    let totalAmount = 0;
    let paidAmount = 0;

    if ((customerJson as any).sales && (customerJson as any).sales.length > 0) {
      // Helper to convert Decimal to number
      const toNumber = (value: any): number => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value || 0;
        if (typeof value === 'string') return parseFloat(value) || 0;
        // Try toString as fallback
        if (value && typeof value.toString === 'function') {
          try {
            return parseFloat(String(value)) || 0;
          } catch {
            return 0;
          }
        }
        return 0;
      };

      (customerJson as any).sales.forEach((sale: any) => {
        const saleTotal = toNumber(sale.totalAmount);
        const salePaid = toNumber(sale.paidAmount);
        
        totalAmount += saleTotal;
        paidAmount += salePaid;
      });
    }

    const remainingBalance = totalAmount - paidAmount;

    const customerWithBalance = {
      ...customer,
      totalAmount,
      paidAmount,
      remainingBalance,
    };

    return { success: true, data: serializeForIPC(customerWithBalance) };
  } catch (error) {
    console.error("Error fetching customer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get vendors for a company
ipcMain.handle("get-vendors", async (_event, companyId: string) => {
  try {
    const vendors = await Vendor.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']],
    });
    return { success: true, data: serializeForIPC(vendors) };
  } catch (error) {
    console.error("Error fetching vendors:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get a single vendor by ID
ipcMain.handle("get-vendor", async (_event, vendorId: string) => {
  try {
    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      return { success: false, error: "Vendor not found" };
    }
    return { success: true, data: serializeForIPC(vendor) };
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new customer
ipcMain.handle("create-customer", async (_event, data: {
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  areaCode?: string;
}) => {
  try {
    const customer = await Customer.create({
      companyId: data.companyId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      areaCode: data.areaCode || null,
    } as any);

    return { success: true, data: serializeForIPC(customer) };
  } catch (error) {
    console.error("Error creating customer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new vendor
ipcMain.handle("create-vendor", async (_event, data: {
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) => {
  try {
    const vendor = await Vendor.create({
      companyId: data.companyId,
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
    } as any);

    return { success: true, data: serializeForIPC(vendor) };
  } catch (error) {
    console.error("Error creating vendor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete a vendor
ipcMain.handle("delete-vendor", async (_event, vendorId: string) => {
  try {
    const vendor = await Vendor.findByPk(vendorId, {
      include: [
        {
          model: Purchase,
          as: 'purchases',
        },
      ],
    });

    if (!vendor) {
      return { success: false, error: "Vendor not found" };
    }

    const vendorJson = vendor.toJSON();

    // Check if vendor has purchases
    if ((vendorJson as any).purchases && (vendorJson as any).purchases.length > 0) {
      return {
        success: false,
        error: "Cannot delete vendor that has purchases. Delete or reassign purchases first.",
      };
    }

    await vendor.destroy();

    return { success: true };
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Update a vendor
ipcMain.handle("update-vendor", async (_event, vendorId: string, data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) => {
  try {
    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      return { success: false, error: "Vendor not found" };
    }
    await vendor.update({
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
    });

    // Reload vendor
    const updatedVendor = await Vendor.findByPk(vendorId);
    return { success: true, data: serializeForIPC(updatedVendor) };
  } catch (error) {
    console.error("Error updating vendor:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Update a customer
ipcMain.handle("update-customer", async (_event, customerId: string, data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  areaCode?: string;
}) => {
  try {
    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }
    await customer.update({
      name: data.name.trim(),
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        areaCode: data.areaCode || null,
    });

    // Reload customer
    const updatedCustomer = await Customer.findByPk(customerId);
    return { success: true, data: serializeForIPC(updatedCustomer) };
  } catch (error) {
    console.error("Error updating customer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete a customer
ipcMain.handle("delete-customer", async (_event, customerId: string) => {
  try {
    const customer = await Customer.findByPk(customerId, {
      include: [
        {
          model: Sale,
          as: 'sales',
        },
      ],
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const customerJson = customer.toJSON();

    // Check if customer has sales
    if ((customerJson as any).sales && (customerJson as any).sales.length > 0) {
      return {
        success: false,
        error: "Cannot delete customer that has sales. Delete or reassign sales first.",
      };
    }

    await customer.destroy();

    return { success: true };
  } catch (error) {
    console.error("Error deleting customer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get areas for a company
ipcMain.handle("get-areas", async (_event, companyId: string) => {
  try {
    const areas = await Area.findAll({
      where: { companyId },
      order: [['code', 'ASC']],
    });
    return { success: true, data: serializeForIPC(areas) };
  } catch (error) {
    console.error("Error fetching areas:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new area
ipcMain.handle("create-area", async (_event, data: {
  companyId: string;
  code: string;
  name: string;
}) => {
  try {
    const area = await Area.create({
      companyId: data.companyId,
      code: data.code,
      name: data.name,
    } as any);

    return { success: true, data: serializeForIPC(area) };
  } catch (error) {
    console.error("Error creating area:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete an area
ipcMain.handle("delete-area", async (_event, areaId: string) => {
  try {
    const area = await Area.findByPk(areaId, {
      include: [
        {
          model: Customer,
          as: 'customers',
        },
      ],
    });

    if (!area) {
      return { success: false, error: "Area not found" };
    }

    const areaJson = area.toJSON();

    // Check if area has customers
    if ((areaJson as any).customers && (areaJson as any).customers.length > 0) {
      return {
        success: false,
        error: "Cannot delete area that has customers. Reassign customers first.",
      };
    }

    await area.destroy();

    return { success: true };
  } catch (error) {
    console.error("Error deleting area:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get products with their available batches for a company
ipcMain.handle("get-products-with-batches", async (_event, companyId: string) => {
  try {
    const products = await Product.findAll({
      where: { companyId },
      include: [
        {
          model: Batch,
          as: 'batches',
          where: {
            availableQuantity: { [Op.gt]: 0 }, // Only batches with available stock
          },
          order: [['expiryDate', 'ASC']], // FIFO: oldest expiry first
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });
    return { success: true, data: serializeForIPC(products) };
  } catch (error) {
    console.error("Error fetching products with batches:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new sale with items
ipcMain.handle("create-sale", async (_event, data: {
  companyId: string;
  customerId?: string;
  paymentType?: string;
  items: Array<{
    productId: string;
    batchId: string;
    quantity: number;
    unitPrice: number;
  }>;
}) => {
  try {
    // Generate sale number
    const lastSale = await Sale.findOne({
      where: { companyId: data.companyId },
      order: [['createdAt', 'DESC']],
    });

    let saleNumber = "SALE-0001";
    if (lastSale) {
      const lastNum = parseInt(lastSale.saleNumber.split("-")[1] || "0");
      saleNumber = `SALE-${String(lastNum + 1).padStart(4, "0")}`;
    }

    // Validate all batches have sufficient quantity
    for (const item of data.items) {
      const batch = await Batch.findByPk(item.batchId);

      if (!batch) {
        return {
          success: false,
          error: `Batch not found for item`,
        };
      }

      if (batch.availableQuantity < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for batch ${batch.batchNumber}. Available: ${batch.availableQuantity}, Requested: ${item.quantity}`,
        };
      }
    }

    // Calculate total amount
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Create sale with items, update batches, and create ledger transactions
    const result = await defaultSequelize.transaction(async (tx) => {
      // Create sale
      // For cash/bank payments, set paidAmount = totalAmount initially
      // For COD, set paidAmount = 0
      const initialPaidAmount = (data.paymentType === "cash" || data.paymentType === "bank") ? totalAmount : 0;
      
      const sale = await Sale.create({
        saleNumber,
        companyId: data.companyId,
        customerId: data.customerId || null,
        totalAmount,
        paidAmount: initialPaidAmount,
        status: initialPaidAmount >= totalAmount ? "completed" : "in_progress",
        paymentType: data.paymentType || "cash",
        saleDate: new Date(),
      } as any, { transaction: tx });

      // Create sale items
      await Promise.all(
        data.items.map((item) =>
          SaleItem.create({
            saleId: sale.id,
            productId: item.productId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          } as any, { transaction: tx })
        )
      );

      // Deduct stock from batches
      for (const item of data.items) {
        const batch = await Batch.findByPk(item.batchId, { transaction: tx });
        if (batch) {
          await batch.update({
            availableQuantity: (batch.availableQuantity || 0) - item.quantity,
          }, { transaction: tx });
        }
      }

      // Create ledger transactions
      // Find accounts (using common account codes)
      const salesAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "4000" }, // Sales Revenue
        transaction: tx,
      });
      const cashAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "1000" }, // Cash
        transaction: tx,
      });
      const bankAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "1100" }, // Bank
        transaction: tx,
      });
      const cogsAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "5000" }, // COGS
        transaction: tx,
      });
      const inventoryAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "1200" }, // Inventory
        transaction: tx,
      });

      if (salesAccount && (cashAccount || bankAccount) && cogsAccount && inventoryAccount) {
        // Determine payment account based on payment type
        const paymentAccount = data.paymentType === "bank" && bankAccount ? bankAccount : cashAccount;
        
        if (paymentAccount) {
          // Generate transaction numbers (need 2: one for sales, one for COGS)
          // Generate first number, then increment locally for the second to avoid race conditions
          const salesTransactionNumber = await generateNextTransactionNumber(defaultSequelize, data.companyId, tx, 1);
          const salesNum = parseInt(salesTransactionNumber.split("-")[1] || "0");
          const cogsTransactionNumber = `TXN-${String(salesNum + 1).padStart(4, "0")}`;

          // Sales transaction: Debit Cash/Bank, Credit Sales Revenue
          await Transaction.create({
            transactionNumber: salesTransactionNumber,
            description: `Sale ${sale.saleNumber}`,
            debitAccountId: paymentAccount.id,
            creditAccountId: salesAccount.id,
            amount: totalAmount,
            saleId: sale.id,
            companyId: data.companyId,
            transactionDate: new Date(),
          } as any, { transaction: tx });

          // Update account balances for sales transaction
          await updateAccountBalance(defaultSequelize, paymentAccount.id, totalAmount, true, tx); // Debit
          await updateAccountBalance(defaultSequelize, salesAccount.id, totalAmount, false, tx); // Credit

          // COGS transaction: Debit COGS, Credit Inventory
          // Calculate COGS as 60% of sale amount (can be customized)
          const cogsAmount = totalAmount * 0.6;
          
          await Transaction.create({
            transactionNumber: cogsTransactionNumber,
            description: `COGS for Sale ${sale.saleNumber}`,
            debitAccountId: cogsAccount.id,
            creditAccountId: inventoryAccount.id,
            amount: cogsAmount,
            saleId: sale.id,
            companyId: data.companyId,
            transactionDate: new Date(),
          } as any, { transaction: tx });

          // Update account balances for COGS transaction
          await updateAccountBalance(defaultSequelize, cogsAccount.id, cogsAmount, true, tx); // Debit
          await updateAccountBalance(defaultSequelize, inventoryAccount.id, cogsAmount, false, tx); // Credit
        }
      }

      // Reload sale with relations
      return await Sale.findByPk(sale.id, {
        include: [
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
              },
              {
                model: Batch,
                as: 'batch',
              },
            ],
          },
          {
            model: Customer,
            as: 'customer',
            required: false,
          },
        ],
        transaction: tx,
      });
    });

    return { success: true, data: serializeForIPC(result) };
  } catch (error) {
    console.error("Error creating sale:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Add a payment to an existing sale
ipcMain.handle("add-sale-payment", async (_event, saleId: string, data: {
  amount: number;
  paymentType: string;
  notes?: string;
}) => {
  try {
    // Get the sale to validate and get current amounts
    const sale = await Sale.findByPk(saleId, {
      include: [
        {
          model: SalePayment,
          as: 'payments',
        },
      ],
    });

    if (!sale) {
      return { success: false, error: "Sale not found" };
    }

    const saleJson = sale.toJSON();

    // Convert amounts to numbers
    const totalAmount = typeof saleJson.totalAmount === 'number'
      ? saleJson.totalAmount
      : parseFloat(String(saleJson.totalAmount || 0));
    const currentPaidAmount = typeof saleJson.paidAmount === 'number'
      ? saleJson.paidAmount
      : parseFloat(String(saleJson.paidAmount || 0));

    // Ensure payment amount is a number
    const paymentAmount = typeof data.amount === 'number' 
      ? data.amount 
      : (typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount)) || 0;

    // Validate payment amount
    if (paymentAmount <= 0) {
      return { success: false, error: "Payment amount must be greater than zero" };
    }

    const remainingBalance = totalAmount - currentPaidAmount;
    if (paymentAmount > remainingBalance) {
      return {
        success: false,
        error: `Payment amount ($${paymentAmount.toFixed(2)}) cannot exceed remaining balance ($${remainingBalance.toFixed(2)})`,
      };
    }

    // Validate payment type
    const validPaymentTypes = ["cash", "bank", "cod"];
    if (!validPaymentTypes.includes(data.paymentType)) {
      return {
        success: false,
        error: `Invalid payment type. Must be one of: ${validPaymentTypes.join(", ")}`,
      };
    }

    // Create payment and update sale in a transaction
    const result = await defaultSequelize.transaction(async (tx) => {
      // Create the payment record
      const payment = await SalePayment.create({
        saleId: saleJson.id,
        companyId: saleJson.companyId,
        amount: paymentAmount,
        paymentType: data.paymentType,
        notes: data.notes || null,
        paymentDate: new Date(),
      } as any, { transaction: tx });

      // Calculate new paid amount
      const newPaidAmount = currentPaidAmount + paymentAmount;

      // Update sale's paidAmount and status
      await sale.update({
        paidAmount: newPaidAmount,
        status: newPaidAmount >= totalAmount ? "completed" : "in_progress",
      }, { transaction: tx });

      // Reload sale with relations
      const updatedSale = await Sale.findByPk(saleId, {
        include: [
          {
            model: SalePayment,
            as: 'payments',
            order: [['paymentDate', 'DESC']],
          },
          {
            model: Customer,
            as: 'customer',
            required: false,
          },
        ],
        transaction: tx,
      });

      return { payment: payment.toJSON(), sale: updatedSale?.toJSON() };
    });

    return { success: true, data: serializeForIPC(result) };
  } catch (error) {
    console.error("Error adding sale payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get a single product by ID
ipcMain.handle("get-product", async (_event, productId: string) => {
  try {
    const product = await Product.findByPk(productId, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });
    if (!product) {
      return { success: false, error: "Product not found" };
    }
    return { success: true, data: serializeForIPC(product) };
  } catch (error) {
    console.error("Error fetching product:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new product
ipcMain.handle("create-product", async (_event, data: {
  companyId: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  vendorId?: string;
}) => {
  try {
    // Check if SKU already exists for this company
    const existing = await Product.findOne({
      where: {
        companyId: data.companyId,
        sku: data.sku,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Product with SKU "${data.sku}" already exists`,
      };
    }

    const product = await Product.create({
      companyId: data.companyId,
      sku: data.sku,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      vendorId: data.vendorId || null,
    } as any);

    return { success: true, data: serializeForIPC(product) };
  } catch (error) {
    console.error("Error creating product:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Update an existing product
ipcMain.handle("update-product", async (_event, productId: string, data: {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  vendorId?: string;
}) => {
  try {
    // Check if product exists
    const existing = await Product.findByPk(productId);

    if (!existing) {
      return {
        success: false,
        error: "Product not found",
      };
    }

    // Check if SKU is being changed and if new SKU already exists
    if (data.sku !== existing.sku) {
      const skuExists = await Product.findOne({
        where: {
          companyId: existing.companyId,
          sku: data.sku,
          id: { [Op.ne]: productId },
        },
      });

      if (skuExists) {
        return {
          success: false,
          error: `Product with SKU "${data.sku}" already exists`,
        };
      }
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }
    const updatedProduct = await product.update({
      sku: data.sku,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      vendorId: data.vendorId || null,
    });

    // Reload with vendor
    const productWithVendor = await Product.findByPk(updatedProduct.id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    return { success: true, data: serializeForIPC(productWithVendor) };
  } catch (error) {
    console.error("Error updating product:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete a product
ipcMain.handle("delete-product", async (_event, productId: string) => {
  try {
    const product = await Product.findByPk(productId, {
      include: [
        {
          model: Batch,
          as: 'batches',
        },
        {
          model: SaleItem,
          as: 'saleItems',
        },
        {
          model: PurchaseItem,
          as: 'purchaseItems',
        },
      ],
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const productJson = product.toJSON();

    // Check if product has batches
    if ((productJson as any).batches && (productJson as any).batches.length > 0) {
      return {
        success: false,
        error: "Cannot delete product that has batches. Delete all batches first.",
      };
    }

    // Check if product has been used in sales
    if ((productJson as any).saleItems && (productJson as any).saleItems.length > 0) {
      return {
        success: false,
        error: "Cannot delete product that has been used in sales",
      };
    }

    // Check if product has been used in purchases
    if ((productJson as any).purchaseItems && (productJson as any).purchaseItems.length > 0) {
      return {
        success: false,
        error: "Cannot delete product that has been used in purchases",
      };
    }

    await product.destroy();

    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get batches for a product
// Get all batches for a company
ipcMain.handle("get-all-batches", async (_event, companyId: string) => {
  try {
    const batches = await Batch.findAll({
      where: { companyId },
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'sku', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    return { success: true, data: serializeForIPC(batches) };
  } catch (error) {
    console.error("Error fetching batches:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("get-batches", async (_event, productId: string) => {
  try {
    const batches = await Batch.findAll({
      where: { productId },
      order: [['createdAt', 'DESC']],
    });
    return { success: true, data: serializeForIPC(batches) };
  } catch (error) {
    console.error("Error fetching batches:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get a single batch by ID
ipcMain.handle("get-batch", async (_event, batchId: string) => {
  try {
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'sku', 'name'],
        },
      ],
    });

    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    return { success: true, data: serializeForIPC(batch) };
  } catch (error) {
    console.error("Error fetching batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new batch
ipcMain.handle("create-batch", async (_event, data: {
  companyId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  availableQuantity: number;
  manufacturingDate?: string;
  expiryDate?: string;
  purchasePrice?: number;
}) => {
  try {
    // Check if batch number already exists for this product and company
    const existing = await Batch.findOne({
      where: {
        productId: data.productId,
        companyId: data.companyId,
        batchNumber: data.batchNumber,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Batch "${data.batchNumber}" already exists for this product`,
      };
    }

    const batch = await Batch.create({
      productId: data.productId,
      companyId: data.companyId,
      batchNumber: data.batchNumber,
      quantity: data.quantity,
      availableQuantity: data.availableQuantity,
      manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      purchasePrice: data.purchasePrice || null,
    } as any);

    return { success: true, data: serializeForIPC(batch) };
  } catch (error) {
    console.error("Error creating batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Update an existing batch
ipcMain.handle("update-batch", async (_event, batchId: string, data: {
  batchNumber?: string;
  quantity?: number;
  availableQuantity?: number;
  manufacturingDate?: string;
  expiryDate?: string;
  purchasePrice?: number;
}) => {
  try {
    // Get the existing batch to check product and company
    const existingBatch = await Batch.findByPk(batchId);

    if (!existingBatch) {
      return { success: false, error: "Batch not found" };
    }

    // If batch number is being changed, check if it conflicts with another batch
    if (data.batchNumber && data.batchNumber !== existingBatch.batchNumber) {
      const conflictingBatch = await Batch.findOne({
        where: {
          productId: existingBatch.productId,
          companyId: existingBatch.companyId,
          batchNumber: data.batchNumber,
          id: { [Op.ne]: batchId },
        },
      });

      if (conflictingBatch) {
        return {
          success: false,
          error: `Batch number "${data.batchNumber}" already exists for this product`,
        };
      }
    }

    // Validate available quantity doesn't exceed total quantity
    const newQuantity = data.quantity ?? existingBatch.quantity;
    const newAvailableQuantity = data.availableQuantity ?? existingBatch.availableQuantity;
    
    if (newAvailableQuantity > newQuantity) {
      return {
        success: false,
        error: "Available quantity cannot exceed total quantity",
      };
    }

    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return { success: false, error: "Batch not found" };
    }
    const updatedBatch = await batch.update({
      ...(data.batchNumber && { batchNumber: data.batchNumber }),
      ...(data.quantity !== undefined && { quantity: data.quantity }),
      ...(data.availableQuantity !== undefined && { availableQuantity: data.availableQuantity }),
      ...(data.manufacturingDate !== undefined && {
        manufacturingDate: data.manufacturingDate ? new Date(data.manufacturingDate) : null,
      }),
      ...(data.expiryDate !== undefined && {
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      }),
      ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
    });

    return { success: true, data: serializeForIPC(updatedBatch) };
  } catch (error) {
    console.error("Error updating batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete a batch
ipcMain.handle("delete-batch", async (_event, batchId: string) => {
  try {
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: SaleItem,
          as: 'saleItems',
        },
        {
          model: PurchaseItem,
          as: 'purchaseItem',
          required: false,
        },
      ],
    });

    if (!batch) {
      return { success: false, error: "Batch not found" };
    }

    const batchJson = batch.toJSON();

    // Check if batch has been used in sales
    if ((batchJson as any).saleItems && (batchJson as any).saleItems.length > 0) {
      return {
        success: false,
        error: "Cannot delete batch that has been used in sales",
      };
    }

    // Check if batch is linked to a purchase item
    if ((batchJson as any).purchaseItem) {
      return {
        success: false,
        error: "Cannot delete batch that is linked to a purchase",
      };
    }

    await batch.destroy();

    return { success: true };
  } catch (error) {
    console.error("Error deleting batch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get purchases for a company
ipcMain.handle("get-purchases", async (_event, companyId: string) => {
  try {
    const purchases = await Purchase.findAll({
      where: { companyId },
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['name', 'email'],
        },
      ],
      order: [['purchaseDate', 'DESC']],
    });
    
    // Get item counts for each purchase
    const purchasesWithTotal = await Promise.all(
      purchases.map(async (purchase) => {
        const itemCount = await PurchaseItem.count({ where: { purchaseId: purchase.id } });
        const purchaseJson = purchase.toJSON();
        const total = typeof purchaseJson.totalAmount === 'number' 
          ? purchaseJson.totalAmount 
          : parseFloat(String(purchaseJson.totalAmount || 0));
        
        return {
          ...purchaseJson,
          totalAmount: total,
          _count: { items: itemCount },
        };
      })
    );
    
    return { success: true, data: serializeForIPC(purchasesWithTotal) };
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get purchases for a specific vendor
ipcMain.handle("get-vendor-purchases", async (_event, vendorId: string) => {
  try {
    const purchases = await Purchase.findAll({
      where: { vendorId },
      include: [
        {
          model: PurchaseItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'name'],
            },
          ],
        },
        {
          model: PurchasePayment,
          as: 'payments',
          order: [['paymentDate', 'DESC']],
        },
        {
          model: Transaction,
          as: 'transactions',
          include: [
            {
              model: Account,
              as: 'debitAccount',
              attributes: ['code', 'name'],
            },
            {
              model: Account,
              as: 'creditAccount',
              attributes: ['code', 'name'],
            },
          ],
          order: [['transactionDate', 'ASC']],
        },
      ],
      order: [['purchaseDate', 'DESC']],
    });

    return { success: true, data: serializeForIPC(purchases) };
  } catch (error) {
    console.error("Error fetching vendor purchases:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get a single purchase by ID
ipcMain.handle("get-purchase", async (_event, purchaseId: string) => {
  try {
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
        },
        {
          model: PurchaseItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'name'],
            },
            {
              model: Batch,
              as: 'batch',
              attributes: ['id', 'batchNumber', 'quantity', 'availableQuantity'],
            },
          ],
        },
        {
          model: PurchasePayment,
          as: 'payments',
          order: [['paymentDate', 'DESC']],
        },
        {
          model: Transaction,
          as: 'transactions',
          include: [
            {
              model: Account,
              as: 'debitAccount',
              attributes: ['code', 'name'],
            },
            {
              model: Account,
              as: 'creditAccount',
              attributes: ['code', 'name'],
            },
          ],
          order: [['transactionDate', 'ASC']],
        },
      ],
    });
    if (!purchase) {
      return { success: false, error: "Purchase not found" };
    }
    return { success: true, data: serializeForIPC(purchase) };
  } catch (error) {
    console.error("Error fetching purchase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Create a new purchase from vendor (creates batches automatically)
ipcMain.handle("create-purchase", async (_event, data: {
  companyId: string;
  vendorId: string;
  paymentType?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    batchNumber: string;
    manufacturingDate?: string;
    expiryDate?: string;
  }>;
}) => {
  try {
    // Validate vendor exists
    const vendor = await Vendor.findByPk(data.vendorId);

    if (!vendor) {
      return { success: false, error: "Vendor not found" };
    }

    // Validate all products exist
    for (const item of data.items) {
      const product = await Product.findByPk(item.productId);

      if (!product) {
        return {
          success: false,
          error: `Product not found for item`,
        };
      }

      // Check if batch number already exists for this product
      const existingBatch = await Batch.findOne({
        where: {
          productId: item.productId,
          companyId: data.companyId,
          batchNumber: item.batchNumber,
        },
      });

      if (existingBatch) {
        return {
          success: false,
          error: `Batch number "${item.batchNumber}" already exists for product ${product.name}`,
        };
      }
    }

    // Calculate total amount
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Generate purchase number
    const lastPurchase = await Purchase.findOne({
      where: { companyId: data.companyId },
      order: [['createdAt', 'DESC']],
    });

    let purchaseNumber = "PURCH-0001";
    if (lastPurchase) {
      const lastNum = parseInt(lastPurchase.purchaseNumber.split("-")[1] || "0");
      purchaseNumber = `PURCH-${String(lastNum + 1).padStart(4, "0")}`;
    }

    // Create purchase with items and batches in a transaction
    const result = await defaultSequelize.transaction(async (tx) => {
      // First, create all batches
      const batchPromises = data.items.map(async (item) => {
        const batch = await Batch.create({
          productId: item.productId,
          companyId: data.companyId,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          availableQuantity: item.quantity, // All purchased quantity is available
          manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          purchasePrice: item.unitPrice,
        } as any, { transaction: tx });
        return { batch, item };
      });

      const batchResults = await Promise.all(batchPromises);

      // For cash/bank payments, set paidAmount = totalAmount initially
      // For credit, set paidAmount = 0
      const initialPaidAmount = (data.paymentType === "cash" || data.paymentType === "bank") ? totalAmount : 0;

      // Now create purchase
      const purchase = await Purchase.create({
        purchaseNumber,
        companyId: data.companyId,
        vendorId: data.vendorId,
        totalAmount,
        paidAmount: initialPaidAmount,
        status: "completed",
        paymentType: data.paymentType || "cash",
        notes: data.notes || null,
        purchaseDate: new Date(),
      } as any, { transaction: tx });

      // Create purchase items linked to the batches
      await Promise.all(
        batchResults.map(({ batch, item }) =>
          PurchaseItem.create({
            purchaseId: purchase.id,
            productId: item.productId,
            batchId: batch.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            batchNumber: item.batchNumber,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          } as any, { transaction: tx })
        )
      );

      // Create ledger transactions for purchase
      // Find accounts (using common account codes)
      const inventoryAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "1200" }, // Inventory
        transaction: tx,
      });
      const cashAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "1000" }, // Cash
        transaction: tx,
      });
      const bankAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "1100" }, // Bank
        transaction: tx,
      });
      const accountsPayableAccount = await Account.findOne({
        where: { companyId: data.companyId, code: "2000" }, // Accounts Payable
        transaction: tx,
      });

      if (inventoryAccount && (cashAccount || bankAccount || accountsPayableAccount)) {
        // Determine payment/credit account based on payment type
        let paymentAccount = null;
        if (data.paymentType === "cash" && cashAccount) {
          paymentAccount = cashAccount;
        } else if (data.paymentType === "bank" && bankAccount) {
          paymentAccount = bankAccount;
        } else if (accountsPayableAccount) {
          paymentAccount = accountsPayableAccount; // Credit purchase
        }

        if (paymentAccount) {
          // Generate transaction number
          const transactionNumber = await generateNextTransactionNumber(defaultSequelize, data.companyId, tx, 1);

          // Purchase transaction: Debit Inventory, Credit Cash/Bank/Accounts Payable
          await Transaction.create({
            transactionNumber,
            description: `Purchase ${purchaseNumber}`,
            debitAccountId: inventoryAccount.id,
            creditAccountId: paymentAccount.id,
            amount: totalAmount,
            purchaseId: purchase.id,
            companyId: data.companyId,
            transactionDate: purchase.purchaseDate,
          } as any, { transaction: tx });

          // Update account balances
          await updateAccountBalance(defaultSequelize, inventoryAccount.id, totalAmount, true, tx); // Debit
          await updateAccountBalance(defaultSequelize, paymentAccount.id, totalAmount, false, tx); // Credit
        }
      }

      // Reload purchase with relations
      return await Purchase.findByPk(purchase.id, {
        include: [
          {
            model: Vendor,
            as: 'vendor',
          },
          {
            model: PurchaseItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
              },
              {
                model: Batch,
                as: 'batch',
              },
            ],
          },
        ],
        transaction: tx,
      });
    });

    return { success: true, data: serializeForIPC(result) };
  } catch (error) {
    console.error("Error creating purchase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Delete a purchase
ipcMain.handle("delete-purchase", async (_event, purchaseId: string) => {
  try {
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [
        {
          model: PurchaseItem,
          as: 'items',
          include: [
            {
              model: Batch,
              as: 'batch',
            },
          ],
        },
      ],
    });

    if (!purchase) {
      return { success: false, error: "Purchase not found" };
    }

    const purchaseJson = purchase.toJSON();

    // Use transaction to ensure atomicity
    await defaultSequelize.transaction(async (tx) => {
      // Delete purchase items and their associated batches
      const items = (purchaseJson as any).items || [];
      for (const item of items) {
        // Delete the batch if it exists
        if (item.batch) {
          // Check if batch has been used in sales
          const batchUsage = await SaleItem.count({
            where: { batchId: item.batch.id },
            transaction: tx,
          });

          if (batchUsage > 0) {
            throw new Error(`Cannot delete purchase: Batch ${item.batch.batchNumber} has been used in sales`);
          }

          const batch = await Batch.findByPk(item.batch.id, { transaction: tx });
          if (batch) {
            await batch.destroy({ transaction: tx });
          }
        }

        // Delete purchase item
        await PurchaseItem.destroy({
          where: { id: item.id },
          transaction: tx,
        });
      }

      // Delete purchase
      await purchase.destroy({ transaction: tx });
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting purchase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Add a payment to an existing purchase
ipcMain.handle("add-purchase-payment", async (_event, purchaseId: string, data: {
  amount: number;
  paymentType: string;
  notes?: string;
}) => {
  try {
    // Get the purchase to validate and get current amounts
    const purchase = await Purchase.findByPk(purchaseId, {
      include: [
        {
          model: PurchasePayment,
          as: 'payments',
        },
      ],
    });

    if (!purchase) {
      return { success: false, error: "Purchase not found" };
    }

    const purchaseJson = purchase.toJSON();

    // Convert amounts to numbers
    const totalAmount = typeof purchaseJson.totalAmount === 'number'
      ? purchaseJson.totalAmount
      : parseFloat(String(purchaseJson.totalAmount || 0));
    const currentPaidAmount = typeof purchaseJson.paidAmount === 'number'
      ? purchaseJson.paidAmount
      : parseFloat(String(purchaseJson.paidAmount || 0));

    // Ensure payment amount is a number
    const paymentAmount = typeof data.amount === 'number' 
      ? data.amount 
      : (typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount)) || 0;

    // Validate payment amount
    if (paymentAmount <= 0) {
      return { success: false, error: "Payment amount must be greater than zero" };
    }

    const remainingBalance = totalAmount - currentPaidAmount;
    if (paymentAmount > remainingBalance) {
      return {
        success: false,
        error: `Payment amount ($${paymentAmount.toFixed(2)}) cannot exceed remaining balance ($${remainingBalance.toFixed(2)})`,
      };
    }

    // Validate payment type
    const validPaymentTypes = ["cash", "bank", "credit"];
    if (!validPaymentTypes.includes(data.paymentType)) {
      return {
        success: false,
        error: `Invalid payment type. Must be one of: ${validPaymentTypes.join(", ")}`,
      };
    }

    // Create payment and update purchase in a transaction
    const result = await defaultSequelize.transaction(async (tx) => {
      // Create the payment record
      const payment = await PurchasePayment.create({
        purchaseId: purchaseJson.id,
        companyId: purchaseJson.companyId,
        amount: paymentAmount,
        paymentType: data.paymentType,
        notes: data.notes || null,
        paymentDate: new Date(),
      } as any, { transaction: tx });

      // Calculate new paid amount
      const newPaidAmount = currentPaidAmount + paymentAmount;

      // Update purchase's paidAmount and status
      await purchase.update({
        paidAmount: newPaidAmount,
        status: newPaidAmount >= totalAmount ? "completed" : "pending",
      }, { transaction: tx });

      // Reload purchase with relations
      const updatedPurchase = await Purchase.findByPk(purchaseId, {
        include: [
          {
            model: PurchasePayment,
            as: 'payments',
            order: [['paymentDate', 'DESC']],
          },
          {
            model: Vendor,
            as: 'vendor',
          },
        ],
        transaction: tx,
      });

      // Create ledger transaction for payment (only if purchase was originally on credit/accounts payable)
      // Find accounts
      const accountsPayableAccount = await Account.findOne({
        where: { companyId: purchaseJson.companyId, code: "2000" }, // Accounts Payable
        transaction: tx,
      });
      const cashAccount = await Account.findOne({
        where: { companyId: purchaseJson.companyId, code: "1000" }, // Cash
        transaction: tx,
      });
      const bankAccount = await Account.findOne({
        where: { companyId: purchaseJson.companyId, code: "1100" }, // Bank
        transaction: tx,
      });

      // Only create payment transaction if Accounts Payable exists (meaning purchase was on credit)
      if (accountsPayableAccount && (cashAccount || bankAccount)) {
        // Determine payment account based on payment type
        const paymentAccount = data.paymentType === "bank" && bankAccount ? bankAccount : cashAccount;
        
        if (paymentAccount) {
          // Generate transaction number
          const transactionNumber = await generateNextTransactionNumber(defaultSequelize, purchaseJson.companyId, tx, 1);

          // Payment transaction: Debit Accounts Payable, Credit Cash/Bank
          await Transaction.create({
            transactionNumber,
            description: `Payment for Purchase ${purchaseJson.purchaseNumber}`,
            debitAccountId: accountsPayableAccount.id,
            creditAccountId: paymentAccount.id,
            amount: paymentAmount,
            purchaseId: purchaseJson.id,
            companyId: purchaseJson.companyId,
            transactionDate: new Date(),
          } as any, { transaction: tx });

          // Update account balances
          await updateAccountBalance(defaultSequelize, accountsPayableAccount.id, paymentAmount, true, tx); // Debit
          await updateAccountBalance(defaultSequelize, paymentAccount.id, paymentAmount, false, tx); // Credit
        }
      }

      return { payment: payment.toJSON(), purchase: updatedPurchase?.toJSON() };
    });

    return { success: true, data: serializeForIPC(result) };
  } catch (error) {
    console.error("Error adding purchase payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Test database connection
// Set active database configuration (called when user switches profiles or saves config)
ipcMain.handle("set-active-database-config", async (_event, config: DatabaseConfig | null) => {
  try {
    activeDbConfig = config;
    // Save to file for persistence across app restarts
    saveActiveDbConfig(config);
    console.log('Active database configuration updated and saved:', config ? {
      type: config.type,
      ...(config.type === 'sqlite' 
        ? { connectionString: config.connectionString }
        : { host: config.host, database: config.database })
    } : 'null (using default SQLite)');
    return { success: true };
  } catch (error) {
    console.error('Error setting active database config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Get active database configuration (for renderer to check what's saved)
ipcMain.handle("get-active-database-config", async () => {
  try {
    // Load from file if not already loaded
    if (!activeDbConfig && app.isReady()) {
      activeDbConfig = loadActiveDbConfig();
    }
    return { success: true, config: activeDbConfig };
  } catch (error) {
    console.error('Error getting active database config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

ipcMain.handle("test-database-connection", async (_event, config: DatabaseConfig) => {
  try {
    // DEBUG: Log database connection details (including password for troubleshooting)
    console.log("🔍 [DEBUG] Testing database connection with configuration:");
    console.log("   Type:", config.type);
    if (config.type === "sqlite") {
      console.log("   Connection String:", config.connectionString);
    } else {
      console.log("   Host:", config.host);
      console.log("   Port:", config.port);
      console.log("   Database:", config.database);
      console.log("   Username:", config.username);
      console.log("   Password:", config.password ? "***" + config.password.slice(-3) : "(not set)");
      console.log("   Full Password (DEBUG):", config.password || "(not set)");
    }
    
    const result = await DatabaseService.testConnection(config);
    
    if (result.success) {
      console.log("✅ [DEBUG] Database connection test successful");
    } else {
      console.log("❌ [DEBUG] Database connection test failed:", result.error);
    }
    
    return result;
  } catch (error) {
    console.error("❌ [DEBUG] Database connection test error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Check if database schema is initialized
ipcMain.handle("check-schema-initialized", async (_event, config: DatabaseConfig) => {
  try {
    const isInitialized = await DatabaseMigrationService.isSchemaInitialized(config);
    return { success: true, isInitialized };
  } catch (error) {
    return {
      success: false,
      isInitialized: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Initialize database schema (run migrations if needed)
ipcMain.handle("initialize-database-schema", async (_event, config: DatabaseConfig) => {
  try {
    console.log("🔍 [DEBUG] Initializing database schema...");
    console.log("   Database Type:", config.type);
    if (config.type !== "sqlite") {
      console.log("   Host:", config.host);
      console.log("   Database:", config.database);
    }
    
    const result = await DatabaseService.initializeDatabase(config);
    
    if (result.success) {
      console.log("✅ [DEBUG] Database schema initialization successful");
      if (result.migrated) {
        console.log("   Tables were created/synced");
      } else {
        console.log("   Tables already existed");
      }
      if (result.seeded) {
        console.log("   Sample data was seeded (new database)");
      }
    } else {
      console.log("❌ [DEBUG] Database schema initialization failed:", result.error);
    }
    
    return result;
  } catch (error) {
    console.error("❌ [DEBUG] Database schema initialization error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Run database migrations
ipcMain.handle("run-database-migrations", async (_event, config: DatabaseConfig) => {
  try {
    const result = await DatabaseMigrationService.runMigrations(config);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Check if database migration is needed
ipcMain.handle("check-migration-needed", async (_event, config: DatabaseConfig) => {
  try {
    const result = await DatabaseMigrationService.isMigrationNeeded(config);
    return result;
  } catch (error) {
    return {
      needed: true, // Default to true if we can't check (safer)
      requiredVersion: CURRENT_SCHEMA_VERSION,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Seed database with default company data
ipcMain.handle("seed-database", async (_event, config: DatabaseConfig, clearExisting: boolean = false) => {
  try {
    console.log("🌱 Starting database seed via IPC...");
    
    // Create a new Sequelize instance for this database config
    const sequelize = SequelizeConfig.createSequelize(config);
    initializeAllModels(sequelize);
    
    // Configure SQLite if needed
    if (config.type === "sqlite") {
      await SequelizeConfig.configureSQLite(sequelize);
    }
    
    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connection established for seeding");
    
    // Sync database schema (create tables if they don't exist)
    console.log("📋 Syncing database schema...");
    await sequelize.sync({ alter: false, force: false });
    console.log("✅ Database schema synchronized");
    
    // Check if data already exists
    const existingCompany = await Company.findOne();
    
    if (existingCompany && clearExisting) {
      console.log("⚠️  Clearing existing data...");
      await SeedService.clearDatabase(sequelize);
    } else if (existingCompany && !clearExisting) {
      await sequelize.close();
      return {
        success: false,
        error: "Database already contains data. Set clearExisting to true to overwrite.",
      };
    }
    
    // Seed the database
    await SeedService.seedDatabase(sequelize);
    
    // Close the connection
    await sequelize.close();
    
    console.log("✅ Database seeding completed successfully");
    return {
      success: true,
      message: "Database seeded successfully with default company data",
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// Cleanup on app quit
app.on("before-quit", async () => {
  await defaultSequelize.close();
});

