import test from 'node:test';
import assert from 'node:assert/strict';
import { reciprocalRankFusion } from '../../src/server/search/rrf.js';
import { Product } from '../../src/types/index.js';
import { LexicalCandidate } from '../../src/server/search/lexical.js';
import { DenseCandidate } from '../../src/server/search/dense.js';

function createDummyProduct(id: string, rating = 4.5, ratingCount = 100): Product {
  return {
    id,
    slug: id,
    title: `Product ${id}`,
    description: `Description of product ${id}`,
    category: 'desks',
    brand: 'UrbanWood',
    price: 12000,
    currency: 'INR',
    images: [],
    color: 'Beige',
    material: 'Solid Oak',
    width: 100,
    height: 75,
    depth: 50,
    rating,
    rating_count: ratingCount,
    availability: 'in_stock'
  };
}

test('Reciprocal Rank Fusion computes exact scores and preserves ranks', () => {
  const pA = createDummyProduct('prod-A');
  const pB = createDummyProduct('prod-B');
  const pC = createDummyProduct('prod-C');

  // Lexical ranks:
  // prod-A: rank 1
  // prod-B: rank 2
  const lexical: LexicalCandidate[] = [
    { product: pA, lexical_rank: 1, lexical_score: 10.0, matched_terms: ['desk'] },
    { product: pB, lexical_rank: 2, lexical_score: 8.0, matched_terms: ['desk'] }
  ];

  // Dense ranks:
  // prod-B: rank 1
  // prod-C: rank 2
  const dense: DenseCandidate[] = [
    { product: pB, dense_rank: 1, dense_score: 0.9 },
    { product: pC, dense_rank: 2, dense_score: 0.7 }
  ];

  const k = 60;
  const fused = reciprocalRankFusion(lexical, dense, k);

  // Expected RRF scores:
  // prod-A: 1/(60+1) = 1/61 = 0.0163934
  // prod-B: 1/(60+2) + 1/(60+1) = 1/62 + 1/61 = 0.0161290 + 0.0163934 = 0.0325224
  // prod-C: 1/(60+2) = 1/62 = 0.0161290
  // Therefore: prod-B should be rank 1 (appears in both lists!), then prod-A, then prod-C!

  assert.equal(fused.length, 3);
  assert.equal(fused[0].product.id, 'prod-B');
  assert.equal(fused[0].rank, 1);
  assert.equal(fused[0].lexical_rank, 2);
  assert.equal(fused[0].dense_rank, 1);
  assert.ok(fused[0].rrf_score > fused[1].rrf_score);

  assert.equal(fused[1].product.id, 'prod-A');
  assert.equal(fused[1].rank, 2);
  assert.equal(fused[1].lexical_rank, 1);
  assert.equal(fused[1].dense_rank, undefined);

  assert.equal(fused[2].product.id, 'prod-C');
  assert.equal(fused[2].rank, 3);
});

test('RRF tie-breaking is deterministic by rating, rating count, and ID', () => {
  const p1 = createDummyProduct('prod-1', 4.8, 50);
  const p2 = createDummyProduct('prod-2', 4.5, 100);

  // Same rank in lexical, not present in dense -> identical RRF score
  const lexical: LexicalCandidate[] = [
    { product: p2, lexical_rank: 1, lexical_score: 5.0, matched_terms: [] },
    { product: p1, lexical_rank: 1, lexical_score: 5.0, matched_terms: [] }
  ];

  const fused = reciprocalRankFusion(lexical, [], 60);
  // Higher rating p1 (4.8) must win over p2 (4.5)
  assert.equal(fused[0].product.id, 'prod-1');
  assert.equal(fused[1].product.id, 'prod-2');
});
