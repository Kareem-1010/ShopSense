import { EvaluationMetricResult } from '../../types/index.js';

/**
 * Computes Precision@K:
 * Proportion of retrieved items in top-K that are relevant.
 * For zero-result queries (no ground truth relevant items):
 * If system retrieves 0 items, Precision = 1.0; if system retrieves items, Precision = 0.0.
 */
export function computePrecisionAtK(retrievedIds: string[], relevantIds: Set<string>, k: number): number {
  if (k <= 0) return 0;

  if (relevantIds.size === 0) {
    return retrievedIds.length === 0 ? 1.0 : 0.0;
  }

  const topK = retrievedIds.slice(0, k);
  let relevantCount = 0;
  for (const id of topK) {
    if (relevantIds.has(id)) {
      relevantCount++;
    }
  }

  return relevantCount / k;
}

/**
 * Computes Recall@K:
 * Proportion of all ground-truth relevant items that are retrieved in top-K.
 * For zero-result queries:
 * If ground truth is 0 and system returns 0, Recall = 1.0; else 0.0.
 */
export function computeRecallAtK(retrievedIds: string[], relevantIds: Set<string>, k: number): number {
  if (relevantIds.size === 0) {
    return retrievedIds.length === 0 ? 1.0 : 0.0;
  }

  const topK = retrievedIds.slice(0, k);
  let relevantCount = 0;
  for (const id of topK) {
    if (relevantIds.has(id)) {
      relevantCount++;
    }
  }

  return relevantCount / relevantIds.size;
}

/**
 * Computes Mean Reciprocal Rank (MRR@K):
 * Reciprocal rank (1 / rank) of the first relevant document in top-K.
 * Returns 0 if no relevant document appears in top-K.
 */
export function computeMRRAtK(retrievedIds: string[], relevantIds: Set<string>, k: number): number {
  if (relevantIds.size === 0) return 0;

  const topK = retrievedIds.slice(0, k);
  for (let i = 0; i < topK.length; i++) {
    if (relevantIds.has(topK[i])) {
      return 1.0 / (i + 1);
    }
  }

  return 0;
}

/**
 * Computes Normalized Discounted Cumulative Gain (NDCG@K):
 * Evaluates graded relevance ranking quality:
 * DCG@K = sum_{i=1}^k (2^{rel_i} - 1) / log2(i + 1)
 * NDCG@K = DCG@K / IDCG@K
 */
export function computeNDCGAtK(
  retrievedIds: string[],
  relevanceGrades: Record<string, number>,
  k: number
): number {
  if (k <= 0) return 0;

  const topK = retrievedIds.slice(0, k);

  // Compute DCG
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    const grade = relevanceGrades[topK[i]] || 0;
    if (grade > 0) {
      const gain = Math.pow(2, grade) - 1;
      const discount = Math.log2(i + 2); // i=0 -> log2(2) = 1
      dcg += gain / discount;
    }
  }

  // Compute Ideal DCG (IDCG)
  const allGrades = Object.values(relevanceGrades).filter((g) => g > 0);
  allGrades.sort((a, b) => b - a);
  const idealTopK = allGrades.slice(0, k);

  if (idealTopK.length === 0) {
    // If no relevant items exist
    return retrievedIds.length === 0 ? 1.0 : 0.0;
  }

  let idcg = 0;
  for (let i = 0; i < idealTopK.length; i++) {
    const gain = Math.pow(2, idealTopK[i]) - 1;
    const discount = Math.log2(i + 2);
    idcg += gain / discount;
  }

  if (idcg === 0) return 0;
  return dcg / idcg;
}

/**
 * Computes all 6 evaluation metrics for a single query.
 */
export function computeQueryMetrics(
  retrievedIds: string[],
  relevantIds: string[],
  relevanceGrades: Record<string, number>
): EvaluationMetricResult {
  const relSet = new Set(relevantIds);

  return {
    precision_at_5: parseFloat(computePrecisionAtK(retrievedIds, relSet, 5).toFixed(4)),
    precision_at_10: parseFloat(computePrecisionAtK(retrievedIds, relSet, 10).toFixed(4)),
    recall_at_5: parseFloat(computeRecallAtK(retrievedIds, relSet, 5).toFixed(4)),
    recall_at_10: parseFloat(computeRecallAtK(retrievedIds, relSet, 10).toFixed(4)),
    mrr_at_10: parseFloat(computeMRRAtK(retrievedIds, relSet, 10).toFixed(4)),
    ndcg_at_10: parseFloat(computeNDCGAtK(retrievedIds, relevanceGrades, 10).toFixed(4))
  };
}
