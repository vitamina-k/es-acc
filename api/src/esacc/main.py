import logging
from collections.abc import AsyncIterator
# VIGILIA API - RELOAD TRIGGER 2026-03-11T22:20
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from esacc.config import settings
from esacc.dependencies import close_driver, init_driver
from esacc.middleware.id_masking import IDMaskingMiddleware
from esacc.middleware.rate_limit import limiter
from esacc.middleware.security_headers import SecurityHeadersMiddleware
from esacc.routers import (
    auth,
    baseline,
    entity,
    graph,
    investigation,
    meta,
    patterns,
    public,
    search,
)
from esacc.routers.archive import emendas
from esacc.services.neo4j_service import ensure_schema

_logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Security check: Ensure we are not using default Neo4j password in production
    app_env = settings.app_env.strip().lower()
    if app_env not in {"dev", "test"} and settings.neo4j_password == "changeme":
        msg = "CRITICAL: Neo4j default password is NOT allowed in production. Set NEO4J_PASSWORD."
        _logger.critical(msg)
        raise RuntimeError(msg)

    # JWT secret is already validated by Pydantic min_length=32 in config.py
    _logger.info("Starting VIGILIA API in %s mode", app_env)
    
    driver = await init_driver()
    app.state.neo4j_driver = driver
    await ensure_schema(driver)
    yield
    await close_driver()


app = FastAPI(
    title="VIGILIA API",
    description="Spanish public data graph intelligence and surveillance tool",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware, app_env=settings.app_env)
app.add_middleware(IDMaskingMiddleware)

app.include_router(meta.router)
app.include_router(public.router)
app.include_router(auth.router)
app.include_router(entity.router)
app.include_router(search.router)
app.include_router(graph.router)
app.include_router(patterns.router)
app.include_router(baseline.router)
app.include_router(investigation.router)
app.include_router(investigation.shared_router)
app.include_router(emendas.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
