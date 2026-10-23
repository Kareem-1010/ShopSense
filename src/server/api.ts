import { Router, Request, Response } from 'express';
import { dbStore } from './db/store.js';
import { executeSearch } from './search/service.js';
import { getSimilarProducts, getPersonalizedRecommendations } from './recommendations/index.js';
import { runBenchmarkEvaluation } from './evaluation/runner.js';
import { SearchMode, SortOption, SearchFilters } from '../types/index.js';

export const apiRouter = Router();

// ==========================================
// Health Checks
// ==========================================
export function setupHealthRoutes(app: any): void {
  app.get('/health/live', (_req: Request, res: Response) => {
    res.json({
      status: 'live',
      timestamp: new Date().toISOString(),
      service: 'ShopSense Search Engine'
    });
  });

  app.get('/health/ready', async (_req: Request, res: Response) => {
    const productsCount = dbStore.getAllProducts().length;
    const { postgresDb } = await import('./db/postgres.js');
    const pgStatus = await postgresDb.checkStatus();
    const isReady = productsCount > 0;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'unready',
      catalog_size: productsCount,
      database: {
        connected: pgStatus.connected,
        pgvector_enabled: pgStatus.pgvector_enabled,
        products_count: pgStatus.products_count,
        embeddings_count: pgStatus.embeddings_count,
        embedding_dimensions: pgStatus.embedding_dimensions
      },
      timestamp: new Date().toISOString()
    });
  });
}

// ==========================================
// Product Endpoints
// ==========================================
apiRouter.get('/products', (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const category = req.query.category as string;
    const sort = (req.query.sort as SortOption) || 'popularity';

    const filters: SearchFilters = {};
    if (category) filters.category = category;

    const filtered = dbStore.filterProducts(filters);
    const sorted = dbStore.sortProducts(filtered, sort);
    const total = sorted.length;
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      products: paginated,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve products', details: err.message });
  }
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const product = dbStore.getProductById(id) || dbStore.getProductBySlug(id);
  if (!product) {
    res.status(404).json({ error: 'Product not found', id });
    return;
  }
  res.json({ product });
});

apiRouter.get('/products/:id/similar', (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = Math.min(24, parseInt(req.query.limit as string) || 6);

  const product = dbStore.getProductById(id) || dbStore.getProductBySlug(id);
  if (!product) {
    res.status(404).json({ error: 'Product not found', id });
    return;
  }

  const recommendations = getSimilarProducts({ productId: product.id, limit });
  res.json({
    product_id: product.id,
    recommendations,
    count: recommendations.length
  });
});

// ==========================================
// Search Endpoints
// ==========================================
apiRouter.get('/search', (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const mode = (req.query.mode as SearchMode) || 'hybrid';
    const sort = (req.query.sort as SortOption) || 'relevance';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 12));
    const sessionId = (req.query.sessionId as string) || 'anon-session';

    const filters: SearchFilters = {};
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.min_price) filters.min_price = parseFloat(req.query.min_price as string);
    if (req.query.max_price) filters.max_price = parseFloat(req.query.max_price as string);
    if (req.query.brand) {
      filters.brand = Array.isArray(req.query.brand)
        ? (req.query.brand as string[])
        : [req.query.brand as string];
    }
    if (req.query.material) {
      filters.material = Array.isArray(req.query.material)
        ? (req.query.material as string[])
        : [req.query.material as string];
    }
    if (req.query.color) {
      filters.color = Array.isArray(req.query.color)
        ? (req.query.color as string[])
        : [req.query.color as string];
    }
    if (req.query.min_rating) filters.min_rating = parseFloat(req.query.min_rating as string);

    const result = executeSearch({
      query: q,
      mode,
      filters,
      sort,
      page,
      pageSize,
      sessionId
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

apiRouter.post('/search', (req: Request, res: Response) => {
  try {
    const { query, mode, filters, sort, page, pageSize, sessionId } = req.body;
    const result = executeSearch({
      query: query || '',
      mode: mode || 'hybrid',
      filters: filters || {},
      sort: sort || 'relevance',
      page: page || 1,
      pageSize: pageSize || 12,
      sessionId: sessionId || 'anon-session'
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Search request failed', details: err.message });
  }
});

apiRouter.get('/search/suggestions', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const limit = Math.min(20, parseInt(req.query.limit as string) || 8);
  const suggestions = dbStore.getSuggestions(q, limit);
  res.json({ suggestions });
});

// ==========================================
// Recommendations & Event Tracking
// ==========================================
apiRouter.get('/recommendations', (req: Request, res: Response) => {
  try {
    const sessionId = (req.query.sessionId as string) || 'anon-session';
    const limit = Math.min(24, parseInt(req.query.limit as string) || 8);
    const recs = getPersonalizedRecommendations(sessionId, limit);
    res.json(recs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve recommendations', details: err.message });
  }
});

apiRouter.post('/events', (req: Request, res: Response) => {
  try {
    const { session_id, product_id, event_type, query, position } = req.body;
    if (!session_id || !product_id || !event_type) {
      res.status(400).json({ error: 'Missing required fields: session_id, product_id, event_type' });
      return;
    }
    const record = dbStore.recordUserInteraction({
      session_id,
      product_id,
      event_type,
      query,
      position,
      timestamp: new Date().toISOString()
    });
    res.status(201).json({ status: 'recorded', event: record });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record event', details: err.message });
  }
});

// ==========================================
// Evaluation & Benchmark Runs
// ==========================================
apiRouter.get('/evaluation/runs', (_req: Request, res: Response) => {
  const runs = dbStore.getEvaluationRuns();
  res.json({ runs, total: runs.length });
});

apiRouter.get('/evaluation/runs/:id', (req: Request, res: Response) => {
  const run = dbStore.getEvaluationRunById(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Evaluation run not found', run_id: req.params.id });
    return;
  }
  res.json({ run });
});

apiRouter.post('/evaluation/run', (_req: Request, res: Response) => {
  try {
    const run = runBenchmarkEvaluation();
    res.status(201).json({ status: 'completed', run });
  } catch (err: any) {
    res.status(500).json({ error: 'Evaluation run failed', details: err.message });
  }
});

// ==========================================
// Catalog & Analytics Overview
// ==========================================
apiRouter.get('/analytics/overview', (_req: Request, res: Response) => {
  const products = dbStore.getAllProducts();
  const searchEvents = dbStore.getSearchEvents();
  const interactions = dbStore.getAllInteractions();
  const evalRuns = dbStore.getEvaluationRuns();

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const brands = Array.from(new Set(products.map((p) => p.brand)));

  // Calculate avg latency from search events
  let avgLatency = 0;
  if (searchEvents.length > 0) {
    const sum = searchEvents.reduce((acc, ev) => acc + (ev.latency_ms || 0), 0);
    avgLatency = parseFloat((sum / searchEvents.length).toFixed(2));
  }

  res.json({
    catalog: {
      total_products: products.length,
      categories,
      brands,
      synthetic_disclosure: 'Certified synthetic catalog for testing, development, and IR evaluation.'
    },
    activity: {
      total_searches: searchEvents.length,
      total_interactions: interactions.length,
      avg_search_latency_ms: avgLatency
    },
    latest_evaluation: evalRuns[0] || null
  });
});
