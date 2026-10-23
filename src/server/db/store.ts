import fs from 'fs';
import path from 'path';
import {
  Product,
  SearchFilters,
  SortOption,
  UserInteractionEvent,
  EvaluationRun
} from '../../types/index.js';

export interface SearchEventRecord {
  id: string;
  query: string;
  normalized_query: string;
  filters: SearchFilters;
  retrieval_mode: string;
  result_ids: string[];
  latency_ms: number;
  session_id: string;
  timestamp: string;
  clicked_product_id?: string;
  clicked_position?: number;
}

export interface StoreData {
  products: Product[];
  product_embeddings: Record<string, number[]>; // productId -> dense vector
  search_events: SearchEventRecord[];
  user_interactions: UserInteractionEvent[];
  evaluation_runs: EvaluationRun[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'shopsense_store.json');
const PRODUCTS_JSONL = path.join(DATA_DIR, 'sample_products.jsonl');

class ShopSenseStore {
  private data: StoreData = {
    products: [],
    product_embeddings: {},
    search_events: [],
    user_interactions: [],
    evaluation_runs: []
  };
  private initialized = false;

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Try loading persistent store if exists
    if (fs.existsSync(STORE_PATH)) {
      try {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`[Store] Loaded ${this.data.products.length} products and ${Object.keys(this.data.product_embeddings).length} embeddings from disk.`);
      } catch (err) {
        console.error('[Store] Failed to parse existing store file, reseeding:', err);
      }
    }

    // If products list is empty, seed from sample_products.jsonl
    if (!this.data.products || this.data.products.length === 0) {
      if (fs.existsSync(PRODUCTS_JSONL)) {
        const lines = fs.readFileSync(PRODUCTS_JSONL, 'utf-8').split('\n').filter(Boolean);
        this.data.products = lines.map((l) => JSON.parse(l));
        console.log(`[Store] Seeded ${this.data.products.length} products from sample_products.jsonl`);
      } else {
        console.warn(`[Store] ${PRODUCTS_JSONL} not found! Products catalog is empty.`);
      }
      this.persist();
    }

    // Connect to PostgreSQL database if DATABASE_URL is set
    try {
      const { postgresDb } = await import('./postgres.js');
      const pgStatus = await postgresDb.initialize();
      console.log(`[Store] PostgreSQL status: connected=${pgStatus.connected}, pgvector=${pgStatus.pgvector_enabled}`);
      if (pgStatus.connected) {
        // Sync catalog and embeddings to PostgreSQL
        await postgresDb.syncCatalog(this.data.products, this.data.product_embeddings);
      }
    } catch (pgErr: any) {
      console.warn('[Store] PostgreSQL initialization warning (continuing with local cache):', pgErr.message);
    }

