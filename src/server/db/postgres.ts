import pg from 'pg';
import { Product } from '../../types/index.js';
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL_ID } from '../search/embeddings.js';

const { Pool } = pg;

export interface PostgresStatus {
  connected: boolean;
  pgvector_enabled: boolean;
  products_count: number;
  embeddings_count: number;
  embedding_dimensions: number;
  error?: string;
}

class PostgresDatabase {
  private pool: pg.Pool | null = null;
  private isConnected = false;
  private pgVectorEnabled = false;
  private initPromise: Promise<void> | null = null;

  public getPool(): pg.Pool | null {
    return this.pool;
  }

  public getStatus(): PostgresStatus {
    return {
      connected: this.isConnected,
      pgvector_enabled: this.pgVectorEnabled,
      products_count: 0,
      embeddings_count: 0,
      embedding_dimensions: EMBEDDING_DIMENSION
    };
  }

  public async initialize(): Promise<PostgresStatus> {
    if (this.initPromise) {
      await this.initPromise;
      return this.checkStatus();
    }

    this.initPromise = this._doInitialize();
    await this.initPromise;
    return this.checkStatus();
  }

  private async _doInitialize(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('[PostgreSQL] DATABASE_URL is not set. Operating in memory/file mode.');
      this.isConnected = false;
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 1000,
        connectionTimeoutMillis: 5000,
        allowExitOnIdle: true
      });

      // Test connection
      const client = await this.pool.connect();
      try {
        const res = await client.query('SELECT version();');
        console.log('[PostgreSQL] Connected successfully to:', res.rows[0].version.split(',')[0]);
        this.isConnected = true;

        // Ensure pgvector extension
        try {
          await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
          const extRes = await client.query("SELECT * FROM pg_extension WHERE extname = 'vector';");
          this.pgVectorEnabled = extRes.rows.length > 0;
          console.log('[PostgreSQL] pgvector extension active:', this.pgVectorEnabled);
        } catch (vecErr: any) {
          console.warn('[PostgreSQL] pgvector extension warning:', vecErr.message);
          this.pgVectorEnabled = false;
        }

        // Create Tables
        await client.query(`
          CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(64) PRIMARY KEY,
            slug VARCHAR(255) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(64) NOT NULL,
            brand VARCHAR(64) NOT NULL,
            price NUMERIC(12, 2) NOT NULL,
            currency VARCHAR(8) DEFAULT 'INR' NOT NULL,
            images JSONB NOT NULL DEFAULT '[]'::jsonb,
            color VARCHAR(64) NOT NULL,
            material VARCHAR(128) NOT NULL,
            width NUMERIC(8, 2) NOT NULL,
            height NUMERIC(8, 2) NOT NULL,
            depth NUMERIC(8, 2) NOT NULL,
            rating NUMERIC(3, 2) DEFAULT 4.5 NOT NULL,
            rating_count INT DEFAULT 0 NOT NULL,
            availability VARCHAR(32) DEFAULT 'in_stock' NOT NULL,
            searchable_text TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
          CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
          CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
          CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);

          CREATE TABLE IF NOT EXISTS search_events (
            id VARCHAR(64) PRIMARY KEY,
            query_text VARCHAR(512) NOT NULL,
            normalized_query VARCHAR(512) NOT NULL,
            retrieval_mode VARCHAR(32) NOT NULL,
            latency_ms NUMERIC(8, 2) NOT NULL,
            session_id VARCHAR(64) NOT NULL,
            result_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS user_interactions (
            id VARCHAR(64) PRIMARY KEY,
            session_id VARCHAR(64) NOT NULL,
            product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
            event_type VARCHAR(32) NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS evaluation_runs (
            run_id VARCHAR(64) PRIMARY KEY,
            benchmark_version VARCHAR(64) NOT NULL,
            total_queries INT NOT NULL,
            configuration JSONB NOT NULL,
            metrics JSONB NOT NULL,
            latency_percentiles JSONB NOT NULL,
            sample_query_results JSONB NOT NULL DEFAULT '[]'::jsonb,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);

        // Create vector table if pgvector is enabled
        if (this.pgVectorEnabled) {
          await client.query(`
            CREATE TABLE IF NOT EXISTS product_embeddings (
              product_id VARCHAR(64) PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
              model_identifier VARCHAR(64) NOT NULL,
              embedding vector(${EMBEDDING_DIMENSION}) NOT NULL,
              dimensions INT DEFAULT ${EMBEDDING_DIMENSION} NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_product_embeddings_hnsw 
            ON product_embeddings USING hnsw (embedding vector_cosine_ops);
          `);
        }
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('[PostgreSQL] Connection failed:', err.message);
      this.isConnected = false;
      this.pgVectorEnabled = false;
    }
  }

  public async checkStatus(): Promise<PostgresStatus> {
    if (!this.pool || !this.isConnected) {
      return {
        connected: false,
        pgvector_enabled: false,
        products_count: 0,
        embeddings_count: 0,
        embedding_dimensions: EMBEDDING_DIMENSION
      };
    }

    try {
      const client = await this.pool.connect();
      try {
        const prodCountRes = await client.query('SELECT COUNT(*)::int as count FROM products;');
        let embCount = 0;
        if (this.pgVectorEnabled) {
          const embCountRes = await client.query('SELECT COUNT(*)::int as count FROM product_embeddings;');
          embCount = embCountRes.rows[0].count;
        }

        return {
          connected: true,
          pgvector_enabled: this.pgVectorEnabled,
          products_count: prodCountRes.rows[0].count,
          embeddings_count: embCount,
          embedding_dimensions: EMBEDDING_DIMENSION
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      return {
        connected: false,
        pgvector_enabled: false,
        products_count: 0,
        embeddings_count: 0,
        embedding_dimensions: EMBEDDING_DIMENSION,
        error: err.message
      };
    }
  }

  public async syncCatalog(products: Product[], embeddings: Record<string, number[]>): Promise<void> {
    if (!this.pool || !this.isConnected) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const countRes = await client.query('SELECT COUNT(*)::int as count FROM products;');
      const currentCount = countRes.rows[0].count;

      if (currentCount < products.length) {
        console.log(`[PostgreSQL] Syncing ${products.length} products to database in batches...`);
        const BATCH_SIZE = 50;
        for (let i = 0; i < products.length; i += BATCH_SIZE) {
          const batch = products.slice(i, i + BATCH_SIZE);
          const valueClauses: string[] = [];
          const params: any[] = [];
          let paramIdx = 1;

          for (const p of batch) {
            valueClauses.push(
              `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9}, $${paramIdx + 10}, $${paramIdx + 11}, $${paramIdx + 12}, $${paramIdx + 13}, $${paramIdx + 14}, $${paramIdx + 15}, $${paramIdx + 16})`
            );
            params.push(
              p.id,
              p.slug,
              p.title,
              p.description,
              p.category,
              p.brand,
              p.price,
              p.currency || 'INR',
              JSON.stringify(p.images || []),
              p.color,
              p.material,
              p.width,
              p.height,
              p.depth,
              p.rating,
              p.rating_count,
              p.availability
            );
            paramIdx += 17;
          }

          const query = `
            INSERT INTO products (
              id, slug, title, description, category, brand, price, currency,
              images, color, material, width, height, depth, rating, rating_count, availability
            ) VALUES ${valueClauses.join(', ')}
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              description = EXCLUDED.description,
              price = EXCLUDED.price,
              rating = EXCLUDED.rating,
              rating_count = EXCLUDED.rating_count,
              availability = EXCLUDED.availability;
          `;
          await client.query(query, params);
        }
        console.log('[PostgreSQL] Products sync completed.');
      }

      // Sync embeddings if pgvector is enabled
      if (this.pgVectorEnabled) {
        const embRes = await client.query('SELECT COUNT(*)::int as count FROM product_embeddings;');
        const currentEmbCount = embRes.rows[0].count;
        const validProductIds = new Set((await client.query('SELECT id FROM products;')).rows.map((r: any) => r.id));
        const entries = Object.entries(embeddings).filter(([id]) => validProductIds.has(id));

        if (currentEmbCount < entries.length) {
          console.log(`[PostgreSQL] Syncing ${entries.length} vector embeddings to pgvector in batches...`);
          const BATCH_SIZE = 50;
          for (let i = 0; i < entries.length; i += BATCH_SIZE) {
            const batch = entries.slice(i, i + BATCH_SIZE);
            const valueClauses: string[] = [];
            const params: any[] = [];
            let paramIdx = 1;

            for (const [prodId, vec] of batch) {
              if (vec && vec.length === EMBEDDING_DIMENSION) {
                valueClauses.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3})`);
                params.push(prodId, EMBEDDING_MODEL_ID, `[${vec.join(',')}]`, EMBEDDING_DIMENSION);
                paramIdx += 4;
              }
            }

            if (valueClauses.length > 0) {
              const query = `
                INSERT INTO product_embeddings (product_id, model_identifier, embedding, dimensions)
                VALUES ${valueClauses.join(', ')}
                ON CONFLICT (product_id) DO UPDATE SET
                  embedding = EXCLUDED.embedding;
              `;
              await client.query(query, params);
            }
          }
          console.log('[PostgreSQL] pgvector embeddings sync completed.');
        }
      }

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL] Error during catalog sync:', err.message);
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }

  public async searchPgVector(queryVector: number[], limit = 60): Promise<{ productId: string; similarity: number }[]> {
    if (!this.pool || !this.isConnected || !this.pgVectorEnabled) {
      return [];
    }

    const client = await this.pool.connect();
    try {
      const vectorString = `[${queryVector.join(',')}]`;
      const res = await client.query(
        `SELECT product_id, 1 - (embedding <=> $1) AS similarity
         FROM product_embeddings
         ORDER BY embedding <=> $1
         LIMIT $2;`,
        [vectorString, limit]
      );

      return res.rows.map((r) => ({
        productId: r.product_id,
        similarity: parseFloat(parseFloat(r.similarity).toFixed(4))
      }));
    } catch (err: any) {
      console.warn('[PostgreSQL] pgvector similarity query error:', err.message);
      return [];
    } finally {
      client.release();
    }
  }
}

export const postgresDb = new PostgresDatabase();
