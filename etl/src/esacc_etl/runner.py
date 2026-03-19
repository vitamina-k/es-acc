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
    "congreso": "esacc_etl.pipelines.congreso",
    "contratos_estado": "esacc_etl.pipelines.contratos_estado",
    # Future pipelines (stubs):
    # "borme": "esacc_etl.pipelines.borme",
    # "senado_es": "esacc_etl.pipelines.senado_es",
    # "eurodiputados_es": "esacc_etl.pipelines.eurodiputados_es",
    # "boe": "esacc_etl.pipelines.boe",
    # "boe_pep": "esacc_etl.pipelines.boe_pep",
    # "aeat_deudores": "esacc_etl.pipelines.aeat_deudores",
    # "rolece": "esacc_etl.pipelines.rolece",
    # "bdns": "esacc_etl.pipelines.bdns",
    # "miteco": "esacc_etl.pipelines.miteco",
    # "tribunal_supremo": "esacc_etl.pipelines.tribunal_supremo",
    # "icij": "esacc_etl.pipelines.icij",
    # "opensanctions": "esacc_etl.pipelines.opensanctions",
    # "eu_sanctions": "esacc_etl.pipelines.eu_sanctions",
    # "ofac": "esacc_etl.pipelines.ofac",
    # "un_sanctions": "esacc_etl.pipelines.un_sanctions",
    # "world_bank": "esacc_etl.pipelines.world_bank",
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
