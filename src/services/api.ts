import {
  Product,
  SearchMode,
  SearchFilters,
  SortOption,
  SearchResponse,
  RecommendationResponse,
  EvaluationRun,
  UserInteractionEvent
} from '../types/index.js';

const API_BASE = '/api/v1';

export async function searchProducts(params: {
  query: string;
  mode?: SearchMode;
  filters?: SearchFilters;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  sessionId?: string;
}): Promise<SearchResponse> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.set('q', params.query);
  if (params.mode) queryParams.set('mode', params.mode);
  if (params.sort) queryParams.set('sort', params.sort);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params.sessionId) queryParams.set('sessionId', params.sessionId);

  if (params.filters) {
    if (params.filters.category) queryParams.set('category', params.filters.category);
    if (params.filters.min_price !== undefined) queryParams.set('min_price', params.filters.min_price.toString());
    if (params.filters.max_price !== undefined) queryParams.set('max_price', params.filters.max_price.toString());
    if (params.filters.min_rating !== undefined) queryParams.set('min_rating', params.filters.min_rating.toString());
    if (params.filters.brand && params.filters.brand.length > 0) {
      params.filters.brand.forEach((b) => queryParams.append('brand', b));
    }
    if (params.filters.material && params.filters.material.length > 0) {
      params.filters.material.forEach((m) => queryParams.append('material', m));
    }
    if (params.filters.color && params.filters.color.length > 0) {
      params.filters.color.forEach((c) => queryParams.append('color', c));
    }
  }

  const res = await fetch(`${API_BASE}/search?${queryParams.toString()}`);
  if (!res.ok) {
    throw new Error(`Search request failed with status ${res.status}`);
  }
  return res.json();
}

export async function getProductById(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`Failed to load product ${id}`);
  }
  const data = await res.json();
  return data.product;
}

export async function getSimilarProducts(id: string, limit = 6): Promise<any[]> {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}/similar?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Failed to load similar products for ${id}`);
  }
  const data = await res.json();
  return data.recommendations || [];
}

export async function getRecommendations(sessionId: string, limit = 8): Promise<RecommendationResponse> {
  const res = await fetch(`${API_BASE}/recommendations?sessionId=${encodeURIComponent(sessionId)}&limit=${limit}`);
  if (!res.ok) {
    throw new Error('Failed to load recommendations');
  }
  return res.json();
}

export async function recordInteraction(event: UserInteractionEvent): Promise<void> {
  try {
    await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  } catch (err) {
    console.warn('Failed to record user interaction:', err);
  }
}

export async function getSuggestions(query: string): Promise<{ text: string; type: string }[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions || [];
}

export async function getEvaluationRuns(): Promise<EvaluationRun[]> {
  const res = await fetch(`${API_BASE}/evaluation/runs`);
  if (!res.ok) {
    throw new Error('Failed to fetch evaluation runs');
  }
  const data = await res.json();
  return data.runs || [];
}

export async function runEvaluationNow(): Promise<EvaluationRun> {
  const res = await fetch(`${API_BASE}/evaluation/run`, {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error('Failed to trigger evaluation run');
  }
  const data = await res.json();
  return data.run;
}

export async function getAnalyticsOverview(): Promise<any> {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) {
    throw new Error('Failed to fetch analytics overview');
  }
  return res.json();
}
