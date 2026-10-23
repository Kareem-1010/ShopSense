import fs from 'fs';
import path from 'path';

interface ProductSeed {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  color: string;
  material: string;
  rating: number;
}

interface BenchmarkQuery {
  id: string;
  query: string;
  query_type:
    | 'exact_product_name'
    | 'category'
    | 'attribute_combination'
    | 'natural_language_description'
    | 'price_constraint'
    | 'synonyms'
    | 'ambiguous'
    | 'no_results'
    | 'misspellings'
    | 'multiple_constraints';
  target_category?: string;
  target_price_max?: number;
  relevant_product_ids: string[];
  relevance_grades: Record<string, number>; // productId -> 1 or 2
}

const productsPath = path.resolve(process.cwd(), 'data/sample_products.jsonl');
const products: ProductSeed[] = fs
  .readFileSync(productsPath, 'utf-8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

console.log(`Loaded ${products.length} products for benchmark generation`);

// Helper to find matching products
function findMatching(predicate: (p: ProductSeed) => boolean, limit = 10): string[] {
  return products.filter(predicate).slice(0, limit).map((p) => p.id);
}

const queries: BenchmarkQuery[] = [
  // 1. Natural-language descriptions (core prompt queries)
  {
    id: 'eval-nl-01',
    query: 'A compact wooden desk for a small apartment under 15000 rupees',
    query_type: 'natural_language_description',
    target_category: 'desks',
    target_price_max: 15000,
    relevant_product_ids: findMatching(
      (p) => p.category === 'desks' && p.price <= 15000 && (p.material.includes('Wood') || p.material.includes('Oak') || p.material.includes('Sheesham') || p.title.toLowerCase().includes('compact'))
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-nl-02',
    query: 'Comfortable beige sofa for a modern living room',
    query_type: 'natural_language_description',
    target_category: 'sofas',
    relevant_product_ids: findMatching(
      (p) => p.category === 'sofas' && (p.color.toLowerCase().includes('beige') || p.color.toLowerCase().includes('cream'))
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-nl-03',
    query: 'Storage bed with drawers for a small bedroom',
    query_type: 'natural_language_description',
    target_category: 'beds',
    relevant_product_ids: findMatching(
      (p) => p.category === 'beds' && (p.title.toLowerCase().includes('storage') || p.description.toLowerCase().includes('drawer'))
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-nl-04',
    query: 'Minimalist lamps suitable for a warm reading corner',
    query_type: 'natural_language_description',
    target_category: 'lighting',
    relevant_product_ids: findMatching(
      (p) => p.category === 'lighting' && (p.title.toLowerCase().includes('lamp') || p.description.toLowerCase().includes('reading') || p.description.toLowerCase().includes('warm'))
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-nl-05',
    query: 'Ergonomic breathable office chair for back pain',
    query_type: 'natural_language_description',
    target_category: 'chairs',
    relevant_product_ids: findMatching(
      (p) => p.category === 'chairs' && (p.material.includes('Mesh') || p.description.toLowerCase().includes('lumbar') || p.description.toLowerCase().includes('ergonomic'))
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-nl-06',
    query: 'Round extendable dining table for family dinners',
    query_type: 'natural_language_description',
    target_category: 'dining',
    relevant_product_ids: findMatching(
      (p) => p.category === 'dining' && (p.title.toLowerCase().includes('round') || p.title.toLowerCase().includes('extendable') || p.title.toLowerCase().includes('dining'))
    ),
    relevance_grades: {}
  },

  // 2. Exact product-name queries
  {
    id: 'eval-exact-01',
    query: 'Kavala Compact Wooden Desk',
    query_type: 'exact_product_name',
    relevant_product_ids: findMatching((p) => p.title.includes('Kavala Compact Wooden Desk')),
    relevance_grades: {}
  },
  {
    id: 'eval-exact-02',
    query: 'Aura Modern Comfort Beige 3-Seater Sofa',
    query_type: 'exact_product_name',
    relevant_product_ids: findMatching((p) => p.title.includes('Aura Modern Comfort Beige 3-Seater Sofa')),
    relevance_grades: {}
  },
  {
    id: 'eval-exact-03',
    query: 'Haven Solid Sheesham Storage Bed',
    query_type: 'exact_product_name',
    relevant_product_ids: findMatching((p) => p.title.includes('Haven Solid Sheesham Storage Bed')),
    relevance_grades: {}
  },
  {
    id: 'eval-exact-04',
    query: 'Verve Ergonomic Mesh Task Chair',
    query_type: 'exact_product_name',
    relevant_product_ids: findMatching((p) => p.title.includes('Verve Ergonomic Mesh Task Chair')),
    relevance_grades: {}
  },
  {
    id: 'eval-exact-05',
    query: 'Nara Warm Brass Minimalist Reading Corner Floor Lamp',
    query_type: 'exact_product_name',
    relevant_product_ids: findMatching((p) => p.title.includes('Nara Warm Brass Minimalist Reading Corner Floor Lamp')),
    relevance_grades: {}
  },

  // 3. Category queries
  {
    id: 'eval-cat-01',
    query: 'bookshelf',
    query_type: 'category',
    relevant_product_ids: findMatching((p) => p.category === 'shelves'),
    relevance_grades: {}
  },
  {
    id: 'eval-cat-02',
    query: 'sofas',
    query_type: 'category',
    relevant_product_ids: findMatching((p) => p.category === 'sofas'),
    relevance_grades: {}
  },
  {
    id: 'eval-cat-03',
    query: 'office desks',
    query_type: 'category',
    relevant_product_ids: findMatching((p) => p.category === 'desks'),
    relevance_grades: {}
  },
  {
    id: 'eval-cat-04',
    query: 'dining tables',
    query_type: 'category',
    relevant_product_ids: findMatching((p) => p.category === 'dining'),
    relevance_grades: {}
  },
  {
    id: 'eval-cat-05',
    query: 'area rugs',
    query_type: 'category',
    relevant_product_ids: findMatching((p) => p.category === 'rugs'),
    relevance_grades: {}
  },
  {
    id: 'eval-cat-06',
    query: 'wardrobes and storage credenzas',
    query_type: 'category',
    relevant_product_ids: findMatching((p) => p.category === 'storage'),
    relevance_grades: {}
  },

  // 4. Attribute combinations
  {
    id: 'eval-attr-01',
    query: 'solid oak writing desk with drawers',
    query_type: 'attribute_combination',
    relevant_product_ids: findMatching((p) => p.category === 'desks' && (p.material.includes('Oak') || p.color.includes('Oak'))),
    relevance_grades: {}
  },
  {
    id: 'eval-attr-02',
    query: 'boucle fabric cream white armchair',
    query_type: 'attribute_combination',
    relevant_product_ids: findMatching((p) => (p.category === 'chairs' || p.category === 'sofas') && p.material.includes('Bouclé')),
    relevance_grades: {}
  },
  {
    id: 'eval-attr-03',
    query: 'walnut brown 6-drawer dresser storage',
    query_type: 'attribute_combination',
    relevant_product_ids: findMatching((p) => p.category === 'storage' && (p.material.includes('Walnut') || p.color.includes('Walnut'))),
    relevance_grades: {}
  },
  {
    id: 'eval-attr-04',
    query: 'brass arch floor lamp with glass shade',
    query_type: 'attribute_combination',
    relevant_product_ids: findMatching((p) => p.category === 'lighting' && (p.material.includes('Brass') || p.title.toLowerCase().includes('brass'))),
    relevance_grades: {}
  },
  {
    id: 'eval-attr-05',
    query: 'organic jute geometric rug runner',
    query_type: 'attribute_combination',
    relevant_product_ids: findMatching((p) => p.category === 'rugs' && p.material.includes('Jute')),
    relevance_grades: {}
  },

  // 5. Price constraints
  {
    id: 'eval-price-01',
    query: 'dining table under 20000 rupees',
    query_type: 'price_constraint',
    target_category: 'dining',
    target_price_max: 20000,
    relevant_product_ids: findMatching((p) => p.category === 'dining' && p.price <= 20000),
    relevance_grades: {}
  },
  {
    id: 'eval-price-02',
    query: 'affordable desk lamp under 3000',
    query_type: 'price_constraint',
    target_category: 'lighting',
    target_price_max: 3000,
    relevant_product_ids: findMatching((p) => p.category === 'lighting' && p.price <= 3000),
    relevance_grades: {}
  },
  {
    id: 'eval-price-03',
    query: 'accent chair under 10000 rupees',
    query_type: 'price_constraint',
    target_category: 'chairs',
    target_price_max: 10000,
    relevant_product_ids: findMatching((p) => p.category === 'chairs' && p.price <= 10000),
    relevance_grades: {}
  },
  {
    id: 'eval-price-04',
    query: 'cheap bedside runner rug under 5000',
    query_type: 'price_constraint',
    target_category: 'rugs',
    target_price_max: 5000,
    relevant_product_ids: findMatching((p) => p.category === 'rugs' && p.price <= 5000),
    relevance_grades: {}
  },
  {
    id: 'eval-price-05',
    query: 'luxury king size bed above 40000 rupees',
    query_type: 'price_constraint',
    target_category: 'beds',
    relevant_product_ids: findMatching((p) => p.category === 'beds' && p.price >= 40000),
    relevance_grades: {}
  },

  // 6. Synonyms & semantic queries
  {
    id: 'eval-syn-01',
    query: 'couch for living room', // couch -> sofa
    query_type: 'synonyms',
    relevant_product_ids: findMatching((p) => p.category === 'sofas'),
    relevance_grades: {}
  },
  {
    id: 'eval-syn-02',
    query: 'credenza for tableware', // credenza -> storage
    query_type: 'synonyms',
    relevant_product_ids: findMatching((p) => p.category === 'storage'),
    relevance_grades: {}
  },
  {
    id: 'eval-syn-03',
    query: 'etagere for home plants', // etagere -> shelves
    query_type: 'synonyms',
    relevant_product_ids: findMatching((p) => p.category === 'shelves'),
    relevance_grades: {}
  },
  {
    id: 'eval-syn-04',
    query: 'carpet for drawing room', // carpet -> rug
    query_type: 'synonyms',
    relevant_product_ids: findMatching((p) => p.category === 'rugs'),
    relevance_grades: {}
  },
  {
    id: 'eval-syn-05',
    query: 'chiffonier wardrobe for bedroom clothes', // chiffonier -> storage
    query_type: 'synonyms',
    relevant_product_ids: findMatching((p) => p.category === 'storage'),
    relevance_grades: {}
  },

  // 7. Misspellings
  {
    id: 'eval-missp-01',
    query: 'woodn deske for small room', // wooden desk
    query_type: 'misspellings',
    relevant_product_ids: findMatching((p) => p.category === 'desks' && (p.material.includes('Wood') || p.title.toLowerCase().includes('desk'))),
    relevance_grades: {}
  },
  {
    id: 'eval-missp-02',
    query: 'ergonimic offise chaire', // ergonomic office chair
    query_type: 'misspellings',
    relevant_product_ids: findMatching((p) => p.category === 'chairs'),
    relevance_grades: {}
  },
  {
    id: 'eval-missp-03',
    query: 'modren beig sofa couch', // modern beige sofa
    query_type: 'misspellings',
    relevant_product_ids: findMatching((p) => p.category === 'sofas' && p.color.toLowerCase().includes('beige')),
    relevance_grades: {}
  },
  {
    id: 'eval-missp-04',
    query: 'sheeshm king platfor bed', // sheesham king platform bed
    query_type: 'misspellings',
    relevant_product_ids: findMatching((p) => p.category === 'beds' && p.material.includes('Sheesham')),
    relevance_grades: {}
  },

  // 8. Multiple constraints
  {
    id: 'eval-multi-01',
    query: 'NordicCraft solid oak desk under 25000 in natural warm oak',
    query_type: 'multiple_constraints',
    relevant_product_ids: findMatching(
      (p) => p.category === 'desks' && p.brand === 'NordicCraft' && p.price <= 25000 && p.color.includes('Oak')
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-multi-02',
    query: 'UrbanWood sheesham dining table under 30000 with 6 seats',
    query_type: 'multiple_constraints',
    relevant_product_ids: findMatching(
      (p) => p.category === 'dining' && p.brand === 'UrbanWood' && p.price <= 30000
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-multi-03',
    query: 'Minimalia dimmable black floor lamp under 6000',
    query_type: 'multiple_constraints',
    relevant_product_ids: findMatching(
      (p) => p.category === 'lighting' && p.brand === 'Minimalia' && p.price <= 6000
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-multi-04',
    query: 'Habitat Living velvet sofa in forest green over 30000',
    query_type: 'multiple_constraints',
    relevant_product_ids: findMatching(
      (p) => p.category === 'sofas' && (p.material.includes('Velvet') || p.color.includes('Green'))
    ),
    relevance_grades: {}
  },

  // 9. Ambiguous queries
  {
    id: 'eval-amb-01',
    query: 'cozy reading corner setup',
    query_type: 'ambiguous',
    relevant_product_ids: findMatching(
      (p) => (p.category === 'chairs' || p.category === 'lighting' || p.category === 'rugs') &&
        (p.description.toLowerCase().includes('reading') || p.description.toLowerCase().includes('cozy') || p.description.toLowerCase().includes('warm'))
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-amb-02',
    query: 'small apartment essentials',
    query_type: 'ambiguous',
    relevant_product_ids: findMatching(
      (p) => p.description.toLowerCase().includes('small') || p.description.toLowerCase().includes('compact') || p.title.toLowerCase().includes('compact')
    ),
    relevance_grades: {}
  },
  {
    id: 'eval-amb-03',
    query: 'minimalist workspace decor',
    query_type: 'ambiguous',
    relevant_product_ids: findMatching(
      (p) => (p.category === 'accessories' || p.category === 'lighting' || p.category === 'desks') &&
        (p.description.toLowerCase().includes('minimalist') || p.title.toLowerCase().includes('minimalist'))
    ),
    relevance_grades: {}
  },

  // 11. Comparison and Alternative queries
  {
    id: 'eval-alt-01',
    query: 'Show alternatives to this chair with better reviews',
    query_type: 'natural_language_description',
    target_category: 'chairs',
    relevant_product_ids: findMatching((p) => p.category === 'chairs' && p.rating >= 4.7),
    relevance_grades: {}
  },
  {
    id: 'eval-alt-02',
    query: 'Find a similar dining table but cheaper',
    query_type: 'natural_language_description',
    target_category: 'dining',
    relevant_product_ids: findMatching((p) => p.category === 'dining' && p.price <= 20000),
    relevance_grades: {}
  },
  {
    id: 'eval-alt-03',
    query: 'alternatives to solid wood desk engineered wood under 12000',
    query_type: 'multiple_constraints',
    target_category: 'desks',
    relevant_product_ids: findMatching((p) => p.category === 'desks' && p.price <= 12000),
    relevance_grades: {}
  },
  {
    id: 'eval-shelf-01',
    query: '5-tier modular bookshelf for living room library',
    query_type: 'attribute_combination',
    target_category: 'shelves',
    relevant_product_ids: findMatching((p) => p.category === 'shelves' && (p.title.includes('5-Tier') || p.title.includes('Bookshelf'))),
    relevance_grades: {}
  },
  {
    id: 'eval-acc-01',
    query: 'handcrafted ceramic vase tabletop decor',
    query_type: 'attribute_combination',
    target_category: 'accessories',
    relevant_product_ids: findMatching((p) => p.category === 'accessories' && p.material.includes('Ceramic')),
    relevance_grades: {}
  },
  {
    id: 'eval-acc-02',
    query: 'travertine marble bookends and catchall tray',
    query_type: 'attribute_combination',
    target_category: 'accessories',
    relevant_product_ids: findMatching((p) => p.category === 'accessories' && (p.material.includes('Travertine') || p.material.includes('Marble'))),
    relevance_grades: {}
  },
  {
    id: 'eval-rug-01',
    query: 'hand tufted new zealand wool area rug for bedroom',
    query_type: 'attribute_combination',
    target_category: 'rugs',
    relevant_product_ids: findMatching((p) => p.category === 'rugs' && p.material.includes('Wool')),
    relevance_grades: {}
  },
  {
    id: 'eval-syn-06',
    query: 'divan with mattress and storage',
    query_type: 'synonyms',
    target_category: 'beds',
    relevant_product_ids: findMatching((p) => p.category === 'beds'),
    relevance_grades: {}
  },
  {
    id: 'eval-missp-05',
    query: 'bookshilf for stody room',
    query_type: 'misspellings',
    target_category: 'shelves',
    relevant_product_ids: findMatching((p) => p.category === 'shelves'),
    relevance_grades: {}
  },
  {
    id: 'eval-zero-04',
    query: 'mechanical gaming keyboard RGB switches',
    query_type: 'no_results',
    relevant_product_ids: [],
    relevance_grades: {}
  }
];

// Fill relevance grades: primary matched items = 2, secondary = 1
for (const q of queries) {
  if (q.relevant_product_ids.length > 0) {
    q.relevant_product_ids.forEach((id, index) => {
      q.relevance_grades[id] = index < 3 ? 2 : 1;
    });
  }
}

const outDir = path.resolve(process.cwd(), 'data');
const outPath = path.join(outDir, 'evaluation_queries.jsonl');
const lines = queries.map((q) => JSON.stringify(q)).join('\n');
fs.writeFileSync(outPath, lines, 'utf-8');

console.log(`Generated ${queries.length} benchmark queries in ${outPath}`);
