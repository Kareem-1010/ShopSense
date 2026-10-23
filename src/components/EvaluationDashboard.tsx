import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Play,
  RotateCw,
  Clock,
  Layers,
  FileText,
  Cpu,
  TrendingUp,
  Search,
  CheckCircle2
} from 'lucide-react';
import { EvaluationRun, QueryEvaluationDetail } from '../types/index.js';
import { getEvaluationRuns, runEvaluationNow } from '../services/api.js';

export const EvaluationDashboard: React.FC = () => {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningEval, setRunningEval] = useState(false);
  const [selectedQueryType, setSelectedQueryType] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await getEvaluationRuns();
      setRuns(data);
      if (data.length > 0 && !selectedRun) {
        setSelectedRun(data[0]);
      }
    } catch (err) {
      console.error('Failed to load evaluation runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleTriggerRun = async () => {
    try {
      setRunningEval(true);
      const newRun = await runEvaluationNow();
      setRuns((prev) => [newRun, ...prev]);
      setSelectedRun(newRun);
    } catch (err) {
      console.error('Failed to run evaluation benchmark:', err);
    } finally {
      setRunningEval(false);
    }
  };

  if (loading && runs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <RotateCw className="w-8 h-8 mx-auto animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-medium text-stone-400">Loading IR Evaluation Measurements...</p>
      </div>
    );
  }

  const currentRun = selectedRun || runs[0];

  if (!currentRun) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-stone-600 mb-4" />
        <h3 className="font-serif text-lg font-bold text-stone-200">No Evaluation Runs Recorded</h3>
        <p className="text-sm text-stone-400 mt-1 mb-6">
          Execute the benchmark suite against the 53 labelled queries to measure retrieval metrics.
        </p>
        <button
          onClick={handleTriggerRun}
          disabled={runningEval}
          className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-sm font-semibold inline-flex items-center gap-2 shadow"
        >
          {runningEval ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{runningEval ? 'Running Evaluation Benchmark...' : 'Run Benchmark Evaluation Now'}</span>
        </button>
      </div>
    );
  }

  // Filter queries in detailed table
  const filteredQueries = (currentRun.sample_query_results || []).filter((q: QueryEvaluationDetail) => {
    if (selectedQueryType !== 'all' && q.query_type !== selectedQueryType) return false;
    if (searchFilter && !q.query.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    return true;
  });

  // Calculate Deltas: (Hybrid - Lexical) / Lexical
  const calcDelta = (hybridVal: number, baselineVal: number) => {
    if (baselineVal === 0) return 0;
    return ((hybridVal - baselineVal) / baselineVal) * 100;
  };

  const recall10Delta = calcDelta(currentRun.metrics.hybrid.recall_at_10, currentRun.metrics.lexical.recall_at_10);
  const prec10Delta = calcDelta(currentRun.metrics.hybrid.precision_at_10, currentRun.metrics.lexical.precision_at_10);
  const ndcg10Delta = calcDelta(currentRun.metrics.hybrid.ndcg_at_10, currentRun.metrics.lexical.ndcg_at_10);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
              IR Benchmark Evaluation
            </span>
            <span className="text-xs text-stone-400 font-mono">
              Version: {currentRun.benchmark_version}
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-100">
            Information Retrieval Quality &amp; Ranking Dashboard
          </h2>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            Empirical evaluation comparing Lexical (BM25), Dense Semantic (Cosine Embeddings), and Hybrid (Reciprocal Rank Fusion k=60) on a verified ground-truth test collection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerRun}
            disabled={runningEval}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
          >
            {runningEval ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{runningEval ? 'Evaluating Queries...' : 'Re-run Benchmark'}</span>
          </button>
        </div>
      </div>

      {/* Key Metric Highlights Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Benchmark Queries */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
            <span>Labelled Test Queries</span>
            <Search className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">
            {currentRun.total_queries}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">10 Distinct Query Types Covered</div>
        </div>

        {/* Recall@10 Gain */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
            <span>Hybrid Recall@10</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100 flex items-baseline gap-2">
            <span>{(currentRun.metrics.hybrid.recall_at_10 * 100).toFixed(1)}%</span>
            <span className="text-xs font-bold text-emerald-500">
              +{recall10Delta > 0 ? recall10Delta.toFixed(1) : 0}% vs Lexical
            </span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Lexical baseline: {(currentRun.metrics.lexical.recall_at_10 * 100).toFixed(1)}%</div>
        </div>

        {/* NDCG@10 Quality */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
            <span>Hybrid NDCG@10</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100 flex items-baseline gap-2">
            <span>{currentRun.metrics.hybrid.ndcg_at_10.toFixed(4)}</span>
            <span className="text-xs font-bold text-emerald-500">
              +{ndcg10Delta > 0 ? ndcg10Delta.toFixed(1) : 0}%
            </span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Graded ranking quality index</div>
        </div>

        {/* Latency Percentiles */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
            <span>Latency p50 / p95</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="font-serif text-3xl font-bold text-stone-900 dark:text-stone-100 font-mono">
            {currentRun.latency_percentiles.p50_ms}ms <span className="text-base text-stone-400 font-sans">/ {currentRun.latency_percentiles.p95_ms}ms</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Measured on live execution workload</div>
        </div>
      </div>

      {/* Side-by-Side Retrieval Paradigm Comparison Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              Comparative Benchmark Matrix
            </h3>
            <p className="text-xs text-stone-400">
              Evaluated strictly on identical candidate pools across all 53 test queries
            </p>
          </div>
          <div className="text-xs text-stone-500 font-mono">
            Run ID: {currentRun.run_id}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Evaluation Metric</th>
                <th className="py-3 px-4 font-semibold">
                  <div className="flex items-center gap-1.5 text-stone-300">
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    <span>Lexical Baseline</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">
                  <div className="flex items-center gap-1.5 text-stone-300">
                    <Cpu className="w-3.5 h-3.5 text-stone-400" />
                    <span>Dense Semantic</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hybrid (RRF k=60)</span>
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right">Relative Lift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono">
              {/* Precision@5 */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-semibold text-stone-800 dark:text-stone-200">
                  Precision@5
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {(currentRun.metrics.lexical.precision_at_5 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {(currentRun.metrics.dense.precision_at_5 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold">
                  {(currentRun.metrics.hybrid.precision_at_5 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-bold">
                    +{calcDelta(currentRun.metrics.hybrid.precision_at_5, currentRun.metrics.lexical.precision_at_5).toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Precision@10 */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-semibold text-stone-800 dark:text-stone-200">
                  Precision@10
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {(currentRun.metrics.lexical.precision_at_10 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {(currentRun.metrics.dense.precision_at_10 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold">
                  {(currentRun.metrics.hybrid.precision_at_10 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-bold">
                    +{prec10Delta.toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Recall@5 */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-semibold text-stone-800 dark:text-stone-200">
                  Recall@5
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {(currentRun.metrics.lexical.recall_at_5 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {(currentRun.metrics.dense.recall_at_5 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold">
                  {(currentRun.metrics.hybrid.recall_at_5 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-bold">
                    +{calcDelta(currentRun.metrics.hybrid.recall_at_5, currentRun.metrics.lexical.recall_at_5).toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Recall@10 */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-semibold text-stone-800 dark:text-stone-200">
                  Recall@10
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {(currentRun.metrics.lexical.recall_at_10 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {(currentRun.metrics.dense.recall_at_10 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold">
                  {(currentRun.metrics.hybrid.recall_at_10 * 100).toFixed(1)}%
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-bold">
                    +{recall10Delta.toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* MRR@10 */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-semibold text-stone-800 dark:text-stone-200">
                  MRR@10 (Mean Reciprocal Rank)
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {currentRun.metrics.lexical.mrr_at_10.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {currentRun.metrics.dense.mrr_at_10.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold">
                  {currentRun.metrics.hybrid.mrr_at_10.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-bold">
                    +{calcDelta(currentRun.metrics.hybrid.mrr_at_10, currentRun.metrics.lexical.mrr_at_10).toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* NDCG@10 */}
              <tr>
                <td className="py-3.5 px-4 font-sans font-semibold text-stone-800 dark:text-stone-200">
                  NDCG@10 (Discounted Cumulative Gain)
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {currentRun.metrics.lexical.ndcg_at_10.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 text-stone-600 dark:text-stone-300">
                  {currentRun.metrics.dense.ndcg_at_10.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-bold">
                  {currentRun.metrics.hybrid.ndcg_at_10.toFixed(4)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[11px] font-bold">
                    +{ndcg10Delta.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Query-Level Drilldown & Diagnostic Inspector */}
      <div className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
              Query-Level Inspection ({filteredQueries.length} of {currentRun.sample_query_results.length})
            </h3>
            <p className="text-xs text-stone-400">
              Inspect how each query behaved across the 3 retrieval algorithms
            </p>
          </div>

          {/* Filter query types */}
          <div className="flex items-center gap-2">
            <select
              value={selectedQueryType}
              onChange={(e) => setSelectedQueryType(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs text-stone-800 dark:text-stone-200 focus:outline-none"
            >
              <option value="all">All Query Types</option>
              <option value="natural_language_description">Natural Language</option>
              <option value="exact_product_name">Exact Names</option>
              <option value="category">Category</option>
              <option value="attribute_combination">Attribute Combos</option>
              <option value="price_constraint">Price Constraints</option>
              <option value="synonyms">Synonyms</option>
              <option value="misspellings">Misspellings</option>
              <option value="multiple_constraints">Multi Constraints</option>
              <option value="no_results">Zero Results</option>
            </select>

            <input
              type="text"
              placeholder="Search query text..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs text-stone-800 dark:text-stone-200 focus:outline-none w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-stone-50 dark:bg-stone-950 z-10">
              <tr className="border-b border-stone-200 dark:border-stone-800 text-[10px] text-stone-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 font-semibold">Query</th>
                <th className="py-2.5 px-3 font-semibold">Type</th>
                <th className="py-2.5 px-3 font-semibold">Truth Count</th>
                <th className="py-2.5 px-3 font-semibold">Lexical NDCG</th>
                <th className="py-2.5 px-3 font-semibold">Dense NDCG</th>
                <th className="py-2.5 px-3 font-semibold">Hybrid NDCG</th>
                <th className="py-2.5 px-3 font-semibold">Hybrid Recall@10</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 font-mono">
              {filteredQueries.map((q) => (
                <tr key={q.query_id} className="hover:bg-stone-50 dark:hover:bg-stone-850 transition-colors">
                  <td className="py-2.5 px-3 font-sans font-medium text-stone-800 dark:text-stone-200 max-w-xs truncate">
                    {q.query}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 capitalize">
                      {q.query_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-stone-500">{q.ground_truth_count}</td>
                  <td className="py-2.5 px-3 text-stone-500">{q.lexical.ndcg_at_10.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-stone-500">{q.dense.ndcg_at_10.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-amber-500 font-bold">{q.hybrid.ndcg_at_10.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-emerald-500 font-semibold">
                    {(q.hybrid.recall_at_10 * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Engineering Notes & Architectural Rigor */}
      <div className="p-6 rounded-3xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400 space-y-2">
        <div className="flex items-center gap-2 text-stone-800 dark:text-stone-200 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-amber-500" />
          <span>Evaluation Methodology &amp; Benchmarking Transparency</span>
        </div>
        <p className="leading-relaxed">
          Retrieval quality is measured on an offline benchmark with ground-truth relevance annotations. Lexical retrieval utilizes weighted field BM25 scoring with language stemming and domain synonyms. Dense retrieval projects queries into a 64-dimensional semantic concept vector space and executes cosine similarity searches. Hybrid retrieval merges both candidate sets using Reciprocal Rank Fusion (k=60) with deterministic tie-breaking.
        </p>
      </div>
    </div>
  );
};
