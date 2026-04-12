/**
 * API Server Service
 * Exposes REST API endpoints for mobile app access
 * This allows the desktop app to act as a server that mobile apps can connect to
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Server } from 'http';
import { app as electronApp } from 'electron';
import { Tunnel, use as setCloudflaredBinary } from 'cloudflared';
import type { MobileServerConfig, ApiResponse } from '../shared/types';

let apiServer: Express | null = null;
let httpServer: Server | null = null;
let serverConfig: MobileServerConfig | null = null;
let serverStatus: 'stopped' | 'starting' | 'running' | 'stopping' | 'error' = 'stopped';
let serverError: string | null = null;
let cloudflareTunnel: Tunnel | null = null;
let tunnelPublicUrl: string | null = null;
let tunnelPublicError: string | null = null;
/** Set true before SIGINT so unexpected `exit` handlers do not auto-restart. */
let tunnelShutdownIntentional = false;
let tunnelRestartTimer: ReturnType<typeof setTimeout> | null = null;
let tunnelRestartAttempts = 0;
const MAX_TUNNEL_RESTART_ATTEMPTS = 12;

function cloudflaredExecutableName(): string {
  return process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
}

let cloudflaredBinaryConfigured = false;

/**
 * The cloudflared npm package spawns a binary next to its package.json. In a
 * packaged Electron app that path lives inside app.asar, where executables
 * cannot be spawned (often surfaces as spawn ENOTDIR). Prefer the unpacked
 * copy (see package.json build.asarUnpack) or CLOUDFLARED_BIN.
 */
function configureCloudflaredBinaryPath(): void {
  if (cloudflaredBinaryConfigured) {
    return;
  }
  cloudflaredBinaryConfigured = true;

  const name = cloudflaredExecutableName();
  const candidates: string[] = [];

  if (process.env.CLOUDFLARED_BIN) {
    candidates.push(process.env.CLOUDFLARED_BIN);
  }

  let packaged = false;
  try {
    packaged = electronApp.isPackaged;
  } catch {
    packaged = false;
  }

  if (packaged) {
    candidates.push(
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'cloudflared', 'bin', name),
    );
  } else {
    candidates.push(path.join(process.cwd(), 'node_modules', 'cloudflared', 'bin', name));
    try {
      const pkgDir = path.dirname(require.resolve('cloudflared/package.json'));
      candidates.push(path.join(pkgDir, 'bin', name));
    } catch {
      /* optional dependency layout */
    }
  }

  for (const p of candidates) {
    if (p && existsSync(p)) {
      setCloudflaredBinary(p);
      return;
    }
  }
}

function clearTunnelRestartTimer(): void {
  if (tunnelRestartTimer) {
    clearTimeout(tunnelRestartTimer);
    tunnelRestartTimer = null;
  }
}

/**
 * Quick (trycloudflare) tunnel to local HTTP. If the child exits while the API
 * server is still running, we restart with backoff — Cloudflare 1033 usually means
 * no active connector reached the edge.
 */
