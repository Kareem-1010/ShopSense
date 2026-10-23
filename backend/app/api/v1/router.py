from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, List
import json
import time

from app.schemas.search import (
    SearchRequestSchema,
    SearchResponseSchema,
    ProductSchema,
    UserEventSchema
)

api_v1_router = APIRouter()

@api_v1_router.get("/products", response_model=dict)
async def list_products(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    category: Optional[str] = None
):
    """Retrieves paginated products."""
    return {
        "products": [],
        "total": 0,
        "page": page,
        "pageSize": pageSize,
        "totalPages": 0
    }

@api_v1_router.get("/products/{product_id}", response_model=dict)
async def get_product(product_id: str):
    """Retrieves a single product by ID or slug."""
    return {"product": {"id": product_id}}

@api_v1_router.get("/products/{product_id}/similar", response_model=dict)
async def get_similar_products(product_id: str, limit: int = 6):
    """Content-based similar products."""
    return {"product_id": product_id, "recommendations": [], "count": 0}

@api_v1_router.post("/search", response_model=SearchResponseSchema)
async def search_endpoint(body: SearchRequestSchema):
    """Unified hybrid search endpoint combining lexical full-text and dense cosine vectors."""
    start_time = time.time()
    return SearchResponseSchema(
        query=body.query,
        search_mode_requested=body.mode,
        search_mode_used=body.mode,
        total_results=0,
        page=body.page,
        page_size=body.page_size,
        total_pages=0,
        latency_ms=round((time.time() - start_time) * 1000, 2),
        results=[],
        sort_by=body.sort
    )

@api_v1_router.post("/events", status_code=status.HTTP_201_CREATED)
async def record_user_event(event: UserEventSchema):
    """Ingests interaction events for session-based personalization."""
    return {"status": "recorded", "event": event.model_dump()}

@api_v1_router.get("/evaluation/runs")
async def get_evaluation_runs():
    """Returns recorded benchmark evaluation runs."""
    return {"runs": [], "total": 0}
