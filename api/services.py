"""VIGILIA API — Neo4j query services."""

from __future__ import annotations
from datetime import datetime
from db import get_session
from models import (
    MetaResponse, SourceStatus, SubgraphResponse, CompanyNode,
    Edge, PatternResponse, RiskSignal, SearchResult,
)


SOURCE_REGISTRY: list[dict] = [
    {"id": "borme", "name": "BORME — Registro Mercantil", "category": "Identidad empresarial", "frequency": "Diaria"},
    {"id": "contratos_estado", "name": "PLACE — Contratación Pública", "category": "Contratos", "frequency": "Diaria"},
    {"id": "congreso", "name": "Congreso de los Diputados", "category": "Legislativo", "frequency": "Diaria"},
    {"id": "senado_es", "name": "Senado de España", "category": "Legislativo", "frequency": "Mensual"},
    {"id": "eurodiputados_es", "name": "Eurodiputados españoles", "category": "Legislativo", "frequency": "Mensual"},
    {"id": "boe", "name": "BOE — Boletín Oficial del Estado", "category": "Gaceta oficial", "frequency": "Diaria"},
    {"id": "boe_pep", "name": "BOE PEP — Altos Cargos", "category": "Integridad", "frequency": "Mensual"},
    {"id": "aeat_deudores", "name": "AEAT — Grandes deudores", "category": "Fiscal", "frequency": "Anual"},
    {"id": "rolece", "name": "ROLECE — Licitadores inhabilitados", "category": "Contratos", "frequency": "Mensual"},
    {"id": "bdns", "name": "BDNS — Subvenciones", "category": "Subvenciones", "frequency": "Diaria"},
    {"id": "miteco", "name": "MITECO — Sanciones medioambientales", "category": "Sanciones", "frequency": "Mensual"},
    {"id": "tribunal_supremo", "name": "Tribunal Supremo (CENDOJ)", "category": "Integridad judicial", "frequency": "Mensual"},
    {"id": "icij", "name": "ICIJ Offshore Leaks", "category": "Identidad offshore", "frequency": "Anual"},
    {"id": "opensanctions", "name": "OpenSanctions", "category": "Sanciones", "frequency": "Diaria"},
    {"id": "eu_sanctions", "name": "Sanciones UE", "category": "Sanciones", "frequency": "Semanal"},
    {"id": "ofac", "name": "OFAC SDN List", "category": "Sanciones", "frequency": "Semanal"},
    {"id": "un_sanctions", "name": "Sanciones ONU", "category": "Sanciones", "frequency": "Semanal"},
    {"id": "world_bank", "name": "World Bank — Inhabilitados", "category": "Sanciones", "frequency": "Mensual"},
]


async def get_meta() -> MetaResponse:
    """Aggregate graph metrics and source status."""
    async with get_session() as session:
        # Node counts by label
        result = await session.run(
            "CALL db.labels() YIELD label "
            "CALL { WITH label CALL db.stats.retrieve('GRAPH COUNTS') YIELD nodeCount RETURN nodeCount } "
            "RETURN label, nodeCount"
        )
        node_counts = {}
        try:
            result2 = await session.run(
                "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS cnt"
            )
            records = await result2.data()
            for r in records:
                if r["label"]:
                    node_counts[r["label"]] = r["cnt"]
        except Exception:
            pass

        # Total counts
        total_nodes = sum(node_counts.values())

        rel_result = await session.run("MATCH ()-[r]->() RETURN count(r) AS cnt")
        rel_data = await rel_result.single()
        total_rels = rel_data["cnt"] if rel_data else 0

        sources = []
        for src in SOURCE_REGISTRY:
            # Check if any node has source metadata
            try:
                src_result = await session.run(
                    "MATCH (n) WHERE n._source = $source_id RETURN count(n) AS cnt",
                    source_id=src["id"],
                )
                src_data = await src_result.single()
                count = src_data["cnt"] if src_data else 0
                status = "ok" if count > 0 else "pending"
            except Exception:
                count = 0
                status = "pending"

            sources.append(SourceStatus(
                id=src["id"],
                name=src["name"],
                category=src["category"],
                frequency=src["frequency"],
                record_count=count,
                status=status,
            ))

    return MetaResponse(
        total_nodes=total_nodes,
        total_relationships=total_rels,
        node_counts=node_counts,
        sources=sources,
    )


async def get_company_subgraph(nif: str, depth: int = 2) -> SubgraphResponse:
    """Return a subgraph centered on a company by NIF."""
    async with get_session() as session:
        # Get the central company
        result = await session.run(
            "MATCH (c:Company {nif: $nif}) RETURN c", nif=nif
        )
        record = await result.single()
        if not record:
            return SubgraphResponse(
                center=CompanyNode(nif=nif, name="No encontrada"),
                nodes=[], edges=[], total_nodes=0, total_edges=0,
            )

        c = record["c"]
        center = CompanyNode(
            nif=c.get("nif", nif),
            name=c.get("name", "Desconocida"),
            status=c.get("status"),
            province=c.get("province"),
            labels=list(c.labels),
            properties=dict(c),
        )

        # Expand neighborhood
        expand_result = await session.run(
            """
            MATCH (center:Company {nif: $nif})
            CALL apoc.path.subgraphAll(center, {maxLevel: $depth})
            YIELD nodes, relationships
            RETURN nodes, relationships
            """,
            nif=nif,
            depth=depth,
        )
        expand_record = await expand_result.single()

        nodes_out = []
        edges_out = []

        if expand_record:
            for node in expand_record["nodes"]:
                nodes_out.append({
                    "id": node.element_id,
                    "labels": list(node.labels),
                    **dict(node),
                })
            for rel in expand_record["relationships"]:
                edges_out.append(Edge(
                    source=rel.start_node.element_id,
                    target=rel.end_node.element_id,
                    type=rel.type,
                    properties=dict(rel),
                ))

        return SubgraphResponse(
            center=center,
            nodes=nodes_out,
            edges=edges_out,
            total_nodes=len(nodes_out),
            total_edges=len(edges_out),
        )