function attachQuickTunnel(port: number): void {
  clearTunnelRestartTimer();
  tunnelShutdownIntentional = false;

  configureCloudflaredBinaryPath();

  try {
    cloudflareTunnel = Tunnel.quick(`http://127.0.0.1:${port}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    tunnelPublicError = `Public tunnel could not start (${msg}). The API is still available on your local network; reinstall or set CLOUDFLARED_BIN if you need trycloudflare.`;
    console.error('[cloudflared] Failed to spawn quick tunnel:', err);
    return;
  }

  cloudflareTunnel.on('stderr', (chunk: string) => {
    const line = chunk.trim();
    if (!line) return;
    if (/ERR |fatal|Failed|unable to connect|connection refused/i.test(line)) {
      console.error('[cloudflared]', line);
    }
  });

  cloudflareTunnel.once('url', (url: string) => {
    tunnelPublicUrl = url;
    tunnelPublicError = null;
    tunnelRestartAttempts = 0;
    console.log('Your public mobile endpoint:', url);
  });

  cloudflareTunnel.once('error', (err: Error) => {
    tunnelPublicError = err.message;
    console.error('Cloudflare tunnel error:', err);
  });

  cloudflareTunnel.on('exit', (code, signal) => {
    const exited = cloudflareTunnel;
    if (exited) {
      exited.removeAllListeners();
    }
    cloudflareTunnel = null;
    tunnelPublicUrl = null;

    if (tunnelShutdownIntentional) {
      tunnelShutdownIntentional = false;
      tunnelRestartAttempts = 0;
      clearTunnelRestartTimer();
      return;
    }

    if (serverStatus !== 'running' || !httpServer) {
      return;
    }

    tunnelRestartAttempts += 1;
    if (tunnelRestartAttempts > MAX_TUNNEL_RESTART_ATTEMPTS) {
      tunnelPublicError =
        'Cloudflare tunnel stopped after repeated failures. Check outbound access to Cloudflare, firewall, and the main process logs for [cloudflared].';
      console.error('[cloudflared] Giving up on quick tunnel after', tunnelRestartAttempts, 'attempts');
      return;
    }

    const delayMs = Math.min(30_000, 1500 * 2 ** Math.min(tunnelRestartAttempts - 1, 5));
    tunnelPublicError = `Tunnel disconnected (code ${code ?? '?'}${signal ? ` ${signal}` : ''}). Retrying in ${Math.ceil(delayMs / 1000)}s…`;
    console.warn('[cloudflared] Tunnel process exited; scheduling restart in', delayMs, 'ms');

    tunnelRestartTimer = setTimeout(() => {
      tunnelRestartTimer = null;
      if (serverStatus !== 'running' || !httpServer || cloudflareTunnel) {
        return;
      }
      attachQuickTunnel(port);
    }, delayMs);
  });
}

export class ApiServerService {
  /**
   * Start the API server
   */
  static async start(config: MobileServerConfig, getDatabaseConnection: () => any): Promise<{
    success: boolean;
    error?: string;
    port?: number;
    apiKey?: string;
  }> {
    try {
      // Stop existing server if running
      if (httpServer) {
        await this.stop();
      }

      serverStatus = 'starting';
      serverConfig = config;
      serverError = null;

      // Generate API key if not provided
      if (config.requireAuth && !config.apiKey) {
        const { v4: uuidv4 } = await import('uuid');
        config.apiKey = uuidv4();
      }

      // Create Express app
      apiServer = express();

      // Middleware
      apiServer.use(bodyParser.json());
      apiServer.use(bodyParser.urlencoded({ extended: true }));

      // CORS configuration
      if (config.enableCORS) {
        const corsOptions = {
          origin: config.allowedOrigins && config.allowedOrigins.length > 0
            ? config.allowedOrigins
            : '*', // Allow all origins if not specified
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        };
        apiServer.use(cors(corsOptions));
      }

      const healthHandler = (_req: Request, res: Response) => {
        res.json({
          success: true,
          data: {
            status: 'running',
            version: '1.0.1',
            serverName: config.serverName || 'OmniLedger Server',
          },
        } as ApiResponse);
      };
      // Health must stay before auth (no API key). Register both paths for strict clients.
      apiServer.get('/health', healthHandler);
      apiServer.get('/health/', healthHandler);

      // Authentication middleware (all routes registered below require a key when enabled)
      if (config.requireAuth && config.apiKey) {
        apiServer.use((req: Request, res: Response, next: NextFunction) => {
          if (req.method === 'OPTIONS') {
            return next();
          }

          const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

          if (apiKey !== config.apiKey) {
            return res.status(401).json({
              success: false,
              error: 'Unauthorized: Invalid or missing API key',
            } as ApiResponse);
          }

          next();
        });
      }

      // API routes
      this.setupRoutes(apiServer, getDatabaseConnection);

      // Error handling middleware
      apiServer.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        console.error('API Server Error:', err);
        res.status(500).json({
          success: false,
          error: err.message || 'Internal server error',
        } as ApiResponse);
      });

      // Start server (await listen so tunnel targets a live port)
      const host = config.host || '0.0.0.0';
      const port = config.port || 3000;

      await new Promise<void>((resolve, reject) => {
        const server = apiServer!.listen(port, host, () => {
          serverStatus = 'running';
          serverError = null;
          console.log(`📱 Mobile API Server started on http://${host}:${port}`);
          resolve();
        });
        httpServer = server;
        server.once('error', (error: Error & { code?: string }) => {
          console.error('API Server Error:', error);
          serverStatus = 'error';
          serverError = error.message || 'Unknown error';
          if (error.code === 'EADDRINUSE') {
            serverError = `Port ${port} is already in use`;
          }
          reject(error);
        });
      });

      httpServer!.on('error', (error: Error & { code?: string }) => {
        console.error('API Server Error:', error);
        serverStatus = 'error';
        serverError = error.message || 'Unknown error';
        if (error.code === 'EADDRINUSE') {
          serverError = `Port ${port} is already in use`;
        }
      });

      tunnelPublicUrl = null;
      tunnelPublicError = null;
      tunnelRestartAttempts = 0;
      attachQuickTunnel(port);

      return {
        success: true,
        port,
        apiKey: config.requireAuth ? config.apiKey : undefined,
      };
    } catch (error) {
      serverStatus = 'error';
      serverError = error instanceof Error ? error.message : 'Unknown error';
      await this.stop();
      return {
        success: false,
        error: serverError,
      };
    }
  }

  /**
   * Setup API routes
   */
  private static setupRoutes(app: Express, getDatabaseConnection: () => any): void {
    // Get database connection helper
    const getDb = () => {
      try {
        return getDatabaseConnection();
      } catch (error) {
        throw new Error('Database connection not available');
      }
    };

    // Import models dynamically
    const getModels = async () => {
      const sequelize = getDb();
      return {
        Company: sequelize.models.Company || (await import('../database/models/Company')).Company,
        Product: sequelize.models.Product || (await import('../database/models/Product')).Product,
        Batch: sequelize.models.Batch || (await import('../database/models/Batch')).Batch,
        Customer: sequelize.models.Customer || (await import('../database/models/Customer')).Customer,
        Vendor: sequelize.models.Vendor || (await import('../database/models/Vendor')).Vendor,
        Sale: sequelize.models.Sale || (await import('../database/models/Sale')).Sale,
        SaleItem: sequelize.models.SaleItem || (await import('../database/models/SaleItem')).SaleItem,
        Purchase: sequelize.models.Purchase || (await import('../database/models/Purchase')).Purchase,
        PurchaseItem: sequelize.models.PurchaseItem || (await import('../database/models/PurchaseItem')).PurchaseItem,
      };
    };

    // ===== COMPANIES =====
    app.get('/api/companies', async (_req: Request, res: Response) => {
      try {
        const { Company } = await getModels();
        const companies = await Company.findAll({
          order: [['name', 'ASC']],
        });

        res.json({
          success: true,
          data: companies.map((c: any) => ({
            id: c.id,
            name: c.name,
            address: c.address ?? null,
            phone: c.phone ?? null,
            email: c.email ?? null,
            currency: c.currency,
          })),
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch companies',
        } as ApiResponse);
      }
    });

    // ===== PRODUCTS =====
    app.get('/api/products', async (req: Request, res: Response) => {
      try {
        const { Product, Batch } = await getModels();
        const { companyId } = req.query;

        if (!companyId) {
          return res.status(400).json({
            success: false,
            error: 'companyId is required',
          } as ApiResponse);
        }

        const products = await Product.findAll({
          where: { companyId: companyId as string },
          include: [
            {
              model: Batch,
              as: 'batches',
              attributes: ['id', 'batchNumber', 'quantity', 'availableQuantity', 'expiryDate'],
            },
          ],
          order: [['name', 'ASC']],
        });

        res.json({
          success: true,
          data: products.map((p: any) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            category: p.category,
            tradePrice: p.tradePrice,
            retailPrice: p.retailPrice,
            batches: p.batches || [],
          })),
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch products',
        } as ApiResponse);
      }
    });

    app.get('/api/products/:id', async (req: Request, res: Response) => {
      try {
        const { Product, Batch } = await getModels();
        const product = await Product.findByPk(req.params.id, {
          include: [
            {
              model: Batch,
              as: 'batches',
            },
          ],
        });

        if (!product) {
          return res.status(404).json({
            success: false,
            error: 'Product not found',
          } as ApiResponse);
        }

        res.json({
          success: true,
          data: product,
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch product',
        } as ApiResponse);
      }
    });

    // ===== CUSTOMERS =====
    app.get('/api/customers', async (req: Request, res: Response) => {
      try {
        const { Customer } = await getModels();
        const { companyId } = req.query;

        if (!companyId) {
          return res.status(400).json({
            success: false,
            error: 'companyId is required',
          } as ApiResponse);
        }

        const customers = await Customer.findAll({
          where: { companyId: companyId as string },
          order: [['name', 'ASC']],
        });

        res.json({
          success: true,
          data: customers,
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch customers',
        } as ApiResponse);
      }
    });

    // ===== SALES =====
    app.get('/api/sales', async (req: Request, res: Response) => {
      try {
        const { Sale, SaleItem, Customer, Product, Batch } = await getModels();
        const { companyId, limit = '50', offset = '0' } = req.query;

        if (!companyId) {
          return res.status(400).json({
            success: false,
            error: 'companyId is required',
          } as ApiResponse);
        }

        const sales = await Sale.findAndCountAll({
          where: { companyId: companyId as string },
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: ['id', 'name', 'code'],
            },
            {
              model: SaleItem,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'code'],
                },
                {
                  model: Batch,
                  as: 'batch',
                  attributes: ['id', 'batchNumber'],
                },
              ],
            },
          ],
          order: [['saleDate', 'DESC']],
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        });

        res.json({
          success: true,
          data: {
            sales: sales.rows,
            total: sales.count,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
          },
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch sales',
        } as ApiResponse);
      }
    });

    app.post('/api/sales', async (req: Request, res: Response) => {
      try {
        const { Sale, SaleItem, Product, Batch } = await getModels();
        const sequelize = getDb();
        const {
          companyId,
          customerId,
          items,
          paymentType = 'cash',
          notes,
        } = req.body;

        if (!companyId || !customerId || !items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'companyId, customerId, and items array are required',
          } as ApiResponse);
        }

        // Calculate total amount
        const totalAmount = items.reduce((sum: number, item: any) => {
          return sum + (parseFloat(item.unitPrice || 0) * parseInt(item.quantity || 0, 10));
        }, 0);

        // Generate sale number
        const lastSale = await Sale.findOne({
          where: { companyId },
          order: [['createdAt', 'DESC']],
        });

        let saleNumber = 'SALE-0001';
        if (lastSale) {
          const lastNum = parseInt(lastSale.saleNumber.split('-')[1] || '0', 10);
          saleNumber = `SALE-${String(lastNum + 1).padStart(4, '0')}`;
        }

        // Create sale in transaction
        const result = await sequelize.transaction(async (tx: any) => {
          // Create sale
          const sale = await Sale.create({
            companyId,
            customerId,
            saleNumber,
            saleDate: new Date(),
            totalAmount,
            paidAmount: paymentType === 'cash' ? totalAmount : 0,
            paymentType,
            status: 'completed',
            notes: notes || null,
          } as any, { transaction: tx });

          // Create sale items and update batch quantities
          for (const item of items) {
            const { productId, batchId, quantity, unitPrice } = item;

            // Validate product and batch
            const product = await Product.findByPk(productId, { transaction: tx });
            if (!product) {
              throw new Error(`Product not found: ${productId}`);
            }

            const batch = await Batch.findByPk(batchId, { transaction: tx });
            if (!batch) {
              throw new Error(`Batch not found: ${batchId}`);
            }

            const batchJson = batch.toJSON();
            const availableQty = parseInt(batchJson.availableQuantity || 0, 10);
            const qty = parseInt(quantity, 10);

            if (availableQty < qty) {
              throw new Error(`Insufficient quantity in batch ${batchJson.batchNumber}. Available: ${availableQty}, Requested: ${qty}`);
            }

            // Create sale item
            await SaleItem.create({
              saleId: sale.id,
              productId,
              batchId,
              quantity: qty,
              unitPrice: parseFloat(unitPrice),
              totalPrice: qty * parseFloat(unitPrice),
            } as any, { transaction: tx });

            // Update batch available quantity
            await batch.update({
              availableQuantity: availableQty - qty,
            }, { transaction: tx });
          }

          return sale;
        });

        // Reload sale with relations
        const saleWithItems = await Sale.findByPk(result.id, {
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
          ],
        });

        res.status(201).json({
          success: true,
          data: saleWithItems,
          message: 'Sale created successfully',
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create sale',
        } as ApiResponse);
      }
    });

    // ===== INVENTORY / STOCK =====
    app.get('/api/inventory', async (req: Request, res: Response) => {
      try {
        const { Product, Batch } = await getModels();
        const { companyId } = req.query;

        if (!companyId) {
          return res.status(400).json({
            success: false,
            error: 'companyId is required',
          } as ApiResponse);
        }

        const products = await Product.findAll({
          where: { companyId: companyId as string },
          include: [
            {
              model: Batch,
              as: 'batches',
              attributes: ['id', 'batchNumber', 'quantity', 'availableQuantity', 'expiryDate', 'manufacturingDate'],
            },
          ],
        });

        const inventory = products.map((p: any) => {
          const totalQuantity = (p.batches || []).reduce((sum: number, b: any) => sum + parseInt(b.quantity || 0, 10), 0);
          const availableQuantity = (p.batches || []).reduce((sum: number, b: any) => sum + parseInt(b.availableQuantity || 0, 10), 0);

          return {
            productId: p.id,
            productCode: p.code,
            productName: p.name,
            totalQuantity,
            availableQuantity,
            batches: p.batches || [],
          };
        });

        res.json({
          success: true,
          data: inventory,
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch inventory',
        } as ApiResponse);
      }
    });

    // ===== DASHBOARD / STATS =====
    app.get('/api/dashboard', async (req: Request, res: Response) => {
      try {
        const { Product, Sale, Customer, Batch } = await getModels();
        const { companyId } = req.query;

        if (!companyId) {
          return res.status(400).json({
            success: false,
            error: 'companyId is required',
          } as ApiResponse);
        }

        // Get today's sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Use Sequelize.Op for operators
        const Sequelize = require('sequelize');
        
        const todaySales = await Sale.findAll({
          where: {
            companyId: companyId as string,
            saleDate: {
              [Sequelize.Op.gte]: today,
              [Sequelize.Op.lt]: tomorrow,
            },
          },
        });

        const todayRevenue = todaySales.reduce((sum: number, s: any) => {
          const total = typeof s.totalAmount === 'number' ? s.totalAmount : parseFloat(String(s.totalAmount || 0));
          return sum + total;
        }, 0);

        // Get product count
        const productCount = await Product.count({
          where: { companyId: companyId as string },
        });

        // Get customer count
        const customerCount = await Customer.count({
          where: { companyId: companyId as string },
        });

        // Get low stock products (availableQuantity < 10)
        const lowStockProducts = await Product.findAll({
          where: { companyId: companyId as string },
          include: [
            {
              model: Batch,
              as: 'batches',
              attributes: ['availableQuantity'],
            },
          ],
        });

        const lowStockCount = lowStockProducts.filter((p: any) => {
          const available = (p.batches || []).reduce((sum: number, b: any) => sum + parseInt(b.availableQuantity || 0, 10), 0);
          return available < 10;
        }).length;

        res.json({
          success: true,
          data: {
            todayRevenue,
            todaySalesCount: todaySales.length,
            totalProducts: productCount,
            totalCustomers: customerCount,
            lowStockProducts: lowStockCount,
          },
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        } as ApiResponse);
      }
    });

    // 404 handler for API routes
    app.use('/api/*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: `API endpoint not found: ${req.method} ${req.path}`,
      } as ApiResponse);
    });
  }

  /**
   * Stop the API server
   */
  static async stop(): Promise<{ success: boolean; error?: string }> {
    try {
      tunnelShutdownIntentional = true;
      clearTunnelRestartTimer();
      tunnelRestartAttempts = 0;

      if (cloudflareTunnel) {
        try {
          cloudflareTunnel.removeAllListeners();
          cloudflareTunnel.stop();
        } catch {
          /* ignore */
        }
        cloudflareTunnel = null;
      }
      tunnelPublicUrl = null;
      tunnelPublicError = null;

      if (httpServer) {
        serverStatus = 'stopping';

        return new Promise((resolve) => {
          httpServer?.close(() => {
            httpServer = null;
            apiServer = null;
            serverStatus = 'stopped';
            console.log('📱 Mobile API Server stopped');
            resolve({ success: true });
          });
        });
      }

      serverStatus = 'stopped';
      return { success: true };
    } catch (error) {
      serverStatus = 'error';
      serverError = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: serverError,
      };
    }
  }

  /**
   * Get server status
   */
  static getStatus(): {
    status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
    config: MobileServerConfig | null;
    error: string | null;
    port?: number;
    tunnelUrl: string | null;
    tunnelError: string | null;
  } {
    return {
      status: serverStatus,
      config: serverConfig,
      error: serverError,
      port: httpServer?.address() ? (httpServer.address() as any).port : undefined,
      tunnelUrl: tunnelPublicUrl,
      tunnelError: tunnelPublicError,
    };
  }

  /**
   * Check if server is running
   */
  static isRunning(): boolean {
    return serverStatus === 'running' && httpServer !== null;
  }
}
