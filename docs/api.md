# ShopSense REST API Documentation

Base Path: `/api/v1`

## Health Endpoints

### 1. `GET /health/live`
Verifies process liveness.
- **Response 200 OK**:
```json
{
  "status": "live",
  "service": "ShopSense Search Engine",
  "timestamp": "2026-10-23T06:30:00.000Z"
}
```

### 2. `GET /health/ready`
Verifies database readiness and catalog availability.
- **Response 200 OK**:
```json
{
  "status": "ready",
  "catalog_size": 525,
  "timestamp": "2026-10-23T06:30:00.000Z"
}
```

---

## Search Endpoints

### 3. `GET /api/v1/search`
Executes search with query parameters.
- **Query Parameters**:
  - `q`: string (Search query text)
  - `mode`: `hybrid` | `semantic` | `keyword` (default `hybrid`)
  - `category`: string (optional category filter)
  - `min_price`: number (min price in INR)
  - `max_price`: number (max price in INR)
  - `min_rating`: number (min rating 1.0 - 5.0)
  - `brand`: string[] (optional brand filters)
  - `material`: string[] (optional material filters)
  - `sort`: `relevance` | `price_asc` | `price_desc` | `rating_desc` | `popularity`
  - `page`: integer (default 1)
  - `pageSize`: integer (default 12, max 50)
  - `sessionId`: string (session identifier)

- **Response 200 OK**:
```json
{
  "query": "compact wooden desk under 15000",
  "parsed_query": {
    "raw_query": "compact wooden desk under 15000",
    "normalized_query": "compact wooden desk under 15000",
    "extracted_category": "desks",
    "extracted_price_max": 15000,
    "extracted_materials": ["wood", "wooden"],
    "intent": "search",
    "is_llm_assisted": false
  },
  "search_mode_requested": "hybrid",
  "search_mode_used": "hybrid",
  "total_results": 18,
  "page": 1,
  "page_size": 12,
  "total_pages": 2,
  "latency_ms": 32,
  "results": [
    {
      "product": {
        "id": "prod-flagship-1",
        "slug": "kavala-compact-wooden-desk-with-storage-drawer",
        "title": "Kavala Compact Wooden Desk with Storage Drawer",
        "category": "desks",
        "brand": "UrbanWood",
        "price": 12499,
        "currency": "INR",
        "images": ["https://..."],
        "material": "Solid Oak",
        "color": "Natural Warm Oak",
        "width": 100,
        "height": 75,
        "depth": 50,
        "rating": 4.8,
        "rating_count": 142,
        "availability": "in_stock"
      },
      "rank": 1,
      "score": 0.0325,
      "lexical_rank": 1,
      "dense_rank": 1,
      "rrf_score": 0.032522,
      "explanation": {
        "matched_category": true,
        "category_name": "desks",
        "matched_materials": ["Solid Oak"],
        "price_constraint_satisfied": true,
        "dense_semantic_relevance": "high",
        "dense_similarity": 0.884,
        "lexical_score": 14.5,
        "summary": "Retrieved because product matches category 'desks', material (Solid Oak), within budget constraint (₹12,499), and high semantic concept alignment."
      }
    }
  ]
}
```

### 4. `POST /api/v1/search`
Accepts a JSON payload with identical request semantics.

### 5. `GET /api/v1/search/suggestions`
Returns auto-suggestions for products, categories, and brands.
- `q`: string prefix
- **Response**:
```json
{
  "suggestions": [
    { "text": "desks", "type": "category" },
    { "text": "Kavala Compact Wooden Desk", "type": "product" }
  ]
}
```

---

## Products & Recommendations

### 6. `GET /api/v1/products`
Lists catalog products with optional category and pagination.

### 7. `GET /api/v1/products/{id}`
Returns details for a single product by ID or slug.

### 8. `GET /api/v1/products/{id}/similar`
Returns content-based similar products excluding the target product.

### 9. `GET /api/v1/recommendations`
Returns personalized recommendations for `sessionId` (or cold-start curated popular items for new sessions).

### 10. `POST /api/v1/events`
Records user interaction events (`view`, `click`, `save`, `compare`).
- Payload:
```json
{
  "session_id": "sess-12345",
  "product_id": "prod-flagship-1",
  "event_type": "save"
}
```

---

## Evaluation Benchmark

### 11. `GET /api/v1/evaluation/runs`
Returns all historical evaluation runs.

### 12. `POST /api/v1/evaluation/run`
Executes an offline IR evaluation against the labelled 53-query benchmark and records metrics.
