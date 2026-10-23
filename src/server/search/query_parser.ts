import { ParsedQuery } from '../../types/index.js';

const KNOWN_CATEGORIES: Record<string, string> = {
  desk: 'desks',
  desks: 'desks',
  table: 'dining',
  tables: 'dining',
  chair: 'chairs',
  chairs: 'chairs',
  armchair: 'chairs',
  armchairs: 'chairs',
  sofa: 'sofas',
  sofas: 'sofas',
  couch: 'sofas',
  couches: 'sofas',
  bed: 'beds',
  beds: 'beds',
  mattress: 'beds',
  storage: 'storage',
  wardrobe: 'storage',
  credenza: 'storage',
  sideboard: 'storage',
  dresser: 'storage',
  dining: 'dining',
  lamp: 'lighting',
  lamps: 'lighting',
  light: 'lighting',
  lighting: 'lighting',
  sconce: 'lighting',
  rug: 'rugs',
  rugs: 'rugs',
  carpet: 'rugs',
  runner: 'rugs',
  shelf: 'shelves',
  shelves: 'shelves',
  bookshelf: 'shelves',
  bookcase: 'shelves',
  accessory: 'accessories',
  accessories: 'accessories',
  vase: 'accessories',
  decor: 'accessories',
  tray: 'accessories'
};

const KNOWN_MATERIALS = [
  'solid oak', 'sheesham', 'teak', 'walnut', 'wood', 'wooden', 'oak',
  'leather', 'boucle', 'bouclé', 'fabric', 'velvet', 'linen', 'mesh',
  'metal', 'brass', 'steel', 'marble', 'glass', 'wool', 'jute', 'ceramic', 'travertine'
];

const KNOWN_COLORS = [
  'beige', 'brown', 'black', 'white', 'grey', 'gray', 'green', 'warm', 'cream',
  'terracotta', 'sage', 'ochre', 'mustard'
];

const KNOWN_MODIFIERS = [
  'compact', 'small', 'large', 'drawer', 'drawers', 'storage', 'extendable',
  'ergonomic', 'lumbar', 'minimalist', 'modern', 'budget', 'affordable', 'luxury'
];

/**
 * Deterministic extraction of structured constraints from natural language queries.
 */
export function parseQueryDeterministic(rawQuery: string): ParsedQuery {
  const normalized = rawQuery.toLowerCase().trim();
  const tokens = normalized.replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);

  let extractedCategory: string | undefined;
  let extractedPriceMin: number | undefined;
  let extractedPriceMax: number | undefined;
  const extractedMaterials: string[] = [];
  const extractedColors: string[] = [];
  const extractedModifiers: string[] = [];
  let intent: ParsedQuery['intent'] = 'search';

  // 1. Detect Intent
  if (normalized.includes('alternative') || normalized.includes('alternatives')) {
    intent = 'alternatives';
  } else if (normalized.includes('cheaper') || normalized.includes('similar but cheaper')) {
    intent = 'cheaper';
  } else if (normalized.includes('better review') || normalized.includes('better reviews') || normalized.includes('higher rating')) {
    intent = 'better_reviews';
  } else if (normalized.includes('compare') || normalized.includes('versus') || normalized.includes(' vs ')) {
    intent = 'comparison';
  }

  // 2. Extract Category
  for (const token of tokens) {
    if (KNOWN_CATEGORIES[token]) {
      extractedCategory = KNOWN_CATEGORIES[token];
      break;
    }
  }

  // Multi-word category patterns
  if (!extractedCategory) {
    if (normalized.includes('dining table') || normalized.includes('bistro table')) {
      extractedCategory = 'dining';
    } else if (normalized.includes('office desk') || normalized.includes('writing desk') || normalized.includes('computer table')) {
      extractedCategory = 'desks';
    } else if (normalized.includes('floor lamp') || normalized.includes('desk lamp') || normalized.includes('reading lamp')) {
      extractedCategory = 'lighting';
    } else if (normalized.includes('task chair') || normalized.includes('office chair') || normalized.includes('accent chair')) {
      extractedCategory = 'chairs';
    } else if (normalized.includes('area rug') || normalized.includes('floor rug')) {
      extractedCategory = 'rugs';
    } else if (normalized.includes('platform bed') || normalized.includes('storage bed')) {
      extractedCategory = 'beds';
    }
  }

  // 3. Extract Price constraints (e.g. "under 15000", "below 20000 rupees", "under 15k", "between 10000 and 20000", "over 30000")
  // Regex for "under / below / less than X [k|rupees|rs]"
  const underMatch = normalized.match(/(?:under|below|less than|max|up to)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|rupees|rs)?/i);
  if (underMatch) {
    let val = parseFloat(underMatch[1].replace(/,/g, ''));
    if (underMatch[2]?.toLowerCase() === 'k' || underMatch[2]?.toLowerCase() === 'thousand') {
      val *= 1000;
    }
    if (!isNaN(val) && val > 0) {
      extractedPriceMax = val;
    }
  }

  // Regex for "over / above / more than X"
  const overMatch = normalized.match(/(?:over|above|more than|min|at least)\s*(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|thousand|rupees|rs)?/i);
  if (overMatch) {
    let val = parseFloat(overMatch[1].replace(/,/g, ''));
    if (overMatch[2]?.toLowerCase() === 'k' || overMatch[2]?.toLowerCase() === 'thousand') {
      val *= 1000;
    }
    if (!isNaN(val) && val > 0) {
      extractedPriceMin = val;
    }
  }

  // Regex for "between X and Y"
  const betweenMatch = normalized.match(/(?:between)\s*(?:rs\.?|inr|₹)?\s*(\d+)\s*(?:and|-|to)\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
  if (betweenMatch) {
    const minVal = parseFloat(betweenMatch[1]);
    const maxVal = parseFloat(betweenMatch[2]);
    if (!isNaN(minVal) && !isNaN(maxVal)) {
      extractedPriceMin = minVal;
      extractedPriceMax = maxVal;
    }
  }

  // 4. Extract Materials
  for (const mat of KNOWN_MATERIALS) {
    if (normalized.includes(mat)) {
      extractedMaterials.push(mat);
    }
  }

  // 5. Extract Colors
  for (const col of KNOWN_COLORS) {
    if (tokens.includes(col) || normalized.includes(col)) {
      extractedColors.push(col);
    }
  }

  // 6. Extract Modifiers
  for (const mod of KNOWN_MODIFIERS) {
    if (tokens.includes(mod) || normalized.includes(mod)) {
      extractedModifiers.push(mod);
    }
  }

  return {
    raw_query: rawQuery,
    normalized_query: normalized,
    extracted_category: extractedCategory,
    extracted_price_min: extractedPriceMin,
    extracted_price_max: extractedPriceMax,
    extracted_materials: Array.from(new Set(extractedMaterials)),
    extracted_colors: Array.from(new Set(extractedColors)),
    extracted_modifiers: Array.from(new Set(extractedModifiers)),
    intent,
    is_llm_assisted: false
  };
}