    this.initialized = true;
  }

  public persist(): void {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Store] Error persisting database store:', err);
    }
  }

  public getAllProducts(): Product[] {
    return this.data.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public getProductBySlug(slug: string): Product | undefined {
    return this.data.products.find((p) => p.slug === slug);
  }

  public getEmbedding(productId: string): number[] | undefined {
    return this.data.product_embeddings[productId];
  }

  public setEmbedding(productId: string, embedding: number[]): void {
    this.data.product_embeddings[productId] = embedding;
  }

  public setAllEmbeddings(embeddings: Record<string, number[]>): void {
    this.data.product_embeddings = {
      ...this.data.product_embeddings,
      ...embeddings
    };
    this.persist();
  }

  public getAllEmbeddings(): Record<string, number[]> {
    return this.data.product_embeddings;
  }

  public filterProducts(filters: SearchFilters): Product[] {
    return this.data.products.filter((p) => {
      if (filters.category && p.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
      if (filters.min_price !== undefined && p.price < filters.min_price) {
        return false;
      }
      if (filters.max_price !== undefined && p.price > filters.max_price) {
        return false;
      }
      if (filters.brand && filters.brand.length > 0) {
        if (!filters.brand.some((b) => b.toLowerCase() === p.brand.toLowerCase())) {
          return false;
        }
      }
      if (filters.material && filters.material.length > 0) {
        if (!filters.material.some((m) => p.material.toLowerCase().includes(m.toLowerCase()))) {
          return false;
        }
      }
      if (filters.color && filters.color.length > 0) {
        if (!filters.color.some((c) => p.color.toLowerCase().includes(c.toLowerCase()))) {
          return false;
        }
      }
      if (filters.min_rating !== undefined && p.rating < filters.min_rating) {
        return false;
      }
      if (filters.availability && filters.availability.length > 0) {
        if (!filters.availability.includes(p.availability)) {
          return false;
        }
      }
      return true;
    });
  }

  public sortProducts(products: Product[], sort: SortOption): Product[] {
    const list = [...products];
    switch (sort) {
      case 'price_asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return list.sort((a, b) => b.price - a.price);
      case 'rating_desc':
        return list.sort((a, b) => b.rating - a.rating || b.rating_count - a.rating_count);
      case 'popularity':
        return list.sort((a, b) => b.rating_count - a.rating_count);
      case 'relevance':
      default:
        return list;
    }
  }

  public recordSearchEvent(event: Omit<SearchEventRecord, 'id' | 'timestamp'>): SearchEventRecord {
    const record: SearchEventRecord = {
      ...event,
      id: `se-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    this.data.search_events.push(record);
    // Keep last 10,000 search events in memory
    if (this.data.search_events.length > 10000) {
      this.data.search_events.shift();
    }
    this.persist();
    return record;
  }

  public recordUserInteraction(event: UserInteractionEvent): UserInteractionEvent {
    const record: UserInteractionEvent = {
      ...event,
      id: `ui-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: event.timestamp || new Date().toISOString()
    };
    this.data.user_interactions.push(record);
    if (this.data.user_interactions.length > 10000) {
      this.data.user_interactions.shift();
    }
    this.persist();
    return record;
  }

  public getUserInteractions(sessionId: string): UserInteractionEvent[] {
    return this.data.user_interactions.filter((ev) => ev.session_id === sessionId);
  }

  public getAllInteractions(): UserInteractionEvent[] {
    return this.data.user_interactions;
  }

  public getSearchEvents(): SearchEventRecord[] {
    return this.data.search_events;
  }

  public recordEvaluationRun(run: EvaluationRun): void {
    this.data.evaluation_runs.unshift(run);
    // keep last 50 runs
    if (this.data.evaluation_runs.length > 50) {
      this.data.evaluation_runs = this.data.evaluation_runs.slice(0, 50);
    }
    this.persist();
  }

  public getEvaluationRuns(): EvaluationRun[] {
    return this.data.evaluation_runs;
  }

  public getEvaluationRunById(id: string): EvaluationRun | undefined {
    return this.data.evaluation_runs.find((r) => r.run_id === id);
  }

  public getSuggestions(query: string, limit = 8): { text: string; type: 'product' | 'category' | 'brand' }[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const suggestions: { text: string; type: 'product' | 'category' | 'brand' }[] = [];
    const seen = new Set<string>();

    // Check categories
    const categories = Array.from(new Set(this.data.products.map((p) => p.category)));
    for (const cat of categories) {
      if (cat.toLowerCase().includes(q)) {
        if (!seen.has(cat)) {
          seen.add(cat);
          suggestions.push({ text: cat, type: 'category' });
        }
      }
    }

    // Check brands
    const brands = Array.from(new Set(this.data.products.map((p) => p.brand)));
    for (const b of brands) {
      if (b.toLowerCase().includes(q)) {
        if (!seen.has(b)) {
          seen.add(b);
          suggestions.push({ text: b, type: 'brand' });
        }
      }
    }

    // Check product titles
    for (const p of this.data.products) {
      if (p.title.toLowerCase().includes(q)) {
        if (!seen.has(p.title)) {
          seen.add(p.title);
          suggestions.push({ text: p.title, type: 'product' });
          if (suggestions.length >= limit) break;
        }
      }
    }

    return suggestions.slice(0, limit);
  }
}

export const dbStore = new ShopSenseStore();
