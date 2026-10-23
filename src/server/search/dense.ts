import { Product } from '../../types/index.js';
import { dbStore } from '../db/store.js';
import {
  cosineSimilarity,
  generateDenseEmbedding,
  productToEmbeddingString
} from './embeddings.js';

export interface DenseCandidate {
  product: Product;
  dense_score: number;
  dense_rank: number;
}

/**
 * Ensures all products have precomputed embeddings in store.
 */
export function ensureProductEmbeddings(products: Product[]): void {
  const currentEmbeddings = dbStore.getAllEmbeddings();
  const missing: Record<string, number[]> = {};
  let count = 0;

  for (const product of products) {
    if (!currentEmbeddings[product.id]) {
      const text = productToEmbeddingString(product);
      missing[product.id] = generateDenseEmbedding(text);
      count++;
    }
  }

  if (count > 0) {
    dbStore.setAllEmbeddings(missing);
    console.log(`[DenseEngine] Generated and cached embeddings for ${count} products.`);
  }
}

/**
 * Retrieves nearest neighbor products using cosine distance / similarity.
 */
export function retrieveDense(
  products: Product[],
  query: string,
  topK = 50,
  minSimilarity = 0.05
): DenseCandidate[] {
  if (!query.trim()) return [];

  // Generate embedding for query
  const queryVector = generateDenseEmbedding(query);
  const candidates: { product: Product; score: number }[] = [];

  for (const product of products) {
    let embedding = dbStore.getEmbedding(product.id);
    if (!embedding) {
      embedding = generateDenseEmbedding(productToEmbeddingString(product));
      dbStore.setEmbedding(product.id, embedding);
    }

    const similarity = cosineSimilarity(queryVector, embedding);
    if (similarity >= minSimilarity) {
      candidates.push({ product, score: similarity });
    }
  }

  // Sort descending by similarity
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.product.rating !== a.product.rating) return b.product.rating - a.product.rating;
    return a.product.id.localeCompare(b.product.id);
  });

  const sliced = candidates.slice(0, topK);

  return sliced.map((c, idx) => ({
    product: c.product,
    dense_score: parseFloat(c.score.toFixed(4)),
    dense_rank: idx + 1
  }));
}
