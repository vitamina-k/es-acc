"""Pipeline: Senado de España — Wikidata SPARQL + fallback muestra.

Carga: ~90-100 senadores (Person), grupos parlamentarios (PoliticalGroup),
       cargos PublicOffice y relaciones PERTENECE_A / OCUPA_CARGO.

Cobertura: Wikidata no tiene todos los senadores (266 total); cubre ~35-40%,
           principalmente los que tienen Wikipedia o perfil público notable.
           Mejora futura: scraping del portal del Senado cuando su API esté disponible.
"""
from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx
from rich.console import Console

from esacc_etl.loader import GraphLoader
from esacc_etl.transforms.normalize import make_office_id, make_person_id, normalize_name, slugify

console = Console()
SOURCE_ID = "senado_es"
LEGISLATURA = 15
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

# Query combinada: senadores sin fecha de fin con inicio ≥2019,
# o con término parlamentario XV legislatura, o inicio ≥2023-07-23
WIKIDATA_QUERY = """
SELECT DISTINCT ?person ?personLabel ?partidoLabel ?birth_date WHERE {
  ?person p:P39 ?stmt.
  ?stmt ps:P39 wd:Q19323171.
  {
    ?stmt pq:P580 ?start.
    FILTER(?start >= "2019-05-01"^^xsd:dateTime)
    FILTER NOT EXISTS { ?stmt pq:P582 ?end. }
  } UNION {
    ?stmt pq:P2937 wd:Q118800859.
  } UNION {
    ?stmt pq:P580 ?start2.
    FILTER(?start2 >= "2023-07-23"^^xsd:dateTime)
  }
  OPTIONAL { ?person wdt:P102 ?partido. }
  OPTIONAL { ?person wdt:P569 ?birth_date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 400
"""

