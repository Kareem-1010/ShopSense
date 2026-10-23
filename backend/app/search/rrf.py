from typing import List, Dict, Any

def reciprocal_rank_fusion(
    lexical_ranked: List[Dict[str, Any]],
    dense_ranked: List[Dict[str, Any]],
    k: int = 60
) -> List[Dict[str, Any]]:
    """
    Reciprocal Rank Fusion formula:
    RRF_score(d) = sum_i 1 / (k + rank_i(d))
    """
    scores: Dict[str, Dict[str, Any]] = {}

    for item in lexical_ranked:
        doc_id = item["id"]
        rank = item["lexical_rank"]
        rrf = 1.0 / (k + rank)
        scores[doc_id] = {
            "id": doc_id,
            "rrf_score": rrf,
            "lexical_rank": rank,
            "dense_rank": None,
            "product": item.get("product")
        }

    for item in dense_ranked:
        doc_id = item["id"]
        rank = item["dense_rank"]
        rrf = 1.0 / (k + rank)
        if doc_id in scores:
            scores[doc_id]["rrf_score"] += rrf
            scores[doc_id]["dense_rank"] = rank
        else:
            scores[doc_id] = {
                "id": doc_id,
                "rrf_score": rrf,
                "lexical_rank": None,
                "dense_rank": rank,
                "product": item.get("product")
            }

    combined = list(scores.values())
    combined.sort(key=lambda x: (-x["rrf_score"], x["id"]))
    
    for idx, item in enumerate(combined):
        item["rank"] = idx + 1
        item["rrf_score"] = round(item["rrf_score"], 6)

    return combined
