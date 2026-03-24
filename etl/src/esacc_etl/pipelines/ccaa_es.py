"""Pipeline: Diputados de Parlamentos Autonómicos — Wikidata SPARQL.

Carga: diputados de los 17 parlamentos autonómicos (Person), grupos
       parlamentarios (PoliticalGroup), cargos (PublicOffice).

Cobertura: Wikidata ~30-50% de los ~1.200 diputados autonómicos totales.
           Cubre mejor a los diputados con perfil Wikipedia notable.
           Elecciones mayoritarias: mayo 2023. Cataluña/Galicia/Euskadi: 2024.

Estrategia Wikidata:
  - P39 con P580 (inicio) >= 2023-05-01 y sin P582 (fin) → actuales post-2023
  - + P27 wd:Q29 (nacionalidad española) para filtrar
  - + excluir cargos del Congreso/Senado/UE ya cargados en otros pipelines
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import httpx
from rich.console import Console

from esacc_etl.loader import GraphLoader
from esacc_etl.transforms.normalize import make_office_id, make_person_id, normalize_name, slugify

console = Console()
SOURCE_ID = "ccaa_es"
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

# Excluir cargos ya cargados en otros pipelines
_EXCLUIR_CARGOS = {
    "Q19323171",   # senador de España
    "Q18010840",   # miembro del Congreso de los Diputados (si existe)
    "Q27169",      # miembro del Parlamento Europeo
}

# Q-ids de parlamentos autonómicos y sus instituciones
# Formato: (Q-id_posicion_diputado, nombre_institución, nombre_comunidad)
# Usamos P39 + P580 >= fecha en lugar de Q-ids de posición (más robusto)
_CCAA_INSTITUCIONES = {
    "Asamblea de Madrid": "Madrid",
    "Parlament de Catalunya": "Cataluña",
    "Parlamento de Andalucía": "Andalucía",
    "Corts Valencianes": "Comunitat Valenciana",
    "Parlamento Vasco": "País Vasco",
    "Parlamento de Galicia": "Galicia",
    "Cortes de Castilla y León": "Castilla y León",
    "Cortes de Castilla-La Mancha": "Castilla-La Mancha",
    "Cortes de Aragón": "Aragón",
    "Parlamento de Navarra": "Navarra",
    "Parlamento de Canarias": "Canarias",
    "Parlament de les Illes Balears": "Illes Balears",
    "Asamblea Regional de Murcia": "Murcia",
    "Asamblea de Extremadura": "Extremadura",
    "Junta General del Principado de Asturias": "Asturias",
    "Parlamento de Cantabria": "Cantabria",
    "Parlamento de La Rioja": "La Rioja",
}

# Query 1: diputados autonómicos con inicio >= 2023-05-01 y sin fecha de fin
WIKIDATA_QUERY_ACTIVOS = """
SELECT DISTINCT ?person ?personLabel ?cargoLabel ?partidoLabel ?birth_date WHERE {
  ?person p:P39 ?stmt.
  ?stmt ps:P39 ?cargo.
  ?stmt pq:P580 ?start.
  FILTER(?start >= "2023-05-01"^^xsd:dateTime)
  FILTER NOT EXISTS { ?stmt pq:P582 ?end. }
  ?person wdt:P27 wd:Q29.
  FILTER NOT EXISTS { ?stmt ps:P39 wd:Q19323171. }
  FILTER NOT EXISTS { ?stmt ps:P39 wd:Q27169. }
  OPTIONAL { ?person wdt:P102 ?partido. }
  OPTIONAL { ?person wdt:P569 ?birth_date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,ca,eu,gl,en". }
}
LIMIT 2000
"""

# Query 2: Cataluña feb 2024, Galicia feb 2024, Euskadi abr 2024
WIKIDATA_QUERY_RECIENTES = """
SELECT DISTINCT ?person ?personLabel ?cargoLabel ?partidoLabel ?birth_date WHERE {
  ?person p:P39 ?stmt.
  ?stmt ps:P39 ?cargo.
  ?stmt pq:P580 ?start.
  FILTER(?start >= "2024-01-01"^^xsd:dateTime)
  ?person wdt:P27 wd:Q29.
  FILTER NOT EXISTS { ?stmt ps:P39 wd:Q19323171. }
  FILTER NOT EXISTS { ?stmt ps:P39 wd:Q27169. }
  OPTIONAL { ?person wdt:P102 ?partido. }
  OPTIONAL { ?person wdt:P569 ?birth_date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,ca,eu,gl,en". }
}
LIMIT 1000
"""

_SAMPLE = [
    {"nombre_completo": "ISABEL DÍAZ AYUSO", "cargo": "Presidenta de la Comunidad de Madrid", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular", "comunidad": "Madrid", "institucion": "Asamblea de Madrid"},
    {"nombre_completo": "SALVADOR ILL ROCA", "cargo": "Diputado", "partido": "PSC", "grupo_parlamentario": "Grupo Parlamentario Socialistes i Units per Avançar", "comunidad": "Cataluña", "institucion": "Parlament de Catalunya"},
    {"nombre_completo": "JUANMA MORENO BONILLA", "cargo": "Presidente de la Junta de Andalucía", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular", "comunidad": "Andalucía", "institucion": "Parlamento de Andalucía"},
]


def _wikidata_query(query: str, label: str) -> list[dict]:
    headers = {
        "User-Agent": "VIGILIA/1.0 (datos-publicos-espana; https://github.com/vitamina-k/es-acc) httpx/0.28",
        "Accept": "application/sparql-results+json",
    }
    try:
        r = httpx.get(
            WIKIDATA_SPARQL,
            params={"query": query, "format": "json"},
            headers=headers,
            timeout=90,
            follow_redirects=True,
        )
        if r.status_code == 200:
            return r.json().get("results", {}).get("bindings", [])
        console.log(f"[yellow]⚠[/] Wikidata {label} HTTP {r.status_code}")
    except Exception as e:
        console.log(f"[yellow]⚠[/] Wikidata {label} error: {e}")
    return []


def _is_ccaa_cargo(cargo_label: str) -> bool:
    """Filtra cargos que son de parlamentos autonómicos (no nacionales/europeos)."""
    cl = cargo_label.lower()
    # Excluir nacionales/europeos
    if any(x in cl for x in ["congreso de los diputados", "senado", "parlamento europeo",
                               "senador", "eurodiputado", "eurodiputada"]):
        return False
    # Incluir si menciona diputado/parlamentario + indicador autonómico
    if any(x in cl for x in ["asamblea", "parlament", "parlamento", "cortes", "junta general",
                               "diputado", "diputada", "parlamentario", "parlamentaria"]):
        return True
    return False


def _cargo_to_institucion(cargo_label: str) -> tuple[str, str]:
    """Extrae institución y comunidad del label del cargo."""
    cl = cargo_label.lower()
    for inst, ccaa in _CCAA_INSTITUCIONES.items():
        if inst.lower() in cl or ccaa.lower() in cl:
            return inst, ccaa
    # Fallback por palabras clave
    if "madrid" in cl:
        return "Asamblea de Madrid", "Madrid"
    if "cataluny" in cl or "catalunya" in cl or "catalu" in cl:
        return "Parlament de Catalunya", "Cataluña"
    if "andaluc" in cl:
        return "Parlamento de Andalucía", "Andalucía"
    if "valenci" in cl or "corts" in cl:
        return "Corts Valencianes", "Comunitat Valenciana"
    if "vasco" in cl or "euska" in cl or "euskadi" in cl:
        return "Parlamento Vasco", "País Vasco"
    if "galici" in cl:
        return "Parlamento de Galicia", "Galicia"
    if "castilla y león" in cl or "castilla y leon" in cl:
        return "Cortes de Castilla y León", "Castilla y León"
    if "castilla-la mancha" in cl or "castilla la mancha" in cl:
        return "Cortes de Castilla-La Mancha", "Castilla-La Mancha"
    if "aragón" in cl or "aragon" in cl:
        return "Cortes de Aragón", "Aragón"
    if "navarra" in cl or "nafarroa" in cl:
        return "Parlamento de Navarra", "Navarra"
    if "canarias" in cl:
        return "Parlamento de Canarias", "Canarias"
    if "balear" in cl or "illes" in cl:
        return "Parlament de les Illes Balears", "Illes Balears"
    if "murcia" in cl:
        return "Asamblea Regional de Murcia", "Murcia"
    if "extremadura" in cl:
        return "Asamblea de Extremadura", "Extremadura"
    if "asturias" in cl or "asturiano" in cl:
        return "Junta General del Principado de Asturias", "Asturias"
    if "cantabria" in cl:
        return "Parlamento de Cantabria", "Cantabria"
    if "rioja" in cl:
        return "Parlamento de La Rioja", "La Rioja"
    return "Parlamento Autonómico", "España"


def download(data_dir: Path) -> Path:
    out = data_dir / "ccaa_wikidata.json"
    console.log("[bold blue]CCAA[/] Descargando diputados autonómicos de Wikidata...")

    seen_names: set[str] = set()
    diputados = []

    for query, label in [
        (WIKIDATA_QUERY_ACTIVOS, "activos≥2023"),
        (WIKIDATA_QUERY_RECIENTES, "recientes 2024"),
    ]:
        time.sleep(1)  # respetar rate limit Wikidata
        bindings = _wikidata_query(query, label)
        console.log(f"[dim]  {label}: {len(bindings)} resultados Wikidata[/]")

        for b in bindings:
            nombre = b.get("personLabel", {}).get("value", "").strip()
            if not nombre or nombre.startswith("Q"):
                continue

            cargo_label = b.get("cargoLabel", {}).get("value", "").strip()
            if not _is_ccaa_cargo(cargo_label):
                continue

            nombre_norm = normalize_name(nombre)
            if nombre_norm in seen_names:
                continue
            seen_names.add(nombre_norm)

            partido = b.get("partidoLabel", {}).get("value", "").strip()
            birth = b.get("birth_date", {}).get("value", "")
            wikidata_id = b.get("person", {}).get("value", "").split("/")[-1]
            institucion, comunidad = _cargo_to_institucion(cargo_label)

            diputados.append({
                "nombre_completo": nombre.upper(),
                "cargo": cargo_label,
                "partido": partido,
                "grupo_parlamentario": "",
                "comunidad": comunidad,
                "institucion": institucion,
                "fecha_nacimiento": birth[:10] if birth else None,
                "wikidata_id": wikidata_id,
            })

    if diputados:
        out.write_text(
            json.dumps({"diputados_ccaa": diputados}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        console.log(f"[green]✓[/] {len(diputados)} diputados autonómicos descargados")
        return out

    console.log("[yellow]⚠[/] Wikidata devolvió 0 resultados — usando muestra")
    out.write_text(json.dumps({"diputados_ccaa": _SAMPLE}, ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def parse(file_path: Path):
    data = json.loads(file_path.read_text(encoding="utf-8"))
    persons, offices_data, groups_dict = [], [], {}

    for d in data.get("diputados_ccaa", []):
        nombre_raw = d.get("nombre_completo", "")
        nombre = normalize_name(nombre_raw)
        if not nombre:
            continue

        partido = d.get("partido", "").strip()
        grupo = d.get("grupo_parlamentario", "").strip()
        institucion = d.get("institucion", "Parlamento Autonómico").strip()
        comunidad = d.get("comunidad", "").strip()
        pid = make_person_id(nombre, SOURCE_ID)
        office_id = make_office_id(nombre, "Diputado/a Autonómico/a", institucion)

        persons.append({
            "id": pid,
            "name": nombre,
            "partido": partido,
            "comunidad_autonoma": comunidad,
            "camara": institucion,
            "pep": True,
            "fecha_nacimiento": d.get("fecha_nacimiento"),
            "wikidata_id": d.get("wikidata_id", ""),
            "_source": SOURCE_ID,
        })

        offices_data.append({
            "office": {
                "id": office_id,
                "role": "Diputado/a Autonómico/a",
                "institution": institucion,
                "start_date": None,
                "end_date": None,
                "active": True,
                "person_id": pid,
                "group_name": grupo or f"Grupo {partido}" if partido else institucion,
                "_source": SOURCE_ID,
            },
            "person_id": pid,
        })

        gname = grupo or (f"Grupo {partido}" if partido else institucion)
        if gname and gname not in groups_dict:
            groups_dict[gname] = {
                "id": f"gp:{slugify(gname)}",
                "name": gname,
                "partido_principal": partido,
                "camara": institucion,
                "_source": SOURCE_ID,
            }

    groups = list(groups_dict.values())
    console.log(f"[green]✓[/] CCAA: {len(persons)} diputados autonómicos, {len(groups)} grupos")
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

    console.log(f"[green]✓[/] Cargados {len(persons)} diputados CCAA, {len(offices)} cargos, {len(groups)} grupos")


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: ccaa_es")
    data_dir.mkdir(parents=True, exist_ok=True)
    persons, offices_data, groups = parse(download(data_dir))
    load(loader, persons, offices_data, groups)
    console.log("[bold green]✓ Pipeline ccaa_es completado[/]")
