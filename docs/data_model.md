# ShopSense Database & Data Model Design

## 1. Relational Entities & Constraints

### A. `products` Table
Represents catalog inventory items with explicit dimensions, pricing, and stock state.
- `id` (VARCHAR(64), Primary Key)
- `slug` (VARCHAR(255), Unique, Indexed)
- `title` (VARCHAR(255), Not Null, Indexed)
- `description` (TEXT, Not Null)
- `category` (VARCHAR(64), Not Null, Indexed)
- `brand` (VARCHAR(64), Not Null, Indexed)
- `price` (NUMERIC(12, 2), Not Null, Indexed) — **Never floating point**
- `currency` (VARCHAR(8), Default 'INR')
- `images` (JSON/TEXT array of verified image URLs)
- `color` (VARCHAR(64), Not Null)
- `material` (VARCHAR(128), Not Null)
- `width` (NUMERIC(8, 2), Not Null) — cm
- `height` (NUMERIC(8, 2), Not Null) — cm
- `depth` (NUMERIC(8, 2), Not Null) — cm
- `rating` (NUMERIC(3, 2), Default 4.5, Indexed)
- `rating_count` (INTEGER, Default 0)
- `availability` (VARCHAR(32), 'in_stock' | 'low_stock' | 'out_of_stock')
- `searchable_text` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### B. `product_embeddings` Table
Maintains precomputed dense vector representations.
- `product_id` (VARCHAR(64), Foreign Key $\to$ `products.id`, On Delete CASCADE)
- `model_identifier` (VARCHAR(64), 'shopsense-dense-v1')
- `embedding_json` / `vector` (Vector(64) in pgvector)
- `dimensions` (INTEGER, 64)
- `created_at` (TIMESTAMP)

### C. `search_events` Table
Observability and offline log evaluation table.
- `id` (VARCHAR(64), Primary Key)
- `query_text` (VARCHAR(512), Not Null)
- `normalized_query` (VARCHAR(512), Not Null)
- `retrieval_mode` (VARCHAR(32), 'hybrid' | 'semantic' | 'keyword')
- `latency_ms` (NUMERIC(8, 2), Not Null)
- `session_id` (VARCHAR(64), Indexed)
- `result_ids` (JSON/TEXT array of top candidate IDs)
- `timestamp` (TIMESTAMP, Indexed)

### D. `user_interactions` Table
User behavior telemetry for collaborative and interaction-based recommendations.
- `id` (VARCHAR(64), Primary Key)
- `session_id` (VARCHAR(64), Indexed)
- `product_id` (VARCHAR(64), Foreign Key $\to$ `products.id`, Indexed)
- `event_type` (VARCHAR(32), 'view' | 'click' | 'save' | 'compare')
- `timestamp` (TIMESTAMP, Indexed)

### E. `evaluation_runs` Table
Records historical benchmark execution runs and metrics for the engineering dashboard.
- `run_id` (VARCHAR(64), Primary Key)
- `benchmark_version` (VARCHAR(64))
- `total_queries` (INTEGER)
- `configuration` (JSON)
- `metrics` (JSON object storing Lexical, Dense, and Hybrid Precision, Recall, MRR, NDCG)
- `latency_percentiles` (JSON object storing p50, p95, p99)
- `timestamp` (TIMESTAMP)
