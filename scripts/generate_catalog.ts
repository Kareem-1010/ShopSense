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
  currency: string;
  images: string[];
  color: string;
  material: string;
  width: number;
  height: number;
  depth: number;
  rating: number;
  rating_count: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
}

const CATEGORIES = [
  'desks',
  'chairs',
  'sofas',
  'beds',
  'storage',
  'dining',
  'lighting',
  'rugs',
  'shelves',
  'accessories'
];

const BRANDS = [
  'NordicCraft',
  'UrbanWood',
  'Habitat Living',
  'Studio Forma',
  'ArtisanTeak',
  'Loom & Weft',
  'Elysian Home',
  'Vanguard Studio',
  'Minimalia',
  'Timber & Steel'
];

const MATERIALS: Record<string, string[]> = {
  desks: ['Solid Oak', 'Teak Wood', 'Walnut', 'Engineered Wood', 'Sheesham Wood', 'Ash Wood & Steel'],
  chairs: ['Ergonomic Mesh', 'Top-grain Leather', 'Bouclé Fabric', 'Linen Blend', 'Bentwood Oak', 'Velvet'],
  sofas: ['Performance Fabric', 'Textured Bouclé', 'Italian Leather', 'Velvet', 'Linen Cotton', 'Chenille'],
  beds: ['Solid Sheesham', 'Engineered Oak', 'Upholstered Linen', 'Acacia Wood', 'Solid Teak', 'Pecan Wood'],
  storage: ['Teak Wood', 'MDF & Oak Veneer', 'Powder-coated Metal', 'Solid Pine', 'Cane & Wood', 'Walnut'],
  dining: ['Solid Sheesham', 'White Marble & Brass', 'American Walnut', 'Reclaimed Pine', 'Tempered Glass & Oak', 'Acacia'],
  lighting: ['Brushed Brass', 'Matte Black Aluminum', 'Travertine & Glass', 'Smoked Glass', 'Ceramic & Linen', 'Rattan'],
  rugs: ['100% New Zealand Wool', 'Organic Jute', 'Hand-tufted Wool', 'Cotton Chenille', 'Silk Wool Blend', 'Recycled PET Fiber'],
  shelves: ['Solid Oak & Cast Iron', 'Powder-coated Steel', 'Teak Wood & Brass', 'MDF Walnut Veneer', 'Bamboo', 'Industrial Pipe & Pine'],
  accessories: ['Ceramic', 'Cast Brass', 'Blown Glass', 'Travertine Marble', 'Terracotta', 'Handmade Stoneware']
};

const COLORS = [
  'Natural Warm Oak',
  'Walnut Brown',
  'Beige',
  'Charcoal Grey',
  'Cream White',
  'Forest Green',
  'Terracotta',
  'Matte Black',
  'Mustard Ochre',
  'Soft Sage'
];

const IMAGE_POOLS: Record<string, string[]> = {
  desks: [
    'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80'
  ],
  chairs: [
    'https://images.unsplash.com/photo-1580481077195-c322b6f1202e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80'
  ],
  sofas: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1540574163026-643ea20ade25?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'
  ],
  beds: [
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1540518614846-7ede433c4ef4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582582621959-48d27397dc69?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80'
  ],
  storage: [
    'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80'
  ],
  dining: [
    'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80'
  ],
  lighting: [
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=800&q=80'
  ],
  rugs: [
    'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
  ],
  shelves: [
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1589834390005-5d4fb9bf3d32?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&w=800&q=80'
  ],
  accessories: [
    'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80'
  ]
};

