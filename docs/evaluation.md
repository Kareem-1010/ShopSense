# Information Retrieval Evaluation & Benchmarking Methodology

## 1. Evaluation Objectives
The goal of ShopSense evaluation is to empirically quantify retrieval quality differences between:
1. **Lexical Baseline (BM25 / Field-Weighted Full-Text Search)**
2. **Dense Semantic Retrieval (64-Dimensional Cosine Vector Search)**
3. **Hybrid Retrieval (Reciprocal Rank Fusion with $k = 60$)**

---

## 2. Benchmark Dataset (`data/evaluation_queries.jsonl`)
The benchmark contains **53 diverse, annotated queries** spanning:
- Natural-language descriptions (e.g. *"A compact wooden desk for a small apartment under 15000 rupees"*)
- Exact product names
- Broad category queries (*"office desks"*, *"rugs"*)
- Attribute combinations (*"solid oak writing desk with drawers"*)
- Price constraints (*"dining table under 20000 rupees"*)
- Domain synonyms (*"couch"* $\to$ sofa, *"credenza"* $\to$ storage, *"carpet"* $\to$ rug)
- Common user misspellings (*"woodn deske"*, *"modren beig sofa"*)
- Multiple compound constraints
- Out-of-catalog / Zero-result queries (*"smartphone charger cable"* $\to$ 0 results expected)

Each query is annotated with:
- `relevant_product_ids`: Array of ground-truth relevant IDs.
- `relevance_grades`: Graded relevance (Grade 2 = exact flagship match, Grade 1 = acceptable alternative, Grade 0 = irrelevant).

---

## 3. Mathematical Metric Definitions

### Precision@K
Proportion of top-$K$ retrieved candidates that are relevant:
$$\text{Precision@}K = \frac{|\text{Retrieved}_K \cap \text{Relevant}|}{K}$$
*Edge case*: For zero-result queries with no relevant documents in catalog, if the system correctly returns 0 items, Precision is defined as $1.0$; if it returns irrelevant items, Precision is $0.0$.

### Recall@K
Proportion of all known relevant documents successfully retrieved in top-$K$:
$$\text{Recall@}K = \frac{|\text{Retrieved}_K \cap \text{Relevant}|}{|\text{Relevant}|}$$
*Edge case*: If $|\text{Relevant}| = 0$ and $|\text{Retrieved}_K| = 0$, Recall is defined as $1.0$.

### Mean Reciprocal Rank (MRR@10)
Measures how high the first relevant result appears in the ranked list:
$$\text{MRR@}10 = \frac{1}{\text{rank}_1}$$
where $\text{rank}_1$ is the rank of the first relevant candidate within the top 10 ($0$ if none appear).

### Normalized Discounted Cumulative Gain (NDCG@10)
Measures graded ranking quality, giving higher credit when highly relevant items (Grade 2) appear near the very top:
$$\text{DCG@}10 = \sum_{i=1}^{10} \frac{2^{\text{grade}_i} - 1}{\log_2(i + 1)}$$
$$\text{NDCG@}10 = \frac{\text{DCG@}10}{\text{IDCG@}10}$$

---

## 4. Measured Empirical Results

Recorded on the 53-query benchmark:

| Metric | Lexical Baseline | Dense Semantic | Hybrid (RRF $k=60$) | Relative Lift |
| :--- | :---: | :---: | :---: | :---: |
| **Precision@5** | 33.2% | 40.4% | **41.1%** | **+23.8%** |
| **Precision@10** | 26.6% | 31.5% | **32.3%** | **+21.4%** |
| **Recall@5** | 31.2% | 31.9% | **34.1%** | **+9.3%** |
| **Recall@10** | 42.9% | 44.2% | **48.8%** | **+13.7%** |
| **MRR@10** | 0.6281 | **0.6393** | 0.6349 | +1.1% |
| **NDCG@10** | 0.3929 | 0.4078 | **0.4306** | **+9.6%** |

### Key Findings
1. **Hybrid RRF outperforms both pure Lexical and pure Dense retrieval across Recall and NDCG**: Lexical search excels at exact matches (like product names and specific numbers) but fails on vocabulary mismatch (e.g. "couch" vs "sofa"). Dense search excels on abstract conceptual queries ("warm reading corner") but can blur exact numbers. Fusing both via RRF yields a **+13.7% boost in Recall@10** and **+9.6% boost in NDCG@10**.
2. **Latency is bounded**: Measured p50 latency is **45ms** and p95 latency is **52ms** on the un-cached 525 product dataset.
