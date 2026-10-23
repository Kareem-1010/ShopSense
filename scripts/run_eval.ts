import { dbStore } from '../src/server/db/store.js';
import { ensureProductEmbeddings } from '../src/server/search/dense.js';
import { runBenchmarkEvaluation } from '../src/server/evaluation/runner.js';

async function main() {
  await dbStore.initialize();
  const products = dbStore.getAllProducts();
  ensureProductEmbeddings(products);

  console.log('Running benchmark evaluation...');
  const run = runBenchmarkEvaluation();

  console.log('\n======================================================');
  console.log('SHOPSENSE IR RETRIEVAL BENCHMARK RESULTS');
  console.log('======================================================');
  console.log(`Run ID:            ${run.run_id}`);
  console.log(`Benchmark Version: ${run.benchmark_version}`);
  console.log(`Evaluated Queries: ${run.total_queries}`);
  console.log(`Latency p50 / p95: ${run.latency_percentiles.p50_ms}ms / ${run.latency_percentiles.p95_ms}ms`);
  console.log('------------------------------------------------------');
  console.log('METRIC          | LEXICAL BASELINE | DENSE SEMANTIC | HYBRID (RRF k=60)');
  console.log('------------------------------------------------------');
  console.log(`Precision@5     | ${(run.metrics.lexical.precision_at_5 * 100).toFixed(1)}%           | ${(run.metrics.dense.precision_at_5 * 100).toFixed(1)}%         | ${(run.metrics.hybrid.precision_at_5 * 100).toFixed(1)}%`);
  console.log(`Precision@10    | ${(run.metrics.lexical.precision_at_10 * 100).toFixed(1)}%           | ${(run.metrics.dense.precision_at_10 * 100).toFixed(1)}%         | ${(run.metrics.hybrid.precision_at_10 * 100).toFixed(1)}%`);
  console.log(`Recall@5        | ${(run.metrics.lexical.recall_at_5 * 100).toFixed(1)}%           | ${(run.metrics.dense.recall_at_5 * 100).toFixed(1)}%         | ${(run.metrics.hybrid.recall_at_5 * 100).toFixed(1)}%`);
  console.log(`Recall@10       | ${(run.metrics.lexical.recall_at_10 * 100).toFixed(1)}%           | ${(run.metrics.dense.recall_at_10 * 100).toFixed(1)}%         | ${(run.metrics.hybrid.recall_at_10 * 100).toFixed(1)}%`);
  console.log(`MRR@10          | ${run.metrics.lexical.mrr_at_10.toFixed(4)}           | ${run.metrics.dense.mrr_at_10.toFixed(4)}         | ${run.metrics.hybrid.mrr_at_10.toFixed(4)}`);
  console.log(`NDCG@10         | ${run.metrics.lexical.ndcg_at_10.toFixed(4)}           | ${run.metrics.dense.ndcg_at_10.toFixed(4)}         | ${run.metrics.hybrid.ndcg_at_10.toFixed(4)}`);
  console.log('======================================================\n');
}

main().catch(console.error);