// Curated base templates to generate realistic, distinctive furniture products
const TEMPLATES: Record<string, { titlePrefixes: string[]; descriptors: string[]; priceRange: [number, number]; dimRange: { w: [number, number]; h: [number, number]; d: [number, number] } }> = {
  desks: {
    titlePrefixes: ['Studio Writing Desk', 'Compact Apartment Desk', 'Executive Workstation', 'Minimalist Floating Desk', 'Corner L-Shaped Desk', 'Dual-Drawer Computer Table'],
    descriptors: ['Designed specifically for small spaces with cable management and integrated organizer.', 'Crafted from sustainably sourced solid timber with durable satin matte finish.', 'Features soft-close drawers and cable grommet suitable for productive home offices.', 'Ultra-slim profile ideal for compact apartments, study nooks, or creative studios.'],
    priceRange: [6500, 32000],
    dimRange: { w: [90, 160], h: [72, 78], d: [45, 80] }
  },
  chairs: {
    titlePrefixes: ['Ergonomic Task Chair', 'Sculptural Dining Armchair', 'Lounge Reading Chair', 'Mid-Century Accent Chair', 'Nordic Swivel Chair', 'Reclining Wingback Chair'],
    descriptors: ['Ergonomically contoured backrest offering breathable lumbar support for extended hours.', 'High-density resilience foam with stain-resistant upholstery and reinforced tapered legs.', 'A statement accent piece blending organic curves with luxurious tactile fabric.', 'Classic Nordic silhouette featuring handcrafted solid wood joinery and premium cushioning.'],
    priceRange: [4200, 24500],
    dimRange: { w: [50, 75], h: [75, 110], d: [50, 80] }
  },
  sofas: {
    titlePrefixes: ['3-Seater Minimalist Sofa', 'Modular L-Sectional Sofa', 'Loveseat for Small Living Room', 'Daybed Sleeper Couch', 'Curved Velvet Settee', 'Deep-Seat Relaxing Sofa'],
    descriptors: ['Deep pocket-spring seating with down-blend cushions for unmatched lounge comfort.', 'Space-efficient footprint tailored for modern apartments and urban lofts.', 'Upholstered in pet-friendly, spill-resistant performance fabric with removable covers.', 'Solid hardwood inner frame with high-gauge sinuous springs built to last decades.'],
    priceRange: [18000, 88000],
    dimRange: { w: [140, 260], h: [75, 92], d: [80, 105] }
  },
  beds: {
    titlePrefixes: ['Storage Platform Bed with Drawers', 'Low-Profile Japanese Tatami Bed', 'Upholstered Wingback King Bed', 'Solid Wood Queen Platform Bed', 'Hydraulic Lift Storage Bed', 'Minimalist Slat Bed Frame'],
    descriptors: ['Spacious built-in under-bed storage drawers on smooth ball-bearing glides.', 'Sturdy solid hardwood platform eliminating the need for a box spring.', 'Padded acoustic headboard wrapped in tactile woven linen for comfortable late-night reading.', 'Engineered for silent, squeak-free support with optimal mattress ventilation.'],
    priceRange: [19500, 68000],
    dimRange: { w: [150, 210], h: [90, 130], d: [190, 220] }
  },
  storage: {
    titlePrefixes: ['6-Drawer Dresser Chest', 'Fluted Sideboard Credenza', 'Wardrobe Armoire with Hanging Rail', 'Compact Entryway Shoe Bench', 'Media Console Cabinet', 'Buffet Server with Cane Weave'],
    descriptors: ['Ample concealed storage with adjustable interior shelving and soft-close mechanisms.', 'Textured fluted door panels accented with brushed brass pull hardware.', 'Low-profile media unit designed to discreetly house cords, gaming consoles, and routers.', 'Generous organization with heavy-duty construction ideal for bedrooms and living rooms.'],
    priceRange: [11000, 48000],
    dimRange: { w: [80, 180], h: [60, 190], d: [38, 55] }
  },
  dining: {
    titlePrefixes: ['Round Extendable Dining Table', 'Rectangular 6-Seater Dining Table', 'Compact Drop-Leaf Breakfast Table', 'Solid Wood Trestle Dining Table', 'Marble Top Bistro Table', 'Scandinavian Dining Bench'],
    descriptors: ['Smooth butterfly extension leaf easily expands seating from 4 to 6 guests.', 'Organic beveled edge profile with heat and scratch-resistant protective clear coat.', 'Sturdy trestle base providing generous legroom without intrusive corner legs.', 'Perfect centerpiece for family gatherings, dinner parties, and casual morning breakfasts.'],
    priceRange: [12500, 58000],
    dimRange: { w: [90, 210], h: [74, 78], d: [80, 100] }
  },
  lighting: {
    titlePrefixes: ['Arched Floor Lamp with Brass Dome', 'Minimalist Dimmable Desk Lamp', 'Pendant Chandelier with Opal Glass', 'Warm Bedside Reading Sconce', 'Sculptural Table Lamp', 'Tripod Floor Light with Linen Shade'],
    descriptors: ['Emits warm 2700K ambient illumination ideal for cozy reading corners and living rooms.', 'Touch-sensitive step dimming with high-CRI flicker-free integrated LED source.', 'Mouth-blown frosted glass sphere diffusing soft, glare-free light across the room.', 'Solid travertine base paired with brass neck for enduring stability and refined style.'],
    priceRange: [1800, 16500],
    dimRange: { w: [20, 60], h: [35, 175], d: [20, 70] }
  },
  rugs: {
    titlePrefixes: ['Hand-Woven Wool Area Rug', 'Organic Geometric Jute Runner', 'High-Pile Shag Cozy Rug', 'Vintage Distressed Flatweave Rug', 'Textured Moroccan Tribal Rug', 'Washable Low-Profile Area Rug'],
    descriptors: ['Hand-spun natural wool offering supreme softness underfoot and natural stain resistance.', 'Densely hand-knotted by master artisans with reinforced bound edges.', 'Subtle neutral geometric pattern that anchors living spaces without overwhelming.', 'Ideal for high-traffic zones, easy to vacuum, shedding-resistant, and non-slip backed.'],
    priceRange: [3200, 29000],
    dimRange: { w: [120, 270], h: [1, 3], d: [180, 360] }
  },
  shelves: {
    titlePrefixes: ['Modular 5-Tier Bookshelf', 'Ladder Leaning Wall Shelf', 'Industrial Floating Wall Shelf Set', 'Geometric Display Bookcase', 'Corner Etagere Tower', 'Low Media Wall Unit'],
    descriptors: ['Heavy-load rated shelves with anti-tip wall anchoring hardware included.', 'Open architectural silhouette allows decorative objects, books, and plants to shine.', 'Crafted from thick timber planks treated for warp resistance and enduring strength.', 'Space-saving vertical tower engineered to maximize storage in narrow urban corners.'],
    priceRange: [4500, 26000],
    dimRange: { w: [60, 140], h: [100, 200], d: [28, 42] }
  },
  accessories: {
    titlePrefixes: ['Ceramic Sculptural Vase', 'Solid Brass Tabletop Clock', 'Travertine Catchall Tray', 'Framed Architectural Linen Print', 'Heavy Marble Bookends Pair', 'Textured Terracotta Planter'],
    descriptors: ['Handcrafted artisanal decor piece adding tactile richness and organic warmth.', 'Satin matte glazed surface celebrating subtle imperfections and handmade character.', 'Chiseled from authentic natural stone with protective felt padding on the base.', 'Minimalist accent designed to elevate bookshelves, coffee tables, or entryway consoles.'],
    priceRange: [950, 7800],
    dimRange: { w: [12, 35], h: [15, 45], d: [12, 30] }
  }
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(randFloat(min, max + 1));
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSyntheticCatalog(totalCount = 520): ProductSeed[] {
  const products: ProductSeed[] = [];
  const slugs = new Set<string>();

  // Specific handcrafted flagship products matching all prompt queries
  const flagshipProducts: Partial<ProductSeed>[] = [
    {
      title: 'Kavala Compact Wooden Desk with Storage Drawer',
      category: 'desks',
      brand: 'UrbanWood',
      price: 12499,
      color: 'Natural Warm Oak',
      material: 'Solid Oak',
      width: 100,
      height: 75,
      depth: 50,
      rating: 4.8,
      rating_count: 142,
      availability: 'in_stock',
      description: 'A compact wooden desk for a small apartment under 15000 rupees. Crafted from solid sustainable oak with a smooth pull-out stationery drawer, concealed wire trough, and rounded ergonomic corners.',
      images: [IMAGE_POOLS.desks[0], IMAGE_POOLS.desks[1]]
    },
    {
      title: 'Aura Modern Comfort Beige 3-Seater Sofa',
      category: 'sofas',
      brand: 'Habitat Living',
      price: 34999,
      color: 'Beige',
      material: 'Textured Bouclé',
      width: 210,
      height: 82,
      depth: 92,
      rating: 4.9,
      rating_count: 218,
      availability: 'in_stock',
      description: 'Comfortable beige sofa for a modern living room. Features cloud-like down-blend cushions, stain-repellent bouclé weave, and a kiln-dried hardwood frame designed for luxurious relaxation.',
      images: [IMAGE_POOLS.sofas[0], IMAGE_POOLS.sofas[1]]
    },
    {
      title: 'Haven Solid Sheesham Storage Bed with 4 Drawers',
      category: 'beds',
      brand: 'ArtisanTeak',
      price: 38500,
      color: 'Walnut Brown',
      material: 'Solid Sheesham',
      width: 180,
      height: 110,
      depth: 205,
      rating: 4.7,
      rating_count: 89,
      availability: 'in_stock',
      description: 'Storage bed with drawers for a small bedroom. Equipped with four deep rolling drawers that glide effortlessly on castors, making full use of underbed space without needing lifting hydraulics.',
      images: [IMAGE_POOLS.beds[0], IMAGE_POOLS.beds[1]]
    },
    {
      title: 'Elysian Solid Sheesham 6-Seater Dining Table',
      category: 'dining',
      brand: 'Studio Forma',
      price: 28999,
      color: 'Walnut Brown',
      material: 'Solid Sheesham',
      width: 160,
      height: 76,
      depth: 90,
      rating: 4.6,
      rating_count: 94,
      availability: 'in_stock',
      description: 'Find a similar dining table but cheaper. Generously proportioned family dining table in rich warm sheesham timber with chamfered edges and heavy-duty structural bracing.',
      images: [IMAGE_POOLS.dining[0], IMAGE_POOLS.dining[1]]
    },
    {
      title: 'Lille Drop-Leaf Budget Dining Table',
      category: 'dining',
      brand: 'UrbanWood',
      price: 13999,
      color: 'Natural Warm Oak',
      material: 'Engineered Wood',
      width: 120,
      height: 75,
      depth: 80,
      rating: 4.5,
      rating_count: 112,
      availability: 'in_stock',
      description: 'Cheaper alternative dining table with space-saving fold-down leaves. Built for smart budget dining in flats and compact kitchens.',
      images: [IMAGE_POOLS.dining[1], IMAGE_POOLS.dining[2]]
    },
    {
      title: 'Verve Ergonomic Mesh Task Chair with Lumbar Support',
      category: 'chairs',
      brand: 'Vanguard Studio',
      price: 8999,
      color: 'Charcoal Grey',
      material: 'Ergonomic Mesh',
      width: 62,
      height: 102,
      depth: 60,
      rating: 4.9,
      rating_count: 320,
      availability: 'in_stock',
      description: 'Show alternatives to this chair with better reviews. Highly rated 5-star ergonomic office chair with dynamic responsive lumbar cradle, 3D armrests, and weight-balanced synchronized tilt.',
      images: [IMAGE_POOLS.chairs[0], IMAGE_POOLS.chairs[1]]
    },
    {
      title: 'Nara Warm Brass Minimalist Reading Corner Floor Lamp',
      category: 'lighting',
      brand: 'Minimalia',
      price: 4999,
      color: 'Matte Black',
      material: 'Brushed Brass',
      width: 32,
      height: 148,
      depth: 42,
      rating: 4.8,
      rating_count: 165,
      availability: 'in_stock',
      description: 'Minimalist lamps suitable for a warm reading corner. Swiveling brass shade casts targeted 2700K warm glow for cozy book reading beside armchairs and sofas.',
      images: [IMAGE_POOLS.lighting[0], IMAGE_POOLS.lighting[1]]
    }
  ];

  flagshipProducts.forEach((p, idx) => {
    const slug = slugify(p.title!);
    slugs.add(slug);
    products.push({
      id: `prod-flagship-${idx + 1}`,
      slug,
      title: p.title!,
      description: p.description!,
      category: p.category!,
      brand: p.brand!,
      price: p.price!,
      currency: 'INR',
      images: p.images!,
      color: p.color!,
      material: p.material!,
      width: p.width!,
      height: p.height!,
      depth: p.depth!,
      rating: p.rating!,
      rating_count: p.rating_count!,
      availability: p.availability!
    });
  });

  let counter = 1;
  const targetPerCategory = Math.ceil((totalCount - products.length) / CATEGORIES.length);

  for (const cat of CATEGORIES) {
    const tmpl = TEMPLATES[cat];
    const catImages = IMAGE_POOLS[cat];

    for (let i = 0; i < targetPerCategory; i++) {
      const brand = randChoice(BRANDS);
      const prefix = randChoice(tmpl.titlePrefixes);
      const color = randChoice(COLORS);
      const material = randChoice(MATERIALS[cat]);
      const descriptor = randChoice(tmpl.descriptors);

      const uniqueVariant = `${color.split(' ')[0]} ${material}`;
      let title = `${brand} ${prefix} in ${uniqueVariant}`;
      let slug = slugify(title);

      if (slugs.has(slug)) {
        title = `${brand} ${prefix} - Series ${counter} in ${uniqueVariant}`;
        slug = slugify(title);
      }
      slugs.add(slug);

      const price = Math.round(randInt(tmpl.priceRange[0], tmpl.priceRange[1]) / 100) * 100 - 1; // realistic pricing like 14999
      const w = randInt(tmpl.dimRange.w[0], tmpl.dimRange.w[1]);
      const h = randInt(tmpl.dimRange.h[0], tmpl.dimRange.h[1]);
      const d = randInt(tmpl.dimRange.d[0], tmpl.dimRange.d[1]);

      const rating = parseFloat(randFloat(3.8, 5.0).toFixed(1));
      const rating_count = randInt(12, 450);
      const availabilities: ('in_stock' | 'low_stock' | 'out_of_stock')[] = ['in_stock', 'in_stock', 'in_stock', 'low_stock'];
      const availability = randChoice(availabilities);

      const description = `${prefix} finished in exquisite ${material.toLowerCase()} and accented with ${color.toLowerCase()} tones. ${descriptor} Dimensions: ${w}cm (W) x ${h}cm (H) x ${d}cm (D).`;

      const primaryImg = catImages[counter % catImages.length];
      const secondaryImg = catImages[(counter + 1) % catImages.length];

      products.push({
        id: `prod-${cat}-${counter}`,
        slug,
        title,
        description,
        category: cat,
        brand,
        price,
        currency: 'INR',
        images: [primaryImg, secondaryImg],
        color,
        material,
        width: w,
        height: h,
        depth: d,
        rating,
        rating_count,
        availability
      });

      counter++;
      if (products.length >= totalCount) break;
    }
    if (products.length >= totalCount) break;
  }

  return products;
}

// Generate files if executed directly
const catalog = generateSyntheticCatalog(525);
const outDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'sample_products.jsonl');
const lines = catalog.map((p) => JSON.stringify(p)).join('\n');
fs.writeFileSync(outPath, lines, 'utf-8');

console.log(`Generated ${catalog.length} synthetic products in ${outPath}`);
