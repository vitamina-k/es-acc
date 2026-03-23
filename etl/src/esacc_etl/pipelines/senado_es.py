"""Pipeline: Senado de España — Wikidata SPARQL.

Carga: ~265 senadores (Person), grupos parlamentarios (PoliticalGroup),
       cargos PublicOffice y relaciones PERTENECE_A / HOLDS_OFFICE.
"""
from __future__ import annotations
import hashlib, json, time
from datetime import UTC, datetime
from pathlib import Path
import httpx
from rich.console import Console
from esacc_etl.loader import GraphLoader
from esacc_etl.transforms import normalize_name, parse_date

console = Console()
SOURCE_ID = "senado_es"
LEGISLATURA = 15
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIDATA_QUERY = """
SELECT DISTINCT ?person ?personLabel ?partidoLabel ?comunidadLabel ?birth_date WHERE {
  ?person wdt:P39 wd:Q19323171.
  OPTIONAL { ?person wdt:P102 ?partido. }
  OPTIONAL { ?person wdt:P569 ?birth_date. }
  OPTIONAL { ?person wdt:P276 ?comunidad. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 300
"""


def _pid(nombre: str) -> str:
    return hashlib.sha256(f"senado_es|senador|{normalize_name(nombre, sort_tokens=True)}".encode()).hexdigest()[:16]


def _gid(nombre: str) -> str:
    return hashlib.sha256(f"congreso|grupo|{normalize_name(nombre)}".encode()).hexdigest()[:16]


def download(data_dir: Path) -> Path:
    out = data_dir / "senado_wikidata.json"
    console.log("[bold blue]SENADO[/] Descargando senadores de Wikidata...")
    headers = {
        "User-Agent": "VIGILIA/1.0 (datos-publicos-espana) httpx/0.28",
        "Accept": "application/sparql-results+json",
    }
    try:
        r = httpx.get(WIKIDATA_SPARQL, params={"query": WIKIDATA_QUERY, "format": "json"},
                      headers=headers, timeout=60, follow_redirects=True)
        if r.status_code == 200:
            bindings = r.json().get("results", {}).get("bindings", [])
            senadores = []
            for b in bindings:
                nombre = b.get("personLabel", {}).get("value", "")
                if not nombre or nombre.startswith("Q"):
                    continue
                senadores.append({
                    "id": b.get("person", {}).get("value", "").split("/")[-1],
                    "nombre_completo": nombre.upper(),
                    "partido": b.get("partidoLabel", {}).get("value", ""),
                    "comunidad_autonoma": b.get("comunidadLabel", {}).get("value", ""),
                    "fecha_nacimiento": b.get("birth_date", {}).get("value", "")[:10] if b.get("birth_date") else None,
                    "legislatura": LEGISLATURA,
                    "grupo_parlamentario": b.get("partidoLabel", {}).get("value", ""),
                })
            if senadores:
                out.write_text(json.dumps({"senadores": senadores}, ensure_ascii=False), encoding="utf-8")
                console.log(f"[green]✓[/] {len(senadores)} senadores descargados")
                return out
    except Exception as e:
        console.log(f"[yellow]⚠[/] Wikidata error: {e}")

    # fallback muestra
    console.log("[yellow]⚠[/] Usando muestra de desarrollo")
    sample = [
        {"id": "s001", "nombre_completo": "PEDRO ROLLÁN OJEDA", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Madrid", "legislatura": LEGISLATURA},
        {"id": "s002", "nombre_completo": "MIQUEL ICETA LLORENS", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Barcelona", "legislatura": LEGISLATURA},
        {"id": "s003", "nombre_completo": "CRISTINA NARBONA RUIZ", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Madrid", "legislatura": LEGISLATURA},
        {"id": "s004", "nombre_completo": "RAFAEL HERNANDO FRAILE", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Granada", "legislatura": LEGISLATURA},
        {"id": "s005", "nombre_completo": "LUIS NATALIO ROYO RUIZ", "partido": "VOX", "grupo_parlamentario": "Grupo Parlamentario VOX en el Senado", "comunidad_autonoma": "Cádiz", "legislatura": LEGISLATURA},
    ]
    out.write_text(json.dumps({"senadores": sample}, ensure_ascii=False), encoding="utf-8")
    return out


def parse(file_path: Path):
    data = json.loads(file_path.read_text(encoding="utf-8"))
    persons, groups, offices, memberships = [], [], {}, []

    for s in data.get("senadores", []):
        nombre = normalize_name(s.get("nombre_completo", ""))
        if not nombre:
            continue
        pid = _pid(nombre)
        grupo = s.get("grupo_parlamentario", "").strip()
        partido = s.get("partido", "").strip()

        persons.append({
            "id": pid,
            "name": nombre,
            "partido": partido,
            "comunidad_autonoma": s.get("comunidad_autonoma", ""),
            "camara": "Senado",
            "pep": True,
            "_source": SOURCE_ID,
        })

        office_id = f"senado:{pid}:L{LEGISLATURA}"
        offices_entry = {
            "id": office_id,
            "title": "Senador/a",
            "institution": "Senado de España",
            "start_date": None,
            "end_date": None,
            "active": True,
            "_source": SOURCE_ID,
        }

        if grupo:
            gid = _gid(grupo)
            if gid not in groups:
                groups[gid] = {"id": gid, "name": grupo, "partido_principal": partido, "camara": "Senado", "_source": SOURCE_ID}
            memberships.append({"person_id": pid, "group_id": gid})

        offices[office_id] = (offices_entry, pid)

    console.log(f"[green]✓[/] SENADO: {len(persons)} senadores, {len(groups)} grupos")
    return persons, list(groups.values()), list(offices.values()), memberships


def load(loader: GraphLoader, persons, groups, offices_data, memberships):
    loader.load_persons(persons)
    if groups:
        loader.load_political_groups(groups)
    office_list = [o for o, _ in offices_data]
    links = [{"person_id": pid, "office_id": o["id"]} for o, pid in offices_data]
    if office_list:
        loader.load_public_offices(office_list)
        loader.link_person_to_office(links)


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: senado_es")
    data_dir.mkdir(parents=True, exist_ok=True)
    persons, groups, offices_data, memberships = parse(download(data_dir))
    load(loader, persons, groups, offices_data, memberships)
    console.log("[bold green]✓ Pipeline senado_es completado[/]")
