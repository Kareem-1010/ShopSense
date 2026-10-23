import math
from typing import List, Set, Dict

def compute_precision_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
    if k <= 0:
        return 0.0
    if not relevant:
        return 1.0 if not retrieved else 0.0
    top_k = retrieved[:k]
    matches = sum(1 for doc in top_k if doc in relevant)
    return round(matches / k, 4)

def compute_recall_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
    if not relevant:
        return 1.0 if not retrieved else 0.0
    top_k = retrieved[:k]
    matches = sum(1 for doc in top_k if doc in relevant)
    return round(matches / len(relevant), 4)

def compute_mrr_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
    if not relevant:
        return 0.0
    for i, doc in enumerate(retrieved[:k]):
        if doc in relevant:
            return round(1.0 / (i + 1), 4)
    return 0.0

def compute_ndcg_at_k(retrieved: List[str], grades: Dict[str, int], k: int) -> float:
    if k <= 0:
        return 0.0
    dcg = 0.0
    for i, doc in enumerate(retrieved[:k]):
        grade = grades.get(doc, 0)
        if grade > 0:
            dcg += (math.pow(2, grade) - 1.0) / math.log2(i + 2)

    all_grades = sorted([g for g in grades.values() if g > 0], reverse=True)
    if not all_grades:
        return 1.0 if not retrieved else 0.0

    idcg = 0.0
    for i, grade in enumerate(all_grades[:k]):
        idcg += (math.pow(2, grade) - 1.0) / math.log2(i + 2)

    if idcg == 0:
        return 0.0
    return round(dcg / idcg, 4)
