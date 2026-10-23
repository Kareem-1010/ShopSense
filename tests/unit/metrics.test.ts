import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePrecisionAtK,
  computeRecallAtK,
  computeMRRAtK,
  computeNDCGAtK,
  computeQueryMetrics
} from '../../src/server/evaluation/metrics.js';

test('Precision@K hand-calculated examples', () => {
  const relevant = new Set(['doc1', 'doc2', 'doc3', 'doc4']);

  // Top 5 has 3 relevant: doc1, doc2, doc3 -> Precision@5 = 3/5 = 0.6
  const retrieved1 = ['doc1', 'doc2', 'docX', 'doc3', 'docY'];
  assert.equal(computePrecisionAtK(retrieved1, relevant, 5), 0.6);

  // Top 10 has 4 relevant -> Precision@10 = 4/10 = 0.4
  const retrieved2 = ['doc1', 'docX', 'doc2', 'docY', 'doc3', 'docZ', 'doc4', 'docA', 'docB', 'docC'];
  assert.equal(computePrecisionAtK(retrieved2, relevant, 10), 0.4);

  // Zero-result query handling: empty relevant set and empty retrieved
  assert.equal(computePrecisionAtK([], new Set(), 5), 1.0);

  // Zero-result query handling: empty relevant set but retrieved junk -> 0.0
  assert.equal(computePrecisionAtK(['docJunk'], new Set(), 5), 0.0);
});

test('Recall@K hand-calculated examples', () => {
  const relevant = new Set(['doc1', 'doc2', 'doc3', 'doc4']); // Total 4 relevant

  // Top 5 contains 2 relevant -> Recall@5 = 2/4 = 0.5
  const retrieved1 = ['doc1', 'docX', 'docY', 'doc2', 'docZ'];
  assert.equal(computeRecallAtK(retrieved1, relevant, 5), 0.5);

  // Top 5 contains all 4 relevant -> Recall@5 = 4/4 = 1.0
  const retrieved2 = ['doc1', 'doc2', 'doc3', 'doc4', 'docX'];
  assert.equal(computeRecallAtK(retrieved2, relevant, 5), 1.0);

  // Empty relevant set
  assert.equal(computeRecallAtK([], new Set(), 5), 1.0);
});

test('MRR@10 hand-calculated examples', () => {
  const relevant = new Set(['targetA', 'targetB']);

  // First relevant at rank 1 -> MRR = 1/1 = 1.0
  assert.equal(computeMRRAtK(['targetA', 'other1'], relevant, 10), 1.0);

  // First relevant at rank 2 -> MRR = 1/2 = 0.5
  assert.equal(computeMRRAtK(['other1', 'targetB'], relevant, 10), 0.5);

  // First relevant at rank 4 -> MRR = 1/4 = 0.25
  assert.equal(computeMRRAtK(['o1', 'o2', 'o3', 'targetA'], relevant, 10), 0.25);

  // No relevant in top 10 -> MRR = 0
  assert.equal(computeMRRAtK(['o1', 'o2'], relevant, 10), 0);
});

test('NDCG@10 hand-calculated examples', () => {
  // Grades: doc1 = 2 (high), doc2 = 1 (medium)
  const grades = { doc1: 2, doc2: 1 };

  // Ideal ranking: [doc1, doc2] -> NDCG = 1.0
  const ideal = ['doc1', 'doc2', 'doc3'];
  const ndcgIdeal = computeNDCGAtK(ideal, grades, 3);
  assert.equal(Math.abs(ndcgIdeal - 1.0) < 0.0001, true);

  // Sub-optimal ranking: [doc2, doc1] (medium before high)
  // DCG = (2^1 - 1)/log2(2) + (2^2 - 1)/log2(3) = 1 + 3/1.5849625 = 1 + 1.892789 = 2.892789
  // IDCG = (2^2 - 1)/1 + (2^1 - 1)/log2(3) = 3 + 1/1.5849625 = 3 + 0.6309297 = 3.6309297
  // Expected NDCG = 2.892789 / 3.6309297 = 0.7967
  const suboptimal = ['doc2', 'doc1', 'doc3'];
  const ndcgSub = computeNDCGAtK(suboptimal, grades, 3);
  assert.equal(Math.abs(ndcgSub - 0.7967) < 0.001, true);
});

test('computeQueryMetrics aggregates correctly', () => {
  const retrieved = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'];
  const relevant = ['doc1', 'doc3'];
  const grades = { doc1: 2, doc3: 1 };

  const metrics = computeQueryMetrics(retrieved, relevant, grades);
  assert.equal(metrics.precision_at_5, 0.4); // 2 out of 5
  assert.equal(metrics.recall_at_5, 1.0); // 2 out of 2
  assert.equal(metrics.mrr_at_10, 1.0); // first at rank 1
  assert.ok(metrics.ndcg_at_10 > 0.8);
});
