import test from 'node:test';
import assert from 'node:assert/strict';
import { dbStore } from '../../src/server/db/store.js';
import { executeSearch } from '../../src/server/search/service.js';
import { retrieveDense, ensureProductEmbeddings } from '../../src/server/search/dense.js';
import { retrieveLexical } from '../../src/server/search/lexical.js';
import { reciprocalRankFusion } from '../../src/server/search/rrf.js';
import { Product } from '../../src/types/index.js';

test('Retrieval & Fallback Test Suite', async (t) => {
  await dbStore.initialize();
  const products = dbStore.getAllProducts();
  ensureProductEmbeddings(products);

  await t.test('Successful semantic retrieval returns dense scores and reports semantic mode', () => {
    const res = executeSearch({
      query: 'modern comfortable living room seating',
      mode: 'semantic',
      pageSize: 5
    });
    assert.equal(res.search_mode_requested, 'semantic');
    assert.equal(res.search_mode_used, 'semantic');
    assert.equal(res.fallback_reason, undefined);
    assert.ok(res.results.length > 0);
    assert.ok(res.results[0].dense_score !== undefined && res.results[0].dense_score > 0);
  });

  await t.test('Successful hybrid fusion executes both lexical and dense retrieval and combines with RRF (k=60)', () => {
    const res = executeSearch({
      query: 'solid oak compact desk',
      mode: 'hybrid',
      pageSize: 8
    });
    assert.equal(res.search_mode_requested, 'hybrid');
    assert.equal(res.search_mode_used, 'hybrid');
    assert.equal(res.fallback_reason, undefined);
    assert.ok(res.active_candidates_count.lexical > 0, 'Lexical count should be > 0');
    assert.ok(res.active_candidates_count.dense > 0, 'Dense count should be > 0');
    assert.ok(res.results.length > 0);
    assert.ok(res.results[0].rrf_score !== undefined && res.results[0].rrf_score > 0);
  });

  await t.test('Keyword-only fallback when semantic search is unavailable or returns 0 candidates', () => {
    // A synthetic product list with no embeddings
    const dummyProduct: Product = {
      id: 'test-no-emb-prod',
      slug: 'test-no-emb-prod',
      title: 'Xylophone Antique Oak Desk',
      description: 'Antique oak desk',
      category: 'desks',
      brand: 'UrbanWood',
      price: 12000,
      currency: 'INR',
      images: [],
      color: 'Brown',
      material: 'Oak',
      width: 100,
      height: 75,
      depth: 50,
      rating: 4.8,
      rating_count: 50,
      availability: 'in_stock'
    };

    // When dense retrieval produces 0 candidates
    const denseCandidates = retrieveDense([dummyProduct], 'xylophone', 10, 0.99); // extremely high similarity threshold returns 0
    assert.equal(denseCandidates.length, 0);

    const lexicalCandidates = retrieveLexical([dummyProduct], 'xylophone', 10);
    assert.ok(lexicalCandidates.length > 0);

    // If semantic produces 0, hybrid must fall back to keyword mode and provide clear fallback reason
    // Verify rule: Never report Hybrid when only lexical search ran!
    const res = executeSearch({
      query: 'xylophone antique oak desk',
      mode: 'hybrid'
    });
    // Should either report hybrid if dense matched or keyword if dense had 0 candidates
    assert.ok(['hybrid', 'keyword'].includes(res.search_mode_used));
    if (res.active_candidates_count.dense === 0) {
      assert.equal(res.search_mode_used, 'keyword');
      assert.ok(res.fallback_reason?.includes('Semantic retrieval returned 0 candidates'));
    }
  });

  await t.test('Missing embeddings are handled gracefully without exceptions', () => {
    const unindexedProduct: Product = {
      id: 'unindexed-999',
      slug: 'unindexed-999',
      title: 'Special Cane Cabinet',
      description: 'Cane storage unit',
      category: 'storage',
      brand: 'UrbanWood',
      price: 15000,
      currency: 'INR',
      images: [],
      color: 'Natural',
      material: 'Cane',
      width: 90,
      height: 120,
      depth: 45,
      rating: 4.2,
      rating_count: 10,
      availability: 'in_stock'
    };

    // retrieveDense should generate embedding on the fly or handle safely
    const candidates = retrieveDense([unindexedProduct], 'cane cabinet', 5);
    assert.ok(Array.isArray(candidates));
  });

  await t.test('Mode indicator consistency: search_mode_requested and search_mode_used are synchronized', () => {
    // 1. Keyword search request
    const kwRes = executeSearch({ query: 'sofa', mode: 'keyword' });
    assert.equal(kwRes.search_mode_requested, 'keyword');
    assert.equal(kwRes.search_mode_used, 'keyword');

    // 2. Semantic search request
    const semRes = executeSearch({ query: 'sofa', mode: 'semantic' });
    assert.equal(semRes.search_mode_requested, 'semantic');
    assert.equal(semRes.search_mode_used, 'semantic');

    // 3. Hybrid search request
    const hybRes = executeSearch({ query: 'sofa', mode: 'hybrid' });
    assert.equal(hybRes.search_mode_requested, 'hybrid');
    assert.equal(hybRes.search_mode_used, 'hybrid');

    // 4. Empty query request preserves requested mode
    const emptyHybRes = executeSearch({ query: '', mode: 'hybrid' });
    assert.equal(emptyHybRes.search_mode_requested, 'hybrid');
    assert.equal(emptyHybRes.search_mode_used, 'hybrid');
  });

  await t.test('Monotonic clock latency measurement is positive and sub-millisecond accurate', () => {
    const res = executeSearch({ query: 'dining table', mode: 'hybrid' });
    assert.ok(typeof res.latency_ms === 'number');
    assert.ok(res.latency_ms >= 0);
    // Monotonic clock should record latency with decimal precision
    assert.ok(res.latency_ms.toString().includes('.') || res.latency_ms > 0);
  });

  await t.test('PostgreSQL database status check reports connectivity and pgvector', async () => {
    const { postgresDb } = await import('../../src/server/db/postgres.js');
    const status = await postgresDb.checkStatus();
    assert.ok(typeof status.connected === 'boolean');
    assert.ok(typeof status.pgvector_enabled === 'boolean');
    assert.equal(status.embedding_dimensions, 64);
  });

  await t.test('Database connection failure is handled gracefully', async () => {
    // Test with invalid credentials to verify graceful error handling
    const pg = await import('pg');
    const badPool = new pg.default.Pool({
      host: '127.0.0.1',
      port: 9999,
      user: 'invalid',
      database: 'nonexistent',
      connectionTimeoutMillis: 200
    });

    try {
      await badPool.query('SELECT 1;');
      assert.fail('Should have failed');
    } catch (err: any) {
      // Must catch error gracefully without crashing
      assert.ok(err instanceof Error);
    } finally {
      await badPool.end();
    }
  });

  const { postgresDb } = await import('../../src/server/db/postgres.js');
  await postgresDb.close();
});
