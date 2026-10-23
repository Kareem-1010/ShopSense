export type ProductCategory =
  | 'desks'
  | 'chairs'
  | 'sofas'
  | 'beds'
  | 'storage'
  | 'dining'
  | 'lighting'
  | 'rugs'
  | 'shelves'
  | 'accessories';

export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ProductCategory | string;
  brand: string;
  price: number; // Stored as exact integer/fixed-decimal in INR (rupees)
  currency: string;
  images: string[];
  color: string;
  material: string;
  width: number; // in cm
  height: number;
  depth: number;
  rating: number; // 1.0 - 5.0
  rating_count: number;
  availability: AvailabilityStatus;
  searchable_text?: string;
  created_at?: string;
  updated_at?: string;
}

export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

export interface ParsedQuery {
  raw_query: string;
  normalized_query: string;
  extracted_category?: string;
  extracted_price_min?: number;
  extracted_price_max?: number;
  extracted_materials: string[];
  extracted_colors: string[];
  extracted_modifiers: string[];
  intent: 'search' | 'alternatives' | 'cheaper' | 'better_reviews' | 'comparison';
  is_llm_assisted: boolean;
}

export interface SearchFilters {
  category?: string;
  min_price?: number;
  max_price?: number;
  brand?: string[];
  material?: string[];
  color?: string[];
  min_rating?: number;
  availability?: AvailabilityStatus[];
}

export type SortOption =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'rating_desc'
  | 'popularity';

export interface ExplanationSignals {
  matched_category: boolean;
  category_name?: string;
  matched_materials: string[];
  matched_colors: string[];
  matched_title_terms: string[];
  price_constraint_satisfied: boolean;
  dense_semantic_relevance: 'high' | 'medium' | 'low' | 'none';
  dense_similarity: number;
  lexical_score: number;
  lexical_rank?: number;
  dense_rank?: number;
  rrf_score?: number;
  summary: string;
}

export interface SearchResultItem {
  product: Product;
  rank: number;
  score: number;
  lexical_rank?: number;
  dense_rank?: number;
  lexical_score?: number;
  dense_score?: number;
  rrf_score?: number;
  explanation: ExplanationSignals;
}

export interface SearchResponse {
  query: string;
  parsed_query: ParsedQuery;
  search_mode_requested: SearchMode;
  search_mode_used: SearchMode;
  fallback_reason?: string;
  pgvector_enabled?: boolean;
  total_results: number;
  page: number;
  page_size: number;
  total_pages: number;
  latency_ms: number;
  results: SearchResultItem[];
  applied_filters: SearchFilters;
  sort_by: SortOption;
  active_candidates_count: {
    lexical: number;
    dense: number;
    combined: number;
  };
}

export interface UserInteractionEvent {
  id?: string;
  session_id: string;
  product_id: string;
  event_type: 'view' | 'click' | 'save' | 'compare';
  timestamp?: string;
  position?: number;
  query?: string;
}

export interface RecommendationItem {
  product: Product;
  score: number;
  reason_code: 'content_similarity' | 'user_history_affinity' | 'category_complementary' | 'cold_start_popular';
  reason_description: string;
}

export interface RecommendationResponse {
  session_id: string;
  strategy_used: 'content_based' | 'interaction_personalized' | 'cold_start_curated';
  recommendations: RecommendationItem[];
  latency_ms: number;
}

export interface EvaluationMetricResult {
  precision_at_5: number;
  precision_at_10: number;
  recall_at_5: number;
  recall_at_10: number;
  mrr_at_10: number;
  ndcg_at_10: number;
}

export interface QueryEvaluationDetail {
  query_id: string;
  query: string;
  query_type: string;
  ground_truth_count: number;
  retrieved_count: number;
  lexical: EvaluationMetricResult;
  dense: EvaluationMetricResult;
  hybrid: EvaluationMetricResult;
}

export interface EvaluationRun {
  run_id: string;
  benchmark_version: string;
  timestamp: string;
  total_queries: number;
  configuration: {
    rrf_k: number;
    candidate_depth: number;
    dense_model: string;
  };
  metrics: {
    lexical: EvaluationMetricResult;
    dense: EvaluationMetricResult;
    hybrid: EvaluationMetricResult;
  };
  latency_percentiles: {
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  sample_query_results: QueryEvaluationDetail[];
}
