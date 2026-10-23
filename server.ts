import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dbStore } from './src/server/db/store.js';
import { ensureProductEmbeddings } from './src/server/search/dense.js';
import { apiRouter, setupHealthRoutes } from './src/server/api.js';
import { runBenchmarkEvaluation } from './src/server/evaluation/runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS headers for API
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Request logging and correlation
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const reqId = `req-${Math.random().toString(36).substring(2, 8)}`;
    res.setHeader('X-Request-Id', reqId);

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms [${reqId}]`);
      }
    });
    next();
  });

  // Setup Health check endpoints (/health/live, /health/ready)
  setupHealthRoutes(app);

  // Mount API Router under /api/v1
  app.use('/api/v1', apiRouter);

  // Initialize DB Store & Embeddings
  console.log('[Bootstrap] Initializing ShopSense database store...');
  await dbStore.initialize();
  const products = dbStore.getAllProducts();
  console.log(`[Bootstrap] Catalog ready: ${products.length} products loaded.`);

  // Precompute any missing embeddings
  ensureProductEmbeddings(products);

  // If no evaluation runs recorded yet, run benchmark evaluation once in background
  if (dbStore.getEvaluationRuns().length === 0) {
    try {
      console.log('[Bootstrap] Running baseline benchmark evaluation...');
      runBenchmarkEvaluation();
    } catch (err) {
      console.warn('[Bootstrap] Initial benchmark run warning:', err);
    }
  }

  // Frontend integration: Vite middleware in dev, static dist in prod
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('[Bootstrap] Vite development server mounted in middleware mode.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log(`[Bootstrap] Serving production static bundle from ${distPath}`);
    }
  }

  // Centralized error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Error] Unhandled error in request:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: isProd ? 'An unexpected error occurred' : err.message
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ShopSense Server] Listening on http://0.0.0.0:${PORT} (PID ${process.pid})`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[ShopSense Server] Gracefully shutting down...');
    server.close(() => {
      console.log('[ShopSense Server] Closed all connections.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error] Failed to start server:', err);
  process.exit(1);
});
