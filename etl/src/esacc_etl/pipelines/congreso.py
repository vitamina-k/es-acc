"""Pipeline: Congreso de los Diputados.

Source: https://www.congreso.es/opendata
Fetches current deputies, their parties, and creates Person + PublicOffice + PoliticalGroup nodes.
"""

from __future__ import annotations
import httpx
from rich.console import Console
from pathlib import Path
from lxml import etree

from esacc_etl.loader import GraphLoader
from esacc_etl.transforms.normalize import normalize_name, make_person_id, make_office_id

console = Console()
SOURCE_ID = "congreso"

# The Congreso provides XML data for current legislature
CONGRESO_OPENDATA_URL = "https://www.congreso.es/webpublica/opendata/diputados/diputadosXIVL.xml"
# Fallback: JSON API
CONGRESO_API_URL = "https://www.congreso.es/es/opendata/diputados"


def download(data_dir: Path) -> Path:
    """Download deputy data from Congreso open data portal."""
    out_path = data_dir / "congreso_diputados.xml"
    console.log(f"[bold blue]Descargando[/] datos del Congreso → {out_path}")

    # Try XML endpoint first
    try:
        resp = httpx.get(CONGRESO_OPENDATA_URL, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        out_path.write_bytes(resp.content)
        console.log(f"[green]✓[/] Descargados {len(resp.content):,} bytes (XML)")
        return out_path
    except Exception as e:
        console.log(f"[yellow]⚠[/] XML endpoint falló: {e}. Intentando scraping HTML...")

    # Fallback: scrape the Congreso website for deputy info
    try:
        resp = httpx.get(
            "https://www.congreso.es/busqueda-de-diputados",
            timeout=30,
            follow_redirects=True,
            headers={"User-Agent": "VIGILIA/0.1 (transparency research)"},
        )
        resp.raise_for_status()
        fallback_path = data_dir / "congreso_diputados.html"
        fallback_path.write_bytes(resp.content)
        console.log(f"[green]✓[/] Descargados {len(resp.content):,} bytes (HTML fallback)")
        return fallback_path
    except Exception as e2:
        console.log(f"[red]✗[/] No se pudo descargar: {e2}")
        raise


def parse(file_path: Path) -> tuple[list[dict], list[dict], list[dict]]:
    """Parse downloaded data into persons, offices, and groups.

    Returns:
        (persons, offices, groups) — lists of dicts ready for loader.
    """
    persons = []
    offices = []
    groups = {}

    suffix = file_path.suffix.lower()

    if suffix == ".xml":
        tree = etree.parse(str(file_path))
        root = tree.getroot()
        # Namespace handling
        ns = {}
        if root.tag.startswith("{"):
            ns_uri = root.tag.split("}")[0].strip("{")
            ns = {"d": ns_uri}

        deputies = root.findall(".//diputado", ns) or root.findall(".//Diputado", ns) or root.iter()

        for dep in deputies:
            tag = dep.tag.split("}")[-1] if "}" in dep.tag else dep.tag
            if tag.lower() != "diputado":
                continue

            name_el = dep.find("nombre", ns) or dep.find("Nombre", ns)
            surname1_el = dep.find("apellido1", ns) or dep.find("Apellido1", ns) or dep.find("apellidos", ns)
            surname2_el = dep.find("apellido2", ns) or dep.find("Apellido2", ns)
            group_el = dep.find("grupo", ns) or dep.find("GrupoParlamentario", ns)
            circunscripcion_el = dep.find("circunscripcion", ns) or dep.find("Circunscripcion", ns)

            name = (name_el.text or "") if name_el is not None else ""
            surname1 = (surname1_el.text or "") if surname1_el is not None else ""
            surname2 = (surname2_el.text or "") if surname2_el is not None else ""
            full_name = normalize_name(f"{name} {surname1} {surname2}".strip())

            if not full_name:
                continue

            group_name = (group_el.text or "Desconocido") if group_el is not None else "Desconocido"
            circunscripcion = (circunscripcion_el.text or "") if circunscripcion_el is not None else ""

            person_id = make_person_id(full_name, SOURCE_ID)
            office_id = make_office_id(full_name, "Diputado/a", "Congreso de los Diputados")

            persons.append({
                "id": person_id,
                "name": full_name,
                "aliases": None,
                "_source": SOURCE_ID,
            })

            offices.append({
                "id": office_id,
                "role": "Diputado/a",
                "institution": "Congreso de los Diputados",
                "start_date": None,
                "end_date": None,
                "person_id": person_id,
                "group_name": group_name,
                "circunscripcion": circunscripcion,
                "_source": SOURCE_ID,
            })

            if group_name not in groups:
                from esacc_etl.transforms.normalize import slugify
                groups[group_name] = {
                    "id": f"gp:{slugify(group_name)}",
                    "name": group_name,
                    "abbreviation": None,
                    "_source": SOURCE_ID,
                }

    elif suffix == ".html":
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(file_path.read_text(encoding="utf-8"), "lxml")

        # Parse deputy cards from the HTML
        cards = soup.select(".dip-tarjeta, .listado-diputados li, .resultado-busqueda-item")
        for card in cards:
            name_el = card.select_one(".nombre-diputado, .dip-nombre, a")
            group_el = card.select_one(".grupo-parlamentario, .dip-grupo")

            if not name_el:
                continue

            full_name = normalize_name(name_el.get_text(strip=True))
            if not full_name or len(full_name) < 3:
                continue

            group_name = group_el.get_text(strip=True) if group_el else "Desconocido"

            person_id = make_person_id(full_name, SOURCE_ID)
            office_id = make_office_id(full_name, "Diputado/a", "Congreso de los Diputados")

            persons.append({
                "id": person_id,
                "name": full_name,
                "aliases": None,
                "_source": SOURCE_ID,
            })

            offices.append({
                "id": office_id,
                "role": "Diputado/a",
                "institution": "Congreso de los Diputados",
                "start_date": None,
                "end_date": None,
                "person_id": person_id,
                "group_name": group_name,
                "_source": SOURCE_ID,
            })

            if group_name not in groups:
                from esacc_etl.transforms.normalize import slugify
                groups[group_name] = {
                    "id": f"gp:{slugify(group_name)}",
                    "name": group_name,
                    "abbreviation": None,
                    "_source": SOURCE_ID,
                }

    console.log(f"[green]✓[/] Parseados: {len(persons)} diputados, {len(groups)} grupos")
    return persons, offices, list(groups.values())


def load(loader: GraphLoader, persons: list[dict], offices: list[dict], groups: list[dict]):
    """Load parsed data into Neo4j."""
    console.log("[bold blue]Cargando[/] datos en Neo4j...")

    loader.load_persons(persons)
    loader.load_public_offices(offices)
    loader.load_political_groups(groups)

    # Link persons to offices
    person_office_links = [
        {"person_id": o["person_id"], "office_id": o["id"]}
        for o in offices if o.get("person_id")
    ]
    loader.link_person_to_office(person_office_links)

    # Link offices to groups
    group_id_map = {g["name"]: g["id"] for g in groups}
    office_group_links = [
        {"office_id": o["id"], "group_id": group_id_map[o["group_name"]]}
        for o in offices if o.get("group_name") in group_id_map
    ]
    loader.link_office_to_group(office_group_links)

    console.log(f"[green]✓[/] Cargados {len(persons)} personas, {len(offices)} cargos, {len(groups)} grupos")


def run(data_dir: Path, loader: GraphLoader):
    """Execute the full Congreso pipeline: download → parse → load."""
    console.rule(f"[bold]Pipeline: {SOURCE_ID}")
    data_dir.mkdir(parents=True, exist_ok=True)
    file_path = download(data_dir)
    persons, offices, groups = parse(file_path)
    load(loader, persons, offices, groups)
    console.log(f"[bold green]✓ Pipeline {SOURCE_ID} completado[/]")
