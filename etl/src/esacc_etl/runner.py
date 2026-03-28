"""VIGILIA ETL — CLI runner and orchestrator.

Usage:
    esacc-etl run --source congreso --neo4j-password changeme --data-dir /tmp/vigilia-data
    esacc-etl run --source all --neo4j-password changeme
    esacc-etl list
"""

from __future__ import annotations
from pathlib import Path
import click
from rich.console import Console
from rich.table import Table

from esacc_etl.loader import GraphLoader

console = Console()

# Registry of available pipelines
PIPELINES = {
    # ── Legislativo ───────────────────────────────────────────────────────────
    "congreso": "esacc_etl.pipelines.congreso",
    "senado_es": "esacc_etl.pipelines.senado_es",           # ~265 senadores
    "eurodiputados_es": "esacc_etl.pipelines.eurodiputados_es",  # ~61 eurodiputados
    "ccaa_es": "esacc_etl.pipelines.ccaa_es",                    # ~400-600 diputados autonómicos
    # ── Altos cargos / PEPs ───────────────────────────────────────────────────
    "pep_transparencia": "esacc_etl.pipelines.pep_transparencia",  # Altos cargos AGE
    # ── Contratación pública ──────────────────────────────────────────────────
    "contratos_estado": "esacc_etl.pipelines.contratos_estado",
    # ── Sanciones (organismos reguladores) ────────────────────────────────────
    "cnmc": "esacc_etl.pipelines.cnmc",            # Competencia, energía, telecos
    "cnmv": "esacc_etl.pipelines.cnmv",            # Mercado de valores
    "aepd": "esacc_etl.pipelines.aepd",            # Protección de datos (RGPD)
    "miteco": "esacc_etl.pipelines.miteco",        # Sanciones medioambientales BOE
    "rolece": "esacc_etl.pipelines.rolece",        # Inhabilitados contratación pública
    "tribunal_supremo": "esacc_etl.pipelines.tribunal_supremo",  # Sentencias penales
    # ── Deuda e insolvencia ───────────────────────────────────────────────────
    "registro_concursal": "esacc_etl.pipelines.registro_concursal",  # Quiebras
    "tgss_deudores": "esacc_etl.pipelines.tgss_deudores",           # Deudas SS
    "aeat_deudores": "esacc_etl.pipelines.aeat_deudores",           # Deudas AEAT ≥600k€
}


def _import_pipeline(source: str):
    """Dynamically import a pipeline module."""
    import importlib
    module_path = PIPELINES.get(source)
    if not module_path:
        raise click.BadParameter(
            f"Pipeline '{source}' no encontrado. Disponibles: {', '.join(PIPELINES.keys())}"
        )
    return importlib.import_module(module_path)


@click.group()
def cli():
    """esacc-etl — VIGILIA ETL pipelines."""
    pass


