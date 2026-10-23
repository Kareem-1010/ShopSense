from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class ProductSchema(BaseModel):
    id: str
    slug: str
    title: str
    description: str
    category: str
    brand: str
    price: float
    currency: str = "INR"
    images: List[str] = []
    color: str
    material: str
    width: float
    height: float
    depth: float
    rating: float
    rating_count: int
    availability: Literal["in_stock", "low_stock", "out_of_stock"]

class SearchFiltersSchema(BaseModel):
    category: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    brand: Optional[List[str]] = None
    material: Optional[List[str]] = None
    color: Optional[List[str]] = None
    min_rating: Optional[float] = None
    availability: Optional[List[str]] = None

class SearchRequestSchema(BaseModel):
    query: str = ""
    mode: Literal["hybrid", "semantic", "keyword"] = "hybrid"
    filters: Optional[SearchFiltersSchema] = None
    sort: Literal["relevance", "price_asc", "price_desc", "rating_desc", "popularity"] = "relevance"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=12, ge=1, le=100)
    session_id: Optional[str] = "anon-session"

class ExplanationSignalsSchema(BaseModel):
    matched_category: bool
    category_name: Optional[str] = None
    matched_materials: List[str] = []
    matched_colors: List[str] = []
    matched_title_terms: List[str] = []
    price_constraint_satisfied: bool = True
    dense_semantic_relevance: str = "none"
    dense_similarity: float = 0.0
    lexical_score: float = 0.0
    lexical_rank: Optional[int] = None
    dense_rank: Optional[int] = None
    rrf_score: Optional[float] = None
    summary: str

class SearchResultItemSchema(BaseModel):
    product: ProductSchema
    rank: int
    score: float
    lexical_rank: Optional[int] = None
    dense_rank: Optional[int] = None
    lexical_score: Optional[float] = None
    dense_score: Optional[float] = None
    rrf_score: Optional[float] = None
    explanation: ExplanationSignalsSchema

class SearchResponseSchema(BaseModel):
    query: str
    search_mode_requested: str
    search_mode_used: str
    total_results: int
    page: int
    page_size: int
    total_pages: int
    latency_ms: float
    results: List[SearchResultItemSchema]
    sort_by: str

class UserEventSchema(BaseModel):
    session_id: str
    product_id: str
    event_type: Literal["view", "click", "save", "compare"]
    query: Optional[str] = None
    position: Optional[int] = None
