from app.evaluation.metrics import (
    compute_precision_at_k,
    compute_recall_at_k,
    compute_mrr_at_k,
    compute_ndcg_at_k
)

def test_precision_at_k_hand_calculated():
    relevant = {"doc1", "doc2", "doc3", "doc4"}
    retrieved = ["doc1", "doc2", "docX", "doc3", "docY"]
    assert compute_precision_at_k(retrieved, relevant, 5) == 0.6

def test_recall_at_k_hand_calculated():
    relevant = {"doc1", "doc2", "doc3", "doc4"}
    retrieved = ["doc1", "docX", "docY", "doc2", "docZ"]
    assert compute_recall_at_k(retrieved, relevant, 5) == 0.5

def test_mrr_at_k_hand_calculated():
    relevant = {"docTarget"}
    assert compute_mrr_at_k(["doc1", "docTarget"], relevant, 10) == 0.5
    assert compute_mrr_at_k(["docTarget", "doc1"], relevant, 10) == 1.0

def test_ndcg_at_k_ideal():
    grades = {"doc1": 2, "doc2": 1}
    assert compute_ndcg_at_k(["doc1", "doc2", "doc3"], grades, 3) == 1.0
