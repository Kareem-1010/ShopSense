import {
  Product,
  SearchMode,
  SearchFilters,
  SortOption,
  SearchResponse,
  SearchResultItem
} from '../../types/index.js';
import { dbStore } from '../db/store.js';
import { retrieveLexical } from './lexical.js';
import { retrieveDense } from './dense.js';
import { reciprocalRankFusion } from './rrf.js';
import { parseQueryDeterministic } from './query_parser.js';
import { buildExplanationSignals } from './explainability.js';
import { cosineSimilarity, generateDenseEmbedding } from './embeddings.js';
import { postgresDb } from '../db/postgres.js';

export interface ExecuteSearchOptions {
  query: string;
  mode?: SearchMode;
  filters?: SearchFilters;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  sessionId?: string;
}

export function executeSearch(options: ExecuteSearchOptions): SearchResponse {
  // Use high-resolution monotonic clock
  const startMonotonic = performance.now();
  const rawQuery = (options.query || '').trim();
  const requestedMode: SearchMode = options.mode || 'hybrid';
  const sort: SortOption = options.sort || 'relevance';
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 12));
  const sessionId = options.sessionId || 'anonymous-session';

  // 1. Parse Query deterministically
  const parsed = parseQueryDeterministic(rawQuery);

  // Merge explicit filters with parsed constraints if not already explicitly specified
  const activeFilters: SearchFilters = { ...options.filters };
  if (!activeFilters.category && parsed.extracted_category) {
    activeFilters.category = parsed.extracted_category;
  }
  if (activeFilters.max_price === undefined && parsed.extracted_price_max !== undefined) {
    activeFilters.max_price = parsed.extracted_price_max;
  }
  if (activeFilters.min_price === undefined && parsed.extracted_price_min !== undefined) {
    activeFilters.min_price = parsed.extracted_price_min;
  }

  // 2. Filter Candidate Pool
  const filteredProducts = dbStore.filterProducts(activeFilters);

  let searchModeUsed: SearchMode = requestedMode;
  let fallbackReason: string | undefined = undefined;
  let candidateItems: SearchResultItem[] = [];
  let lexicalCount = 0;
  let denseCount = 0;

  const queryVector = generateDenseEmbedding(rawQuery);

  // If query is empty, serve catalog under the requested mode
  if (!rawQuery) {
    const sorted = dbStore.sortProducts(filteredProducts, sort);
    const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
    const results: SearchResultItem[] = paginated.map((prod, idx) => ({
      product: prod,
      rank: (page - 1) * pageSize + idx + 1,
      score: 1.0,
      explanation: buildExplanationSignals(prod, parsed, 0, 0)
    }));

    const latencyMs = parseFloat((performance.now() - startMonotonic).toFixed(2));
    return {
      query: rawQuery,
      parsed_query: parsed,
      search_mode_requested: requestedMode,
      search_mode_used: requestedMode,
      fallback_reason: undefined,
      pgvector_enabled: postgresDb.getStatus().pgvector_enabled,
      total_results: sorted.length,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(sorted.length / pageSize),
      latency_ms: latencyMs,
      results,
      applied_filters: activeFilters,
      sort_by: sort,
      active_candidates_count: { lexical: sorted.length, dense: 0, combined: sorted.length }
    };
  }

  // 3. Execution by Search Mode
  if (requestedMode === 'keyword') {
    searchModeUsed = 'keyword';
    const lexicalResults = retrieveLexical(filteredProducts, rawQuery, 100);
    lexicalCount = lexicalResults.length;

    candidateItems = lexicalResults.map((item, idx) => {
      const prodEmbedding = dbStore.getEmbedding(item.product.id) || [];
      const sim = prodEmbedding.length ? cosineSimilarity(queryVector, prodEmbedding) : 0;
      return {
        product: item.product,
        rank: idx + 1,
        score: item.lexical_score,
        lexical_rank: item.lexical_rank,
        lexical_score: item.lexical_score,
        explanation: buildExplanationSignals(
          item.product,
          parsed,
          sim,
          item.lexical_score,
          item.lexical_rank,
          undefined,
          undefined
        )
      };
    });
  } else if (requestedMode === 'semantic') {
    const denseResults = retrieveDense(filteredProducts, rawQuery, 100, 0.05);
    denseCount = denseResults.length;

    if (denseCount > 0) {
      searchModeUsed = 'semantic';
      candidateItems = denseResults.map((item, idx) => ({
        product: item.product,
        rank: idx + 1,
        score: item.dense_score,
        dense_rank: item.dense_rank,
        dense_score: item.dense_score,
        explanation: buildExplanationSignals(
          item.product,
          parsed,
          item.dense_score,
          0,
          undefined,
          item.dense_rank,
          undefined
        )
      }));
    } else {
      // Semantic retrieval yielded 0 candidates (or embeddings missing); fallback to keyword
      searchModeUsed = 'keyword';
      fallbackReason = 'Semantic retrieval produced 0 matching candidates; fell back to lexical search.';
      const lexicalResults = retrieveLexical(filteredProducts, rawQuery, 100);
      lexicalCount = lexicalResults.length;

      candidateItems = lexicalResults.map((item, idx) => ({
        product: item.product,
        rank: idx + 1,
        score: item.lexical_score,
        lexical_rank: item.lexical_rank,
        lexical_score: item.lexical_score,
        explanation: buildExplanationSignals(
          item.product,
          parsed,
          0,
          item.lexical_score,
          item.lexical_rank,
          undefined,
          undefined
        )
      }));
    }
  } else {
    // Hybrid Retrieval (Lexical + Dense fused via Reciprocal Rank Fusion)
    const lexicalCandidates = retrieveLexical(filteredProducts, rawQuery, 60);
    const denseCandidates = retrieveDense(filteredProducts, rawQuery, 60, 0.05);

    lexicalCount = lexicalCandidates.length;
    denseCount = denseCandidates.length;

    if (lexicalCount > 0 && denseCount > 0) {
      // True hybrid fusion: both algorithms returned candidates!
      searchModeUsed = 'hybrid';
      const fused = reciprocalRankFusion(lexicalCandidates, denseCandidates, 60);
      candidateItems = fused.map((item, idx) => {
        const prodEmbedding = dbStore.getEmbedding(item.product.id) || [];
        const sim = item.dense_score !== undefined
          ? item.dense_score
          : prodEmbedding.length
          ? cosineSimilarity(queryVector, prodEmbedding)
          : 0;

        return {
          product: item.product,
          rank: idx + 1,
          score: item.rrf_score,
          lexical_rank: item.lexical_rank,
          dense_rank: item.dense_rank,
          lexical_score: item.lexical_score,
          dense_score: item.dense_score,
          rrf_score: item.rrf_score,
          explanation: buildExplanationSignals(
            item.product,
            parsed,
            sim,
            item.lexical_score || 0,
            item.lexical_rank,
            item.dense_rank,
            item.rrf_score
          )
        };
      });
    } else if (denseCount === 0 && lexicalCount > 0) {
      // Semantic retrieval yielded 0 candidates; fallback to keyword
      // Never report Hybrid when only lexical search ran!
      searchModeUsed = 'keyword';
      fallbackReason = 'Semantic retrieval returned 0 candidates; fell back to lexical keyword retrieval.';
      candidateItems = lexicalCandidates.map((item, idx) => ({
        product: item.product,
        rank: idx + 1,
        score: item.lexical_score,
        lexical_rank: item.lexical_rank,
        lexical_score: item.lexical_score,
        explanation: buildExplanationSignals(
          item.product,
          parsed,
          0,
          item.lexical_score,
          item.lexical_rank,
          undefined,
          undefined
        )
      }));
    } else if (lexicalCount === 0 && denseCount > 0) {
      // Lexical yielded 0 matches; fallback to dense semantic
      searchModeUsed = 'semantic';
      fallbackReason = 'Lexical retrieval produced 0 matches; fell back to dense semantic retrieval.';
      candidateItems = denseCandidates.map((item, idx) => ({
        product: item.product,
        rank: idx + 1,
        score: item.dense_score,
        dense_rank: item.dense_rank,
        dense_score: item.dense_score,
        explanation: buildExplanationSignals(
          item.product,
          parsed,
          item.dense_score,
          0,
          undefined,
          item.dense_rank,
          undefined
        )
      }));
    } else {
      // Both returned 0 candidates
      searchModeUsed = 'hybrid';
      candidateItems = [];
    }
  }

  // 4. Handle Intent Specializations
  if (parsed.intent === 'cheaper') {
    const topPool = candidateItems.slice(0, 24);
    topPool.sort((a, b) => a.product.price - b.product.price);
    candidateItems = [...topPool, ...candidateItems.slice(24)];
  } else if (parsed.intent === 'better_reviews') {
    const topPool = candidateItems.slice(0, 24);
    topPool.sort((a, b) => b.product.rating - a.product.rating || b.product.rating_count - a.product.rating_count);
    candidateItems = [...topPool, ...candidateItems.slice(24)];
  }

  // 5. Apply User Sorting if not relevance
  if (sort !== 'relevance') {
    if (sort === 'price_asc') {
      candidateItems.sort((a, b) => a.product.price - b.product.price);
    } else if (sort === 'price_desc') {
      candidateItems.sort((a, b) => b.product.price - a.product.price);
    } else if (sort === 'rating_desc') {
      candidateItems.sort((a, b) => b.product.rating - a.product.rating);
    } else if (sort === 'popularity') {
      candidateItems.sort((a, b) => b.product.rating_count - a.product.rating_count);
    }
  }

  // 6. Pagination
  const totalResults = candidateItems.length;
  const totalPages = Math.ceil(totalResults / pageSize);
  const paginatedResults = candidateItems.slice((page - 1) * pageSize, page * pageSize);

  const latencyMs = parseFloat((performance.now() - startMonotonic).toFixed(2));

  // 7. Record Search Event (for observability and analytics)
  dbStore.recordSearchEvent({
    query: rawQuery,
    normalized_query: parsed.normalized_query,
    filters: activeFilters,
    retrieval_mode: searchModeUsed,
    result_ids: candidateItems.slice(0, 20).map((c) => c.product.id),
    latency_ms: latencyMs,
    session_id: sessionId
  });

  return {
    query: rawQuery,
    parsed_query: parsed,
    search_mode_requested: requestedMode,
    search_mode_used: searchModeUsed,
    fallback_reason: fallbackReason,
    pgvector_enabled: postgresDb.getStatus().pgvector_enabled,
    total_results: totalResults,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    latency_ms: latencyMs,
    results: paginatedResults,
    applied_filters: activeFilters,
    sort_by: sort,
    active_candidates_count: {
      lexical: lexicalCount,
      dense: denseCount,
      combined: totalResults
    }
  };
}