@cli.command()
@click.option("--source", required=True, help="Pipeline ID or 'all'")
@click.option("--neo4j-uri", default="bolt://localhost:7687", help="Neo4j Bolt URI")
@click.option("--neo4j-user", default="neo4j", help="Neo4j user")
@click.option("--neo4j-password", required=True, help="Neo4j password")
@click.option("--data-dir", default="/tmp/vigilia-data", type=click.Path(), help="Data directory")
def run(source: str, neo4j_uri: str, neo4j_user: str, neo4j_password: str, data_dir: str):
    """Execute one or all ETL pipelines."""
    data_path = Path(data_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    console.rule("[bold cyan]VIGILIA ETL")
    console.log(f"Neo4j: {neo4j_uri}")
    console.log(f"Data dir: {data_path}")

    with GraphLoader(neo4j_uri, neo4j_user, neo4j_password) as loader:
        if source == "all":
            sources = list(PIPELINES.keys())
        else:
            sources = [source]

        for src in sources:
            try:
                pipeline = _import_pipeline(src)
                pipeline.run(data_path / src, loader)
            except Exception as e:
                console.log(f"[bold red]✗[/] Error en pipeline '{src}': {e}")
                import traceback
                traceback.print_exc()

    console.rule("[bold green]ETL completado")


@cli.command("dedup")
@click.option("--neo4j-uri", default="bolt://localhost:7687", help="Neo4j Bolt URI")
@click.option("--neo4j-user", default="neo4j", help="Neo4j user")
@click.option("--neo4j-password", required=True, help="Neo4j password")
@click.option("--dry-run", is_flag=True, default=False, help="Solo mostrar duplicados, no fusionar")
def dedup_persons(neo4j_uri: str, neo4j_user: str, neo4j_password: str, dry_run: bool):
    """Fusiona nodos Person duplicados con el mismo nombre canónico."""
    from neo4j import GraphDatabase

    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
    console.rule("[bold cyan]VIGILIA — Deduplicación de personas")

    with driver.session() as session:
        # Buscar grupos de nodos Person con el mismo nombre canónico (sin acentos, lowercase)
        result = session.run(
            """
            MATCH (p:Person)
            WITH apoc.text.clean(toLower(p.name)) AS canon, collect(p) AS group
            WHERE size(group) > 1
            RETURN canon, [n IN group | {id: n.id, name: n.name, src: n._source}] AS nodes,
                   size(group) AS count
            ORDER BY count DESC
            """
        )
        groups = result.data()

    if not groups:
        console.log("[green]✓ No se encontraron duplicados[/]")
        driver.close()
        return

    console.log(f"[yellow]Encontrados {len(groups)} grupos de duplicados:[/]")
    for g in groups:
        names = [n["name"] for n in g["nodes"]]
        console.log(f"  [{g['count']}] {g['canon']!r} → {names}")

    if dry_run:
        console.log("[dim]--dry-run: no se realizan cambios[/]")
        driver.close()
        return

    merged = 0
    with driver.session() as session:
        for g in groups:
            node_ids = [n["id"] for n in g["nodes"]]

            # El nodo primario es el que tiene más relaciones
            rel_counts = session.run(
                """
                UNWIND $ids AS pid
                MATCH (p:Person {id: pid})
                OPTIONAL MATCH (p)-[r]-()
                RETURN p.id AS id, count(r) AS rels
                ORDER BY rels DESC
                """,
                {"ids": node_ids},
            ).data()

            if not rel_counts:
                continue

            primary_id = rel_counts[0]["id"]
            dup_ids = [r["id"] for r in rel_counts[1:]]

            # Fusionar con apoc.refactor.mergeNodes
            for dup_id in dup_ids:
                try:
                    session.run(
                        """
                        MATCH (primary:Person {id: $primary_id})
                        MATCH (dup:Person {id: $dup_id})
                        WITH [primary, dup] AS nodes
                        CALL apoc.refactor.mergeNodes(nodes, {
                            properties: 'combine',
                            mergeRels: true
                        }) YIELD node
                        RETURN node.id
                        """,
                        {"primary_id": primary_id, "dup_id": dup_id},
                    )
                    merged += 1
                    console.log(f"  [green]✓[/] Fusionado {dup_id!r} → {primary_id!r}")
                except Exception as e:
                    console.log(f"  [red]✗[/] Error fusionando {dup_id!r}: {e}")

    console.log(f"[bold green]✓ Deduplicación completada: {merged} nodos fusionados[/]")
    driver.close()


@cli.command("list")
def list_pipelines():
    """List available pipelines."""
    table = Table(title="Pipelines disponibles")
    table.add_column("ID", style="cyan")
    table.add_column("Módulo", style="dim")
    table.add_column("Estado", style="green")

    for pid, module in PIPELINES.items():
        status = "✓ Activo" if not module.startswith("#") else "○ Pendiente"
        table.add_row(pid, module, status)

    console.print(table)


if __name__ == "__main__":
    cli()
