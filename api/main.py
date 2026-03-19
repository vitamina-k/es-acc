"""VIGILIA API — FastAPI application."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db import get_driver, close_driver
from models import HealthResponse, MetaResponse, SubgraphResponse, PatternResponse, SearchResult
import services


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify Neo4j connection
    try:
        driver = await get_driver()
        await driver.verify_connectivity()
        print("✓ Neo4j connection verified")
    except Exception as e:
        print(f"⚠ Neo4j not available at startup: {e}")
    yield
    # Shutdown
    await close_driver()


app = FastAPI(
    title="VIGILIA API",
    description="API pública de transparencia — es-acc (Spanish Accelerationism)",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Health ---

@app.get("/health", response_model=HealthResponse)
async def health():
    neo4j_status = "unknown"
    try:
        driver = await get_driver()
        await driver.verify_connectivity()
        neo4j_status = "connected"
    except Exception:
        neo4j_status = "disconnected"

    return HealthResponse(
        status="ok",
        neo4j=neo4j_status,
        timestamp=datetime.now(timezone.utc),
    )


# --- Public endpoints ---

@app.get("/api/v1/public/meta", response_model=MetaResponse)
async def public_meta():
    """Aggregate metrics and source status."""
    try:
        return await services.get_meta()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error accessing graph: {e}")


@app.get("/api/v1/public/graph/company/{nif}", response_model=SubgraphResponse)
async def public_company_graph(
    nif: str,
    depth: int = Query(default=2, ge=1, le=4),
):
    """Subgraph of a company by NIF."""
    return await services.get_company_subgraph(nif, depth=depth)


@app.get("/api/v1/public/patterns/company/{nif}", response_model=PatternResponse)
async def public_company_patterns(nif: str):
    """Risk pattern analysis for a company."""
    return await services.get_company_patterns(nif)


@app.get("/api/v1/public/search", response_model=list[SearchResult])
async def public_search(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(default=20, ge=1, le=100),
):
    """Full-text search across entities."""
    return await services.search_entities(q, limit=limit)
