import { Product } from '../../types/index.js';
import { LexicalCandidate } from './lexical.js';
import { DenseCandidate } from './dense.js';

export interface HybridCandidate {
  product: Product;
  rrf_score: number;
  rank: number;
  lexical_rank?: number;
  dense_rank?: number;
  lexical_score?: number;
  dense_score?: number;
  matched_terms?: string[];
}

export const DEFAULT_RRF_K = 60;

/**
 * Combines ranked lists from Lexical and Dense retrieval using standard Reciprocal Rank Fusion:
 * RRF_score(d) = sum_{system} (1 / (k + rank_{system}(d)))
 *
 * Preserves component ranks, scores, deduplicates candidates, and ensures deterministic tie breaking.
 */
export function reciprocalRankFusion(
  lexicalCandidates: LexicalCandidate[],
  denseCandidates: DenseCandidate[],
  k: number = DEFAULT_RRF_K
): HybridCandidate[] {
  const candidateMap = new Map<
    string,
    {
      product: Product;
      rrf_score: number;
      lexical_rank?: number;
      dense_rank?: number;
      lexical_score?: number;
      dense_score?: number;
      matched_terms?: string[];
    }
  >();

  // Process Lexical ranked list
  for (const item of lexicalCandidates) {
    const id = item.product.id;
    const rrfLexical = 1.0 / (k + item.lexical_rank);

    candidateMap.set(id, {
      product: item.product,
      rrf_score: rrfLexical,
      lexical_rank: item.lexical_rank,
      lexical_score: item.lexical_score,
      matched_terms: item.matched_terms
    });
  }

  // Process Dense ranked list
  for (const item of denseCandidates) {
    const id = item.product.id;
    const rrfDense = 1.0 / (k + item.dense_rank);

    if (candidateMap.has(id)) {
      const existing = candidateMap.get(id)!;
      existing.rrf_score += rrfDense;
      existing.dense_rank = item.dense_rank;
      existing.dense_score = item.dense_score;
    } else {
      candidateMap.set(id, {
        product: item.product,
        rrf_score: rrfDense,
        dense_rank: item.dense_rank,
        dense_score: item.dense_score
      });
    }
  }

  // Convert map to array
  const combined = Array.from(candidateMap.values());

  // Deterministic sort:
  // 1. RRF score descending
  // 2. Product average rating descending
  // 3. Product rating count descending
  // 4. Product ID ascending (strict tie breaker)
  combined.sort((a, b) => {
    if (Math.abs(b.rrf_score - a.rrf_score) > 1e-9) {
      return b.rrf_score - a.rrf_score;
    }
    if (b.product.rating !== a.product.rating) {
      return b.product.rating - a.product.rating;
    }
    if (b.product.rating_count !== a.product.rating_count) {
      return b.product.rating_count - a.product.rating_count;
    }
    return a.product.id.localeCompare(b.product.id);
  });

  return combined.map((item, index) => ({
    product: item.product,
    rrf_score: parseFloat(item.rrf_score.toFixed(6)),
    rank: index + 1,
    lexical_rank: item.lexical_rank,
    dense_rank: item.dense_rank,
    lexical_score: item.lexical_score,
    dense_score: item.dense_score,
    matched_terms: item.matched_terms
  }));
}
