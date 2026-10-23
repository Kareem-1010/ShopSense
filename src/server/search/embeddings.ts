import { Product } from '../../types/index.js';

export const EMBEDDING_DIMENSION = 64;
export const EMBEDDING_MODEL_ID = 'shopsense-dense-v1';

// Domain vocabulary semantic anchors for furniture & home goods discovery
const SEMANTIC_CONCEPTS: string[] = [
  // Categories
  'desk', 'workstation', 'table', 'chair', 'armchair', 'sofa', 'couch', 'bed', 'mattress', 'storage', 'cabinet', 'credenza', 'dining', 'lamp', 'light', 'rug', 'carpet', 'shelf', 'bookcase', 'decor',
  // Attributes & space constraints
  'compact', 'small', 'apartment', 'spacious', 'modular', 'drawer', 'hydraulic', 'ergonomic', 'lumbar', 'swivel', 'comfortable', 'cozy', 'minimalist', 'modern', 'vintage', 'rustic', 'luxury', 'affordable', 'budget', 'reading',
  // Materials
  'wood', 'oak', 'sheesham', 'teak', 'walnut', 'leather', 'boucle', 'fabric', 'velvet', 'linen', 'metal', 'steel', 'brass', 'marble', 'glass', 'wool', 'jute', 'ceramic',
  // Colors & aesthetic
  'warm', 'beige', 'brown', 'black', 'white', 'grey', 'green', 'terracotta'
];

/**
 * Computes cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Computes L2 norm of a vector.
 */
function l2Normalize(vector: number[]): number[] {
  let sumSq = 0;
  for (const v of vector) sumSq += v * v;
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

/**
 * Generates a deterministic, normalized 64-dimensional dense semantic embedding
 * for any text string using n-gram semantic hashing and domain concept alignment.
 */
export function generateDenseEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);

  // 1. Concept projection into semantic dimensions (first 46 dimensions)
  for (let i = 0; i < SEMANTIC_CONCEPTS.length && i < EMBEDDING_DIMENSION; i++) {
    const concept = SEMANTIC_CONCEPTS[i];
    let conceptWeight = 0;

    for (const token of tokens) {
      if (token === concept) {
        conceptWeight += 2.0;
      } else if (token.includes(concept) || concept.includes(token)) {
        conceptWeight += 0.8;
      }
    }

    // Bigram match bonus
    for (let t = 0; t < tokens.length - 1; t++) {
      const bigram = `${tokens[t]} ${tokens[t + 1]}`;
      if (bigram.includes(concept)) {
        conceptWeight += 1.2;
      }
    }

    vector[i] = conceptWeight;
  }

  // 2. Character n-gram hashing for subword generalizability (remaining dimensions)
  for (let i = 0; i < text.length - 2; i++) {
    const trigram = text.substring(i, i + 3).toLowerCase();
    let hash = 0;
    for (let c = 0; c < trigram.length; c++) {
      hash = (hash << 5) - hash + trigram.charCodeAt(c);
      hash |= 0;
    }
    const bucket = Math.abs(hash) % EMBEDDING_DIMENSION;
    vector[bucket] += 0.3;
  }

  // 3. Category/Material semantic synergy
  if (tokens.includes('desk') || tokens.includes('table')) {
    vector[0] += 1.5;
    if (tokens.includes('small') || tokens.includes('compact') || tokens.includes('apartment')) {
      vector[20] += 2.0; // compact dimension
    }
  }

  if (tokens.includes('sofa') || tokens.includes('couch')) {
    vector[5] += 1.5;
    if (tokens.includes('beige') || tokens.includes('cream')) {
      vector[57] += 1.8;
    }
  }

  if (tokens.includes('bed') && (tokens.includes('storage') || tokens.includes('drawers'))) {
    vector[7] += 1.5;
    vector[25] += 2.2;
  }

  if (tokens.includes('lamp') || tokens.includes('light') || tokens.includes('reading')) {
    vector[13] += 1.8;
    vector[39] += 2.0; // reading corner dimension
  }

  return l2Normalize(vector);
}

/**
 * Creates the combined embedding string for a product.
 */
export function productToEmbeddingString(product: Product): string {
  return [
    product.title,
    product.category,
    product.brand,
    product.material,
    product.color,
    `dimensions ${product.width}x${product.height}x${product.depth} cm`,
    product.description
  ].join('. ');
}
