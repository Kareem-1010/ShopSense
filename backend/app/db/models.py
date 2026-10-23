import datetime
from sqlalchemy import Column, String, Integer, Numeric, Text, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class ProductModel(Base):
    __tablename__ = "products"

    id = Column(String(64), primary_key=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(64), nullable=False, index=True)
    brand = Column(String(64), nullable=False, index=True)
    price = Column(Numeric(12, 2), nullable=False, index=True)
    currency = Column(String(8), default="INR", nullable=False)
    images = Column(Text, nullable=False)  # JSON-encoded array
    color = Column(String(64), nullable=False)
    material = Column(String(128), nullable=False)
    width = Column(Numeric(8, 2), nullable=False)
    height = Column(Numeric(8, 2), nullable=False)
    depth = Column(Numeric(8, 2), nullable=False)
    rating = Column(Numeric(3, 2), default=4.5, nullable=False, index=True)
    rating_count = Column(Integer, default=0, nullable=False)
    availability = Column(String(32), default="in_stock", nullable=False)
    searchable_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    embedding = relationship("ProductEmbeddingModel", uselist=False, back_populates="product")

class ProductEmbeddingModel(Base):
    __tablename__ = "product_embeddings"

    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    model_identifier = Column(String(64), default="shopsense-dense-v1", nullable=False)
    embedding_json = Column(Text, nullable=False)  # JSON or pgvector column
    dimensions = Column(Integer, default=64, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("ProductModel", back_populates="embedding")

class SearchEventModel(Base):
    __tablename__ = "search_events"

    id = Column(String(64), primary_key=True)
    query_text = Column(String(512), nullable=False)
    normalized_query = Column(String(512), nullable=False)
    retrieval_mode = Column(String(32), nullable=False)
    latency_ms = Column(Numeric(8, 2), nullable=False)
    session_id = Column(String(64), nullable=False, index=True)
    result_ids = Column(Text, nullable=False)  # JSON array
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class UserInteractionModel(Base):
    __tablename__ = "user_interactions"

    id = Column(String(64), primary_key=True)
    session_id = Column(String(64), nullable=False, index=True)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(32), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
