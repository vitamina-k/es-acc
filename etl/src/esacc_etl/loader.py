"""VIGILIA ETL — Neo4j graph loader.

Provides a unified interface for loading normalized entities into Neo4j.
All pipelines use this module to MERGE nodes and relationships.
"""

from __future__ import annotations
from typing import Any
from neo4j import GraphDatabase


class GraphLoader:
    """Loads normalized data into Neo4j using MERGE (idempotent)."""

    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def _run(self, query: str, params: dict[str, Any] | None = None):
        with self.driver.session() as session:
            session.run(query, params or {})

    def _run_batch(self, query: str, items: list[dict], batch_size: int = 500):
        """Execute a parameterized query in batches using UNWIND."""
        with self.driver.session() as session:
            for i in range(0, len(items), batch_size):
                batch = items[i : i + batch_size]
                session.run(query, {"batch": batch})

    # --- Node loaders ---

    def load_persons(self, persons: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS p
            MERGE (n:Person {id: p.id})
            SET n.name = p.name,
                n.aliases = p.aliases,
                n._source = p._source,
                n._updated = datetime()
            """,
            persons,
        )

    def load_companies(self, companies: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS c
            MERGE (n:Company {nif: c.nif})
            SET n.name = c.name,
                n.status = c.status,
                n.province = c.province,
                n._source = c._source,
                n._updated = datetime()
            """,
            companies,
        )

    def load_contracts(self, contracts: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS ct
            MERGE (n:Contract {id: ct.id})
            SET n.title = ct.title,
                n.amount = ct.amount,
                n.award_date = date(ct.award_date),
                n.procedure_type = ct.procedure_type,
                n.cpv_code = ct.cpv_code,
                n._source = ct._source,
                n._updated = datetime()
            """,
            contracts,
        )

    def load_grants(self, grants: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS g
            MERGE (n:Grant {id: g.id})
            SET n.title = g.title,
                n.amount = g.amount,
                n.grant_date = date(g.grant_date),
                n._source = g._source,
                n._updated = datetime()
            """,
            grants,
        )

    def load_sanctions(self, sanctions: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS s
            MERGE (n:Sanction {id: s.id})
            SET n.sanction_type = s.sanction_type,
                n.source = s.source,
                n.entity_name = s.entity_name,
                n.reason = s.reason,
                n._source = s._source,
                n._updated = datetime()
            """,
            sanctions,
        )

    def load_public_offices(self, offices: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS o
            MERGE (n:PublicOffice {id: o.id})
            SET n.role = o.role,
                n.institution = o.institution,
                n.start_date = o.start_date,
                n.end_date = o.end_date,
                n._source = o._source,
                n._updated = datetime()
            """,
            offices,
        )

    def load_political_groups(self, groups: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS g
            MERGE (n:PoliticalGroup {id: g.id})
            SET n.name = g.name,
                n.abbreviation = g.abbreviation,
                n._source = g._source,
                n._updated = datetime()
            """,
            groups,
        )

    def load_public_organs(self, organs: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS o
            MERGE (n:PublicOrgan {id: o.id})
            SET n.name = o.name,
                n.level = o.level,
                n._source = o._source,
                n._updated = datetime()
            """,
            organs,
        )

    def load_tax_debts(self, debts: list[dict]):
        self._run_batch(
            """
            UNWIND $batch AS d
            MERGE (n:TaxDebt {id: d.id})
            SET n.debtor_name = d.debtor_name,
                n.nif = d.nif,
                n.amount = d.amount,
                n.year = d.year,
                n._source = d._source,
                n._updated = datetime()
            """,
            debts,
        )

    # --- Relationship loaders ---

    def link_person_to_company(self, relationships: list[dict]):
        """Links: Person -[ADMINISTERS|OWNS|WORKS_AT]-> Company."""
        self._run_batch(
            """
            UNWIND $batch AS r
            MATCH (p:Person {id: r.person_id})
            MATCH (c:Company {nif: r.company_nif})
            CALL apoc.merge.relationship(p, r.rel_type, {role: r.role, since: r.since}, {}, c, {})
            YIELD rel
            RETURN count(rel)
            """,
            relationships,
        )

    def link_contract_to_company(self, relationships: list[dict]):
        """Links: Contract -[AWARDED_TO]-> Company."""
        self._run_batch(
            """
            UNWIND $batch AS r
            MATCH (ct:Contract {id: r.contract_id})
            MATCH (c:Company {nif: r.company_nif})
            MERGE (ct)-[:AWARDED_TO]->(c)
            """,
            relationships,
        )

    def link_contract_to_organ(self, relationships: list[dict]):
        """Links: PublicOrgan -[CONTRACTS]-> Contract."""
        self._run_batch(
            """
            UNWIND $batch AS r
            MATCH (o:PublicOrgan {id: r.organ_id})
            MATCH (ct:Contract {id: r.contract_id})
            MERGE (o)-[:CONTRACTS]->(ct)
            """,
            relationships,
        )

    def link_person_to_office(self, relationships: list[dict]):
        """Links: Person -[HOLDS_OFFICE]-> PublicOffice."""
        self._run_batch(
            """
            UNWIND $batch AS r
            MATCH (p:Person {id: r.person_id})
            MATCH (o:PublicOffice {id: r.office_id})
            MERGE (p)-[:HOLDS_OFFICE]->(o)
            """,
            relationships,
        )

    def link_office_to_group(self, relationships: list[dict]):
        """Links: PublicOffice -[BELONGS_TO]-> PoliticalGroup."""
        self._run_batch(
            """
            UNWIND $batch AS r
            MATCH (o:PublicOffice {id: r.office_id})
            MATCH (g:PoliticalGroup {id: r.group_id})
            MERGE (o)-[:BELONGS_TO]->(g)
            """,
            relationships,
        )

    def link_entity_to_sanction(self, relationships: list[dict]):
        """Links: Person|Company -[SANCTIONED]-> Sanction."""
        self._run_batch(
            """
            UNWIND $batch AS r
            CALL {
                WITH r
                OPTIONAL MATCH (p:Person {id: r.entity_id})
                OPTIONAL MATCH (c:Company {nif: r.entity_id})
                WITH coalesce(p, c) AS entity, r
                WHERE entity IS NOT NULL
                MATCH (s:Sanction {id: r.sanction_id})
                MERGE (entity)-[:SANCTIONED]->(s)
            }
            """,
            relationships,
        )

    def link_company_to_debt(self, relationships: list[dict]):
        """Links: Company -[HAS_DEBT]-> TaxDebt."""
        self._run_batch(
            """
            UNWIND $batch AS r
            MATCH (c:Company {nif: r.company_nif})
            MATCH (td:TaxDebt {id: r.debt_id})
            MERGE (c)-[:HAS_DEBT]->(td)
            """,
            relationships,
        )
