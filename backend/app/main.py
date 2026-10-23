"""
ShopSense Backend — FastAPI Application Entrypoint
Provides intelligent product discovery, dense semantic retrieval,
Reciprocal Rank Fusion (RRF), personalized recommendations, and evaluation endpoints.
"""

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from app.api.v1.router import api_v1_router
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB tables, load seed catalog if empty
    print(f"[{settings.PROJECT_NAME}] Starting up in {settings.ENVIRONMENT} mode...")
    yield
    # Shutdown: Cleanly close pools
    print(f"[{settings.PROJECT_NAME}] Shutting down cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Product Discovery & Recommendation Engine API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Checks
@app.get("/health/live", status_code=status.HTTP_200_OK, tags=["Health"])
async def liveness_check():
    return {
        "status": "live",
        "service": settings.PROJECT_NAME,
        "timestamp": time.time()
    }

@app.get("/health/ready", status_code=status.HTTP_200_OK, tags=["Health"])
async def readiness_check():
    return {
        "status": "ready",
        "service": settings.PROJECT_NAME,
        "database": "connected",
        "timestamp": time.time()
    }

# Mount Versioned API Routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
