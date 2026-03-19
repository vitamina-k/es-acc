"""VIGILIA API — Pydantic response models."""

from __future__ import annotations
from datetime import date, datetime
from typing import Any
from pydantic import BaseModel, Field


# --- Health ---

class HealthResponse(BaseModel):
    status: str = "ok"
    neo4j: str = "unknown"
    timestamp: datetime


# --- Meta / Stats ---

class SourceStatus(BaseModel):
    id: str
    name: str
    category: str
    frequency: str
    last_run: datetime | None = None
    record_count: int = 0
    status: str = "unknown"  # ok | error | pending


class MetaResponse(BaseModel):
    total_nodes: int = 0
    total_relationships: int = 0
    node_counts: dict[str, int] = {}
    sources: list[SourceStatus] = []


# --- Graph entities ---

class PersonNode(BaseModel):
    id: str
    name: str
    aliases: str | None = None
    labels: list[str] = []
    properties: dict[str, Any] = {}


class CompanyNode(BaseModel):
    nif: str
    name: str
    status: str | None = None
    province: str | None = None
    labels: list[str] = []
    properties: dict[str, Any] = {}


class ContractNode(BaseModel):
    id: str
    title: str
    amount: float | None = None
    award_date: date | None = None
    contracting_authority: str | None = None
    procedure_type: str | None = None


class GrantNode(BaseModel):
    id: str
    title: str
    amount: float | None = None
    grant_date: date | None = None
    granting_organ: str | None = None


class SanctionNode(BaseModel):
    id: str
    sanction_type: str
    source: str
    entity_name: str | None = None
    reason: str | None = None


class TaxDebtNode(BaseModel):
    id: str
    debtor_name: str
    nif: str | None = None
    amount: float = 0
    year: int | None = None


class Edge(BaseModel):
    source: str
    target: str
    type: str
    properties: dict[str, Any] = {}


class SubgraphResponse(BaseModel):
    """Subgraph centered on a single entity."""
    center: CompanyNode | PersonNode
    nodes: list[dict[str, Any]] = []
    edges: list[Edge] = []
    total_nodes: int = 0
    total_edges: int = 0


# --- Patterns ---

class RiskSignal(BaseModel):
    signal_type: str  # tax_debt | sanction | offshore | no_bid_contract
    severity: str     # high | medium | low
    description: str
    source: str
    entity_id: str | None = None


class PatternResponse(BaseModel):
    nif: str
    company_name: str | None = None
    risk_signals: list[RiskSignal] = []
    risk_score: float = 0.0  # 0-100
    connections_summary: dict[str, int] = {}


# --- Search ---

class SearchResult(BaseModel):
    id: str
    label: str  # Person | Company | Contract ...
    name: str
    snippet: str | None = None
    score: float = 0.0
