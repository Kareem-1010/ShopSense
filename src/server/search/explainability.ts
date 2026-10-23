import { Product, ParsedQuery, ExplanationSignals } from '../../types/index.js';

export function buildExplanationSignals(
  product: Product,
  parsed: ParsedQuery,
  denseSimilarity: number,
  lexicalScore: number,
  lexicalRank?: number,
  denseRank?: number,
  rrfScore?: number
): ExplanationSignals {
  // Category match
  const matchedCategory = Boolean(
    parsed.extracted_category &&
    product.category.toLowerCase() === parsed.extracted_category.toLowerCase()
  );

  // Material match
  const matchedMaterials = parsed.extracted_materials.filter((m) =>
    product.material.toLowerCase().includes(m.toLowerCase())
  );

  // Color match
  const matchedColors = parsed.extracted_colors.filter((c) =>
    product.color.toLowerCase().includes(c.toLowerCase())
  );

  // Matched title terms
  const titleTokens = product.title.toLowerCase().split(/\s+/);
  const queryTokens = parsed.normalized_query.split(/\s+/).filter((t) => t.length > 2);
  const matchedTitleTerms = queryTokens.filter((qt) =>
    titleTokens.some((tt) => tt.includes(qt) || qt.includes(tt))
  );

  // Price constraint satisfied
  let priceSatisfied = true;
  if (parsed.extracted_price_max !== undefined && product.price > parsed.extracted_price_max) {
    priceSatisfied = false;
  }
  if (parsed.extracted_price_min !== undefined && product.price < parsed.extracted_price_min) {
    priceSatisfied = false;
  }

  // Dense semantic relevance tier
  let denseRelevance: 'high' | 'medium' | 'low' | 'none' = 'none';
  if (denseSimilarity >= 0.6) {
    denseRelevance = 'high';
  } else if (denseSimilarity >= 0.35) {
    denseRelevance = 'medium';
  } else if (denseSimilarity > 0.1) {
    denseRelevance = 'low';
  }

  // Generate crisp explanatory summary
  const reasons: string[] = [];
  if (matchedCategory) {
    reasons.push(`matches category '${product.category}'`);
  }
  if (matchedMaterials.length > 0) {
    reasons.push(`matches material (${matchedMaterials.join(', ')})`);
  }
  if (matchedColors.length > 0) {
    reasons.push(`matches color palette (${matchedColors.join(', ')})`);
  }
  if (parsed.extracted_price_max && priceSatisfied) {
    reasons.push(`within budget constraint (₹${product.price.toLocaleString('en-IN')})`);
  }
  if (denseRelevance === 'high') {
    reasons.push('high semantic concept alignment');
  }
  if (matchedTitleTerms.length > 0) {
    reasons.push(`title terms (${matchedTitleTerms.slice(0, 3).join(', ')})`);
  }

  const summary = reasons.length > 0
    ? `Retrieved because product ${reasons.join(' and ')}.`
    : `Retrieved via general catalog relevance score.`;

  return {
    matched_category: matchedCategory,
    category_name: product.category,
    matched_materials: matchedMaterials,
    matched_colors: matchedColors,
    matched_title_terms: matchedTitleTerms,
    price_constraint_satisfied: priceSatisfied,
    dense_semantic_relevance: denseRelevance,
    dense_similarity: parseFloat(denseSimilarity.toFixed(4)),
    lexical_score: parseFloat(lexicalScore.toFixed(4)),
    lexical_rank: lexicalRank,
    dense_rank: denseRank,
    rrf_score: rrfScore ? parseFloat(rrfScore.toFixed(6)) : undefined,
    summary
  };
}