_SAMPLE = [
    {"nombre_completo": "PEDRO ROLLÁN OJEDA", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Madrid"},
    {"nombre_completo": "MIQUEL ICETA LLORENS", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Barcelona"},
    {"nombre_completo": "CRISTINA NARBONA RUIZ", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Madrid"},
    {"nombre_completo": "RAFAEL HERNANDO FRAILE", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Granada"},
    {"nombre_completo": "ROSA ESTARÁS FERRAGUT", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Islas Baleares"},
]


def download(data_dir: Path) -> Path:
    out = data_dir / "senado_wikidata.json"
    console.log("[bold blue]SENADO[/] Descargando senadores de Wikidata...")
    headers = {
        "User-Agent": "VIGILIA/1.0 (datos-publicos-espana; https://github.com/vitamina-k/es-acc) httpx/0.28",
        "Accept": "application/sparql-results+json",
    }
    try:
        r = httpx.get(
            WIKIDATA_SPARQL,
            params={"query": WIKIDATA_QUERY, "format": "json"},
            headers=headers,
            timeout=90,
            follow_redirects=True,
        )
        if r.status_code == 200:
            bindings = r.json().get("results", {}).get("bindings", [])
            seen_names: set[str] = set()
            senadores = []
            for b in bindings:
                nombre = b.get("personLabel", {}).get("value", "").strip()
                if not nombre or nombre.startswith("Q"):
                    continue
                nombre_norm = normalize_name(nombre)
                if nombre_norm in seen_names:
                    continue
                seen_names.add(nombre_norm)
                partido = b.get("partidoLabel", {}).get("value", "").strip()
                birth = b.get("birth_date", {}).get("value", "")
                senadores.append({
                    "nombre_completo": nombre.upper(),
                    "partido": partido,
                    "grupo_parlamentario": _partido_to_grupo(partido),
                    "comunidad_autonoma": "",
                    "fecha_nacimiento": birth[:10] if birth else None,
                    "legislatura": LEGISLATURA,
                    "wikidata_id": b.get("person", {}).get("value", "").split("/")[-1],
                })
            if senadores:
                out.write_text(json.dumps({"senadores": senadores}, ensure_ascii=False, indent=2), encoding="utf-8")
                console.log(f"[green]✓[/] {len(senadores)} senadores descargados de Wikidata")
                return out
            console.log("[yellow]⚠[/] Wikidata devolvió 0 resultados")
        else:
            console.log(f"[yellow]⚠[/] Wikidata HTTP {r.status_code}")
    except Exception as e:
        console.log(f"[yellow]⚠[/] Wikidata error: {e}")

    console.log("[yellow]⚠[/] Usando muestra de desarrollo (5 senadores)")
    out.write_text(json.dumps({"senadores": _SAMPLE}, ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def _partido_to_grupo(partido: str) -> str:
    """Mapea nombre de partido al nombre del grupo parlamentario en el Senado."""
    partido_lower = partido.lower()
    if any(x in partido_lower for x in ["partido popular", " pp"]):
        return "Grupo Parlamentario Popular en el Senado"
    if any(x in partido_lower for x in ["socialista", "psoe", "psc"]):
        return "Grupo Parlamentario Socialista en el Senado"
    if any(x in partido_lower for x in ["vox"]):
        return "Grupo Parlamentario VOX en el Senado"
    if any(x in partido_lower for x in ["sumar", "unidas podemos", "izquierda unida", "más país"]):
        return "Grupo Parlamentario Izquierda Confederal"
    if any(x in partido_lower for x in ["esquerra", "erc"]):
        return "Grupo Parlamentario Izquierda Confederal"
    if any(x in partido_lower for x in ["junts", "convergència", "pdecat"]):
        return "Grupo Parlamentario Junts"
    if any(x in partido_lower for x in ["pnv", "eaj", "nacionalista vasco"]):
        return "Grupo Parlamentario Vasco (EAJ-PNV)"
    if any(x in partido_lower for x in ["bildu", "ehbildu", "amaiur"]):
        return "Grupo Parlamentario Izquierda Confederal"
    if any(x in partido_lower for x in ["canaria", "cc-pnc"]):
        return "Grupo Parlamentario Mixto"
    return "Grupo Parlamentario Mixto"


def parse(file_path: Path):
    data = json.loads(file_path.read_text(encoding="utf-8"))
    persons, offices_data, groups_dict = [], [], {}

    for s in data.get("senadores", []):
        nombre_raw = s.get("nombre_completo", "")
        nombre = normalize_name(nombre_raw)
        if not nombre:
            continue

        partido = s.get("partido", "").strip()
        grupo = s.get("grupo_parlamentario", "").strip() or _partido_to_grupo(partido)
        pid = make_person_id(nombre, SOURCE_ID)
        office_id = make_office_id(nombre, "Senador/a", "Senado de España")

        persons.append({
            "id": pid,
            "name": nombre,
            "partido": partido,
            "comunidad_autonoma": s.get("comunidad_autonoma", ""),
            "camara": "Senado",
            "pep": True,
            "fecha_nacimiento": s.get("fecha_nacimiento"),
            "wikidata_id": s.get("wikidata_id", ""),
            "_source": SOURCE_ID,
        })

        offices_data.append({
            "office": {
                "id": office_id,
                "role": "Senador/a",
                "institution": "Senado de España",
                "start_date": None,
                "end_date": None,
                "active": True,
                "person_id": pid,
                "group_name": grupo,
                "_source": SOURCE_ID,
            },
            "person_id": pid,
        })

        if grupo and grupo not in groups_dict:
            groups_dict[grupo] = {
                "id": f"gp:{slugify(grupo)}",
                "name": grupo,
                "partido_principal": partido,
                "camara": "Senado",
                "_source": SOURCE_ID,
            }

    groups = list(groups_dict.values())
    console.log(f"[green]✓[/] SENADO: {len(persons)} senadores, {len(groups)} grupos")
    return persons, offices_data, groups


def load(loader: GraphLoader, persons: list[dict], offices_data: list[dict], groups: list[dict]):
    loader.load_persons(persons)
    if groups:
        loader.load_political_groups(groups)

    offices = [od["office"] for od in offices_data]
    if offices:
        loader.load_public_offices(offices)

    person_office_links = [{"person_id": od["person_id"], "office_id": od["office"]["id"]} for od in offices_data]
    if person_office_links:
        loader.link_person_to_office(person_office_links)

    group_id_map = {g["name"]: g["id"] for g in groups}
    office_group_links = [
        {"office_id": od["office"]["id"], "group_id": group_id_map[od["office"]["group_name"]]}
        for od in offices_data
        if od["office"].get("group_name") in group_id_map
    ]
    if office_group_links:
        loader.link_office_to_group(office_group_links)

    console.log(f"[green]✓[/] Cargados {len(persons)} senadores, {len(offices)} cargos, {len(groups)} grupos")


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: senado_es")
    data_dir.mkdir(parents=True, exist_ok=True)
    persons, offices_data, groups = parse(download(data_dir))
    load(loader, persons, offices_data, groups)
    console.log("[bold green]✓ Pipeline senado_es completado[/]")
