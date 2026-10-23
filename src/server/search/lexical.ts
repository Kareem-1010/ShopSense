import { Product } from '../../types/index.js';

export interface LexicalCandidate {
  product: Product;
  lexical_score: number;
  lexical_rank: number;
  matched_terms: string[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'rupees', 'rs', 'inr', 'this', 'that', 'these', 'those'
]);

const SYNONYMS: Record<string, string[]> = {
  couch: ['sofa', 'settee', 'loveseat', 'daybed'],
  sofa: ['couch', 'settee', 'loveseat'],
  desk: ['workstation', 'table', 'writing'],
  workstation: ['desk', 'table'],
  credenza: ['sideboard', 'storage', 'cabinet', 'dresser'],
  sideboard: ['credenza', 'storage', 'buffet'],
  etagere: ['bookshelf', 'shelf', 'tower'],
  bookcase: ['bookshelf', 'shelf', 'shelves'],
  bookshelf: ['bookcase', 'shelf', 'shelves'],
  shelves: ['shelf', 'bookshelf', 'etagere'],
  carpet: ['rug', 'runner', 'mat'],
  rug: ['carpet', 'runner'],
  lamp: ['light', 'lighting', 'sconce'],
  light: ['lamp', 'lighting', 'chandelier'],
  lighting: ['lamp', 'light'],
  chair: ['armchair', 'seat', 'stool'],
  armchair: ['chair', 'accent'],
  bed: ['cot', 'tatami', 'platform'],
  cupboard: ['wardrobe', 'storage', 'armoire'],
  wardrobe: ['cupboard', 'storage', 'armoire'],
  dresser: ['chest', 'drawers', 'storage']
};

/**
 * Normalizes query string into cleaned tokens.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Expands tokens with domain synonyms.
 */
export function expandTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    if (SYNONYMS[t]) {
      SYNONYMS[t].forEach((syn) => expanded.add(syn));
    }
  }
  return Array.from(expanded);
}

/**
 * Computes PostgreSQL-style weighted lexical match score for a product.
 * Title: Weight A (1.0)
 * Category/Brand: Weight B (0.8)
 * Material/Color: Weight C (0.6)
 * Description: Weight D (0.3)
 */
export function scoreProductLexical(product: Product, queryTokens: string[], originalQuery: string): { score: number; matchedTerms: string[] } {
  if (queryTokens.length === 0) {
    return { score: 0, matchedTerms: [] };
  }

  const titleLower = product.title.toLowerCase();
  const catLower = product.category.toLowerCase();
  const brandLower = product.brand.toLowerCase();
  const matLower = product.material.toLowerCase();
  const colorLower = product.color.toLowerCase();
  const descLower = product.description.toLowerCase();

  let score = 0;
  const matchedTerms = new Set<string>();

  // Check each query token
  for (const token of queryTokens) {
    let tokenMatched = false;

    // Weight A: Title (exact word or prefix)
    if (titleLower.includes(token)) {
      score += 4.0;
      tokenMatched = true;
    }

    // Weight B: Category / Brand
    if (catLower.includes(token)) {
      score += 3.5;
      tokenMatched = true;
    }
    if (brandLower.includes(token)) {
      score += 3.0;
      tokenMatched = true;
    }

    // Weight C: Material / Color
    if (matLower.includes(token)) {
      score += 2.5;
      tokenMatched = true;
    }
    if (colorLower.includes(token)) {
      score += 2.0;
      tokenMatched = true;
    }

    // Weight D: Description
    if (descLower.includes(token)) {
      score += 1.0;
      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedTerms.add(token);
    }
  }

  // Exact phrase match bonus
  const cleanOriginal = originalQuery.toLowerCase().trim();
  if (cleanOriginal.length > 3) {
    if (titleLower.includes(cleanOriginal)) {
      score += 8.0;
    } else if (descLower.includes(cleanOriginal)) {
      score += 3.0;
    }
  }

  // Multi-term coverage penalty/bonus:
  // Candidate matching 3 of 3 tokens should rank strictly higher than candidate matching 1 of 3
  const coverageRatio = matchedTerms.size / queryTokens.length;
  score = score * (0.5 + 0.5 * coverageRatio);

  return { score, matchedTerms: Array.from(matchedTerms) };
}

/**
 * Retrieves and ranks products lexically.
 */
export function retrieveLexical(products: Product[], query: string, topK = 50): LexicalCandidate[] {
  const rawTokens = tokenize(query);
  const expandedTokens = expandTokens(rawTokens);

  if (rawTokens.length === 0) {
    // Return empty if query has no searchable tokens
    return [];
  }

  const candidates: { product: Product; score: number; matchedTerms: string[] }[] = [];

  for (const product of products) {
    const { score, matchedTerms } = scoreProductLexical(product, expandedTokens, query);
    if (score > 0) {
      candidates.push({ product, score, matchedTerms });
    }
  }

  // Sort descending by score, tie-break by rating and id
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.product.rating !== a.product.rating) return b.product.rating - a.product.rating;
    return a.product.id.localeCompare(b.product.id);
  });

  const sliced = candidates.slice(0, topK);

  return sliced.map((c, idx) => ({
    product: c.product,
    lexical_score: parseFloat(c.score.toFixed(4)),
    lexical_rank: idx + 1,
    matched_terms: c.matchedTerms
  }));
}
