import {
  Product,
  RecommendationItem,
  RecommendationResponse
} from '../../types/index.js';
import { dbStore } from '../db/store.js';
import { cosineSimilarity } from '../search/embeddings.js';

export interface GetSimilarOptions {
  productId: string;
  limit?: number;
}

/**
 * Strategy A: Content-Based Recommendations
 * Uses dense vector cosine similarity penalized or boosted by category & price proximity.
 */
export function getSimilarProducts(options: GetSimilarOptions): RecommendationItem[] {
  const { productId, limit = 6 } = options;
  const targetProduct = dbStore.getProductById(productId);
  if (!targetProduct) return [];

  const targetEmbedding = dbStore.getEmbedding(productId);
  if (!targetEmbedding) return [];

  const allProducts = dbStore.getAllProducts();
  const scored: RecommendationItem[] = [];

  for (const product of allProducts) {
    if (product.id === productId) continue; // Exclude self

    const prodEmbedding = dbStore.getEmbedding(product.id);
    if (!prodEmbedding) continue;

    const baseSimilarity = cosineSimilarity(targetEmbedding, prodEmbedding);

    // Multi-signal compatibility score
    let score = baseSimilarity * 0.7;

    // Category match bonus
    const sameCategory = product.category === targetProduct.category;
    if (sameCategory) {
      score += 0.2;
    }

    // Material overlap bonus
    if (product.material.toLowerCase() === targetProduct.material.toLowerCase()) {
      score += 0.05;
    }

    // Price ratio proximity (closer prices get slight bonus)
    const priceRatio = Math.min(product.price, targetProduct.price) / Math.max(product.price, targetProduct.price);
    score += priceRatio * 0.05;

    let reason = `High visual and stylistic similarity (${Math.round(baseSimilarity * 100)}% match)`;
    if (sameCategory && product.price < targetProduct.price) {
      reason = `Same category alternative at ₹${(targetProduct.price - product.price).toLocaleString('en-IN')} lower price`;
    } else if (sameCategory && product.material === targetProduct.material) {
      reason = `Matches category '${product.category}' in ${product.material}`;
    }

    scored.push({
      product,
      score: parseFloat(score.toFixed(4)),
      reason_code: sameCategory ? 'content_similarity' : 'category_complementary',
      reason_description: reason
    });
  }

  scored.sort((a, b) => b.score - a.score || b.product.rating - a.product.rating);
  return scored.slice(0, limit);
}

/**
 * Strategy B: Interaction-Based Personalization & Cold-Start Fallback
 * Aggregates anonymous session interaction events (view weight 1, click weight 2, save weight 4)
 * to compute user category preference distribution and centroid embedding.
 */
export function getPersonalizedRecommendations(sessionId: string, limit = 8): RecommendationResponse {
  const startTime = Date.now();
  const allProducts = dbStore.getAllProducts();
  const interactions = dbStore.getUserInteractions(sessionId);

  // Cold Start: if session has no interactions or fewer than 2 interactions
  if (!interactions || interactions.length === 0) {
    const popularProducts = [...allProducts]
      .filter((p) => p.availability !== 'out_of_stock')
      .sort((a, b) => b.rating * b.rating_count - a.rating * a.rating_count)
      .slice(0, limit * 2);

    // Pick top items from diverse categories
    const chosen: RecommendationItem[] = [];
    const usedCategories = new Set<string>();

    for (const prod of popularProducts) {
      if (!usedCategories.has(prod.category)) {
        usedCategories.add(prod.category);
        chosen.push({
          product: prod,
          score: parseFloat((prod.rating / 5.0).toFixed(4)),
          reason_code: 'cold_start_popular',
          reason_description: `Trending highly-rated discovery in ${prod.category} (${prod.rating}★)`
        });
        if (chosen.length >= limit) break;
      }
    }

    // Fill remaining if needed
    for (const prod of popularProducts) {
      if (chosen.length >= limit) break;
      if (!chosen.some((c) => c.product.id === prod.id)) {
        chosen.push({
          product: prod,
          score: parseFloat((prod.rating / 5.0).toFixed(4)),
          reason_code: 'cold_start_popular',
          reason_description: `Popular customer favorite with ${prod.rating_count} reviews`
        });
      }
    }

    return {
      session_id: sessionId,
      strategy_used: 'cold_start_curated',
      recommendations: chosen.slice(0, limit),
      latency_ms: Date.now() - startTime
    };
  }

  // Active Session: Calculate Category Affinities and User Centroid Vector
  const categoryWeights: Record<string, number> = {};
  const interactedProductIds = new Set<string>();
  const EVENT_WEIGHTS: Record<string, number> = {
    view: 1.0,
    click: 2.0,
    save: 4.0,
    compare: 2.5
  };

  const centroidVector = new Array(64).fill(0);
  let totalCentroidWeight = 0;

  for (const ev of interactions) {
    interactedProductIds.add(ev.product_id);
    const weight = EVENT_WEIGHTS[ev.event_type] || 1.0;
    const product = dbStore.getProductById(ev.product_id);
    if (!product) continue;

    categoryWeights[product.category] = (categoryWeights[product.category] || 0) + weight;

    const embedding = dbStore.getEmbedding(product.id);
    if (embedding) {
      for (let i = 0; i < embedding.length; i++) {
        centroidVector[i] += embedding[i] * weight;
      }
      totalCentroidWeight += weight;
    }
  }

  // Normalize centroid
  if (totalCentroidWeight > 0) {
    for (let i = 0; i < centroidVector.length; i++) {
      centroidVector[i] /= totalCentroidWeight;
    }
  }

  // Score candidate products that haven't been saved/interacted
  const candidates: RecommendationItem[] = [];

  for (const product of allProducts) {
    if (interactedProductIds.has(product.id)) continue; // Don't recommend items already seen

    const prodEmbedding = dbStore.getEmbedding(product.id);
    if (!prodEmbedding) continue;

    const semanticAffinity = totalCentroidWeight > 0
      ? cosineSimilarity(centroidVector, prodEmbedding)
      : 0.3;

    const catWeight = categoryWeights[product.category] || 0;
    const catBonus = Math.min(0.4, catWeight * 0.08);

    const score = semanticAffinity * 0.6 + catBonus + (product.rating / 5.0) * 0.1;

    let reason = 'Curated based on your browsing style and aesthetic preferences';
    if (catWeight > 0) {
      reason = `Recommended based on your interest in ${product.category}`;
    }

    candidates.push({
      product,
      score: parseFloat(score.toFixed(4)),
      reason_code: 'user_history_affinity',
      reason_description: reason
    });
  }

  candidates.sort((a, b) => b.score - a.score || b.product.rating - a.product.rating);

  return {
    session_id: sessionId,
    strategy_used: 'interaction_personalized',
    recommendations: candidates.slice(0, limit),
    latency_ms: Date.now() - startTime
  };
}
