import fs from 'fs';
import path from 'path';
import {
  EvaluationRun,
  EvaluationMetricResult,
  QueryEvaluationDetail
} from '../../types/index.js';
import { dbStore } from '../db/store.js';
import { executeSearch } from '../search/service.js';
import { computeQueryMetrics } from './metrics.js';

interface BenchmarkQueryRow {
  id: string;
  query: string;
  query_type: string;
  relevant_product_ids: string[];
  relevance_grades: Record<string, number>;
}

export function runBenchmarkEvaluation(): EvaluationRun {
  const benchmarkFile = path.resolve(process.cwd(), 'data/evaluation_queries.jsonl');
  if (!fs.existsSync(benchmarkFile)) {
    throw new Error(`Benchmark queries file not found at ${benchmarkFile}`);
  }

  const queryRows: BenchmarkQueryRow[] = fs
    .readFileSync(benchmarkFile, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  console.log(`[EvalRunner] Executing evaluation on ${queryRows.length} benchmark queries...`);

  const sampleDetails: QueryEvaluationDetail[] = [];
  const latencies: number[] = [];

  const totals = {
    lexical: { p5: 0, p10: 0, r5: 0, r10: 0, mrr10: 0, ndcg10: 0 },
    dense: { p5: 0, p10: 0, r5: 0, r10: 0, mrr10: 0, ndcg10: 0 },
    hybrid: { p5: 0, p10: 0, r5: 0, r10: 0, mrr10: 0, ndcg10: 0 }
  };

  for (const q of queryRows) {
    const startQ = Date.now();

    // 1. Lexical retrieval
    const lexRes = executeSearch({ query: q.query, mode: 'keyword', pageSize: 15 });
    const lexIds = lexRes.results.map((r) => r.product.id);
    const lexMetrics = computeQueryMetrics(lexIds, q.relevant_product_ids, q.relevance_grades);

    // 2. Dense retrieval
    const denseRes = executeSearch({ query: q.query, mode: 'semantic', pageSize: 15 });
    const denseIds = denseRes.results.map((r) => r.product.id);
    const denseMetrics = computeQueryMetrics(denseIds, q.relevant_product_ids, q.relevance_grades);

    // 3. Hybrid retrieval
    const hybridRes = executeSearch({ query: q.query, mode: 'hybrid', pageSize: 15 });
    const hybridIds = hybridRes.results.map((r) => r.product.id);
    const hybridMetrics = computeQueryMetrics(hybridIds, q.relevant_product_ids, q.relevance_grades);

    const qLatency = Date.now() - startQ;
    latencies.push(qLatency);

    // Accumulate
    totals.lexical.p5 += lexMetrics.precision_at_5;
    totals.lexical.p10 += lexMetrics.precision_at_10;
    totals.lexical.r5 += lexMetrics.recall_at_5;
    totals.lexical.r10 += lexMetrics.recall_at_10;
    totals.lexical.mrr10 += lexMetrics.mrr_at_10;
    totals.lexical.ndcg10 += lexMetrics.ndcg_at_10;

    totals.dense.p5 += denseMetrics.precision_at_5;
    totals.dense.p10 += denseMetrics.precision_at_10;
    totals.dense.r5 += denseMetrics.recall_at_5;
    totals.dense.r10 += denseMetrics.recall_at_10;
    totals.dense.mrr10 += denseMetrics.mrr_at_10;
    totals.dense.ndcg10 += denseMetrics.ndcg_at_10;

    totals.hybrid.p5 += hybridMetrics.precision_at_5;
    totals.hybrid.p10 += hybridMetrics.precision_at_10;
    totals.hybrid.r5 += hybridMetrics.recall_at_5;
    totals.hybrid.r10 += hybridMetrics.recall_at_10;
    totals.hybrid.mrr10 += hybridMetrics.mrr_at_10;
    totals.hybrid.ndcg10 += hybridMetrics.ndcg_at_10;

    sampleDetails.push({
      query_id: q.id,
      query: q.query,
      query_type: q.query_type,
      ground_truth_count: q.relevant_product_ids.length,
      retrieved_count: hybridIds.length,
      lexical: lexMetrics,
      dense: denseMetrics,
      hybrid: hybridMetrics
    });
  }

  const N = queryRows.length || 1;

  const averageLexical: EvaluationMetricResult = {
    precision_at_5: parseFloat((totals.lexical.p5 / N).toFixed(4)),
    precision_at_10: parseFloat((totals.lexical.p10 / N).toFixed(4)),
    recall_at_5: parseFloat((totals.lexical.r5 / N).toFixed(4)),
    recall_at_10: parseFloat((totals.lexical.r10 / N).toFixed(4)),
    mrr_at_10: parseFloat((totals.lexical.mrr10 / N).toFixed(4)),
    ndcg_at_10: parseFloat((totals.lexical.ndcg10 / N).toFixed(4))
  };

  const averageDense: EvaluationMetricResult = {
    precision_at_5: parseFloat((totals.dense.p5 / N).toFixed(4)),
    precision_at_10: parseFloat((totals.dense.p10 / N).toFixed(4)),
    recall_at_5: parseFloat((totals.dense.r5 / N).toFixed(4)),
    recall_at_10: parseFloat((totals.dense.r10 / N).toFixed(4)),
    mrr_at_10: parseFloat((totals.dense.mrr10 / N).toFixed(4)),
    ndcg_at_10: parseFloat((totals.dense.ndcg10 / N).toFixed(4))
  };

  const averageHybrid: EvaluationMetricResult = {
    precision_at_5: parseFloat((totals.hybrid.p5 / N).toFixed(4)),
    precision_at_10: parseFloat((totals.hybrid.p10 / N).toFixed(4)),
    recall_at_5: parseFloat((totals.hybrid.r5 / N).toFixed(4)),
    recall_at_10: parseFloat((totals.hybrid.r10 / N).toFixed(4)),
    mrr_at_10: parseFloat((totals.hybrid.mrr10 / N).toFixed(4)),
    ndcg_at_10: parseFloat((totals.hybrid.ndcg10 / N).toFixed(4))
  };

  // Latency percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  const run: EvaluationRun = {
    run_id: `eval-${Date.now()}`,
    benchmark_version: 'v1.0.0-furniture-53',
    timestamp: new Date().toISOString(),
    total_queries: queryRows.length,
    configuration: {
      rrf_k: 60,
      candidate_depth: 60,
      dense_model: 'shopsense-dense-v1'
    },
    metrics: {
      lexical: averageLexical,
      dense: averageDense,
      hybrid: averageHybrid
    },
    latency_percentiles: {
      p50_ms: p50,
      p95_ms: p95,
      p99_ms: p99
    },
    sample_query_results: sampleDetails
  };

  // Persist run to database store
  dbStore.recordEvaluationRun(run);

  // Write machine-readable JSON report
  const reportPath = path.resolve(process.cwd(), 'data/latest_evaluation_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(run, null, 2), 'utf-8');
  console.log(`[EvalRunner] Benchmark evaluation complete. Report saved to ${reportPath}`);

  return run;
}
