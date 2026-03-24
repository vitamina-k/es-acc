"""Pipeline: Eurodiputados Españoles — Wikidata SPARQL + fallback muestra.

Carga: ~55-61 eurodiputados (Person), grupos políticos europeos (PoliticalGroup),
       cargos PublicOffice y relaciones PERTENECE_A / OCUPA_CARGO.

Cobertura: Wikidata cubre bien la 10ª legislatura (2024-2029) para eurodiputados
           con perfiles notables. España tiene 61 escaños en el Parlamento Europeo.
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
SOURCE_ID = "eurodiputados_es"
LEGISLATURA = 10
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

# Q27169 = miembro del Parlamento Europeo (cargo)
# Q112567597 = 10ª legislatura del Parlamento Europeo (2024-2029)
# Q29 = España (nacionalidad)
# P4100 = grupo parlamentario europeo
WIKIDATA_QUERY = """
SELECT DISTINCT ?person ?personLabel ?partidoLabel ?grupoLabel ?birth_date WHERE {
  ?person p:P39 ?stmt.
  ?stmt ps:P39 wd:Q27169.
  ?person wdt:P27 wd:Q29.
  {
    ?stmt pq:P2937 wd:Q112567597.
  } UNION {
    ?stmt pq:P580 ?start.
    FILTER(?start >= "2024-06-01"^^xsd:dateTime)
    FILTER NOT EXISTS { ?stmt pq:P582 ?end. }
  }
  OPTIONAL { ?person wdt:P102 ?partido. }
  OPTIONAL { ?stmt pq:P4100 ?grupo. }
  OPTIONAL { ?person wdt:P569 ?birth_date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 200
"""

_SAMPLE = [
    {"nombre_completo": "DOLORS MONTSERRAT MONTSERRAT", "partido": "Partido Popular", "grupo_europeo": "Grupo del Partido Popular Europeo (Demócrata-Cristiano)"},
    {"nombre_completo": "IRENE MONTERO GIL", "partido": "Podemos", "grupo_europeo": "El Grupo de la Izquierda en el Parlamento Europeo – GUE/NGL"},
    {"nombre_completo": "ESTEBAN GONZÁLEZ PONS", "partido": "Partido Popular", "grupo_europeo": "Grupo del Partido Popular Europeo (Demócrata-Cristiano)"},
    {"nombre_completo": "LINA GÁLVEZ MUÑOZ", "partido": "PSOE", "grupo_europeo": "Grupo de la Alianza Progresista de Socialistas y Demócratas en el Parlamento Europeo"},
    {"nombre_completo": "JORGE BUXADÉ VILLALBA", "partido": "Vox", "grupo_europeo": "Grupo de los Patriotas por Europa"},
]


def download(data_dir: Path) -> Path:
    out = data_dir / "eurodiputados_wikidata.json"
    console.log("[bold blue]EURODIPUTADOS[/] Descargando de Wikidata...")
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
            eurods = []
            for b in bindings:
                nombre = b.get("personLabel", {}).get("value", "").strip()
                if not nombre or nombre.startswith("Q"):
                    continue
                nombre_norm = normalize_name(nombre)
                if nombre_norm in seen_names:
                    continue
                seen_names.add(nombre_norm)
                partido = b.get("partidoLabel", {}).get("value", "").strip()
                grupo = b.get("grupoLabel", {}).get("value", "").strip()
                birth = b.get("birth_date", {}).get("value", "")
                eurods.append({
                    "nombre_completo": nombre.upper(),
                    "partido": partido,
                    "grupo_europeo": grupo or _partido_to_grupo_europeo(partido),
                    "fecha_nacimiento": birth[:10] if birth else None,
                    "legislatura": LEGISLATURA,
                    "wikidata_id": b.get("person", {}).get("value", "").split("/")[-1],
                })
            if eurods:
                out.write_text(json.dumps({"eurodiputados": eurods}, ensure_ascii=False, indent=2), encoding="utf-8")
                console.log(f"[green]✓[/] {len(eurods)} eurodiputados descargados de Wikidata")
                return out
            console.log("[yellow]⚠[/] Wikidata devolvió 0 resultados")
        else:
            console.log(f"[yellow]⚠[/] Wikidata HTTP {r.status_code}")
    except Exception as e:
        console.log(f"[yellow]⚠[/] Wikidata error: {e}")

    console.log("[yellow]⚠[/] Usando muestra de desarrollo (5 eurodiputados)")
    out.write_text(json.dumps({"eurodiputados": _SAMPLE}, ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def _partido_to_grupo_europeo(partido: str) -> str:
    """Mapea partido nacional español al grupo político europeo correspondiente."""
    p = partido.lower()
    if any(x in p for x in ["partido popular", " pp"]):
        return "Grupo del Partido Popular Europeo (Demócrata-Cristiano)"
    if any(x in p for x in ["socialista", "psoe", "psc"]):
        return "Grupo de la Alianza Progresista de Socialistas y Demócratas en el Parlamento Europeo"
    if any(x in p for x in ["vox"]):
        return "Grupo de los Patriotas por Europa"
    if any(x in p for x in ["sumar", "izquierda unida", "podemos", "más país"]):
        return "El Grupo de la Izquierda en el Parlamento Europeo – GUE/NGL"
    if any(x in p for x in ["ciudadanos", "cs"]):
        return "Renovar Europa"
    if any(x in p for x in ["esquerra", "erc"]):
        return "El Grupo de la Izquierda en el Parlamento Europeo – GUE/NGL"
    if any(x in p for x in ["junts", "pdecat"]):
        return "Grupo de los Patriotas por Europa"
    if any(x in p for x in ["pnv", "eaj"]):
        return "Renovar Europa"
    return "No inscrito"


def parse(file_path: Path):
    data = json.loads(file_path.read_text(encoding="utf-8"))
    persons, offices_data, groups_dict = [], [], {}

    for ep in data.get("eurodiputados", []):
        nombre_raw = ep.get("nombre_completo", "")
        nombre = normalize_name(nombre_raw)
        if not nombre:
            continue

        partido = ep.get("partido", "").strip()
        grupo = ep.get("grupo_europeo", "").strip() or _partido_to_grupo_europeo(partido)
        pid = make_person_id(nombre, SOURCE_ID)
        office_id = make_office_id(nombre, "Eurodiputado/a", "Parlamento Europeo")

        persons.append({
            "id": pid,
            "name": nombre,
            "partido": partido,
            "camara": "Parlamento Europeo",
            "pep": True,
            "fecha_nacimiento": ep.get("fecha_nacimiento"),
            "wikidata_id": ep.get("wikidata_id", ""),
            "_source": SOURCE_ID,
        })

        offices_data.append({
            "office": {
                "id": office_id,
                "role": "Eurodiputado/a",
                "institution": "Parlamento Europeo",
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
                "camara": "Parlamento Europeo",
                "_source": SOURCE_ID,
            }

    groups = list(groups_dict.values())
    console.log(f"[green]✓[/] EURODIPUTADOS: {len(persons)} personas, {len(groups)} grupos europeos")
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

    console.log(f"[green]✓[/] Cargados {len(persons)} eurodiputados, {len(offices)} cargos, {len(groups)} grupos")


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: eurodiputados_es")
    data_dir.mkdir(parents=True, exist_ok=True)
    persons, offices_data, groups = parse(download(data_dir))
    load(loader, persons, offices_data, groups)
    console.log("[bold green]✓ Pipeline eurodiputados_es completado[/]")