async def get_company_patterns(nif: str) -> PatternResponse:
    """Detect risk patterns for a company."""
    signals: list[RiskSignal] = []

    async with get_session() as session:
        # Company info
        result = await session.run(
            "MATCH (c:Company {nif: $nif}) RETURN c.name AS name", nif=nif
        )
        record = await result.single()
        company_name = record["name"] if record else None

        # 1. Tax debts
        td_result = await session.run(
            """
            MATCH (c:Company {nif: $nif})-[:HAS_DEBT|ADMINISTERED_BY]-(p)-[:HAS_DEBT]-(td:TaxDebt)
            RETURN td.amount AS amount, td.debtor_name AS debtor
            UNION
            MATCH (c:Company {nif: $nif})-[:HAS_DEBT]-(td:TaxDebt)
            RETURN td.amount AS amount, td.debtor_name AS debtor
            """,
            nif=nif,
        )
        td_records = await td_result.data()
        for td in td_records:
            signals.append(RiskSignal(
                signal_type="tax_debt",
                severity="high",
                description=f"Deuda tributaria de {td['debtor']}: {td['amount']:,.2f}€" if td.get("amount") else f"Deuda tributaria: {td.get('debtor', 'N/A')}",
                source="AEAT",
            ))

        # 2. Sanctions
        san_result = await session.run(
            """
            MATCH (c:Company {nif: $nif})-[*1..2]-(s:Sanction)
            RETURN s.sanction_type AS type, s.source AS source, s.reason AS reason
            """,
            nif=nif,
        )
        san_records = await san_result.data()
        for s in san_records:
            signals.append(RiskSignal(
                signal_type="sanction",
                severity="high" if s.get("source") in ("OFAC", "UN", "EU") else "medium",
                description=s.get("reason", f"Sanción ({s.get('type', 'N/A')})"),
                source=s.get("source", "Desconocida"),
            ))

        # 3. Offshore connections (ICIJ)
        off_result = await session.run(
            """
            MATCH (c:Company {nif: $nif})-[*1..3]-(o)
            WHERE o._source = 'icij'
            RETURN o.name AS name, labels(o) AS labels
            """,
            nif=nif,
        )
        off_records = await off_result.data()
        for o in off_records:
            signals.append(RiskSignal(
                signal_type="offshore",
                severity="high",
                description=f"Conexión offshore: {o.get('name', 'entidad desconocida')}",
                source="ICIJ Offshore Leaks",
            ))

        # 4. No-bid contracts
        nb_result = await session.run(
            """
            MATCH (c:Company {nif: $nif})<-[:AWARDED_TO]-(ct:Contract)
            WHERE ct.procedure_type IN ['Negociado sin publicidad', 'Contrato menor', 'Emergencia']
            RETURN ct.title AS title, ct.amount AS amount, ct.procedure_type AS proc
            """,
            nif=nif,
        )
        nb_records = await nb_result.data()
        for nb in nb_records:
            signals.append(RiskSignal(
                signal_type="no_bid_contract",
                severity="medium",
                description=f"Contrato sin concurso ({nb.get('proc')}): {nb.get('title', 'N/A')}",
                source="PLACE",
            ))

        # Connection summary
        conn_result = await session.run(
            """
            MATCH (c:Company {nif: $nif})-[r]-()
            RETURN type(r) AS rel_type, count(r) AS cnt
            """,
            nif=nif,
        )
        conn_records = await conn_result.data()
        connections_summary = {r["rel_type"]: r["cnt"] for r in conn_records}

    # Risk score
    score = min(100, sum(
        30 if s.severity == "high" else 15 if s.severity == "medium" else 5
        for s in signals
    ))

    return PatternResponse(
        nif=nif,
        company_name=company_name,
        risk_signals=signals,
        risk_score=score,
        connections_summary=connections_summary,
    )


async def search_entities(query: str, limit: int = 20) -> list[SearchResult]:
    """Full-text search across persons and companies."""
    results: list[SearchResult] = []

    async with get_session() as session:
        # Search companies
        try:
            comp_result = await session.run(
                """
                CALL db.index.fulltext.queryNodes('company_fulltext', $q)
                YIELD node, score
                RETURN node.nif AS id, 'Company' AS label, node.name AS name, score
                LIMIT $limit
                """,
                q=query, limit=limit,
            )
            for r in await comp_result.data():
                results.append(SearchResult(
                    id=r["id"], label=r["label"], name=r["name"], score=r["score"],
                ))
        except Exception:
            pass

        # Search persons
        try:
            per_result = await session.run(
                """
                CALL db.index.fulltext.queryNodes('person_fulltext', $q)
                YIELD node, score
                RETURN node.id AS id, 'Person' AS label, node.name AS name, score
                LIMIT $limit
                """,
                q=query, limit=limit,
            )
            for r in await per_result.data():
                results.append(SearchResult(
                    id=r["id"], label=r["label"], name=r["name"], score=r["score"],
                ))
        except Exception:
            pass

    results.sort(key=lambda x: x.score, reverse=True)
    return results[:limit]
