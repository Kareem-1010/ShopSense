import test from 'node:test';
import assert from 'node:assert/strict';
import { dbStore } from '../../src/server/db/store.js';
import { executeSearch } from '../../src/server/search/service.js';
import { getSimilarProducts, getPersonalizedRecommendations } from '../../src/server/recommendations/index.js';
import { ensureProductEmbeddings } from '../../src/server/search/dense.js';

test('Integration: DB Store & Search Engine', async (t) => {
  await dbStore.initialize();
  const products = dbStore.getAllProducts();
  assert.ok(products.length >= 500, `Expected at least 500 products, got ${products.length}`);

  // Ensure embeddings are populated
  ensureProductEmbeddings(products);

  await t.test('Keyword Search works and returns ranked results', () => {
    const res = executeSearch({
      query: 'wooden desk',
      mode: 'keyword',
      pageSize: 10
    });
    assert.equal(res.search_mode_used, 'keyword');
    assert.ok(res.results.length > 0);
    assert.ok(res.results[0].product.title.toLowerCase().includes('desk') || res.results[0].product.category === 'desks');
    assert.ok(res.results[0].lexical_score! > 0);
  });

  await t.test('Semantic Search works using cosine similarity', () => {
    const res = executeSearch({
      query: 'cozy warm reading lighting for corner',
      mode: 'semantic',
      pageSize: 10
    });
    assert.equal(res.search_mode_used, 'semantic');
    assert.ok(res.results.length > 0);
    assert.ok(res.results[0].dense_score! > 0);
    assert.ok(res.results[0].explanation.dense_similarity > 0);
  });

  await t.test('Hybrid Retrieval (RRF) combines signals and breaks ties deterministically', () => {
    const res = executeSearch({
      query: 'compact wooden desk under 15000',
      mode: 'hybrid',
      pageSize: 10
    });
    assert.equal(res.search_mode_used, 'hybrid');
    assert.ok(res.results.length > 0);
    const topItem = res.results[0];
    assert.ok(topItem.rrf_score! > 0);
    assert.ok(topItem.product.price <= 15000);
    assert.ok(topItem.explanation.summary.length > 0);
  });

  await t.test('Similar Products recommendation excludes self', () => {
    const target = products[0];
    const recs = getSimilarProducts({ productId: target.id, limit: 5 });
    assert.ok(recs.length > 0);
    assert.ok(!recs.some((r) => r.product.id === target.id), 'Should not recommend self');
    assert.ok(recs[0].score > 0);
  });

  await t.test('Session personalization records events and adapts recommendations', () => {
    const testSession = `test-sess-${Date.now()}`;

    // Cold start recommendations
    const coldRecs = getPersonalizedRecommendations(testSession, 6);
    assert.equal(coldRecs.strategy_used, 'cold_start_curated');
    assert.equal(coldRecs.recommendations.length, 6);

    // Record interaction events on lighting products
    const lightingProds = products.filter((p) => p.category === 'lighting').slice(0, 3);
    for (const lp of lightingProds) {
      dbStore.recordUserInteraction({
        session_id: testSession,
        product_id: lp.id,
        event_type: 'save'
      });
    }

    // Personalized recommendations should now activate
    const warmRecs = getPersonalizedRecommendations(testSession, 6);
    assert.equal(warmRecs.strategy_used, 'interaction_personalized');
    assert.ok(warmRecs.recommendations.length > 0);
  });

  const { postgresDb } = await import('../../src/server/db/postgres.js');
  await postgresDb.close();
});
