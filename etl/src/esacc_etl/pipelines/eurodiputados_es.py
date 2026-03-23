"""Pipeline: Eurodiputados Españoles — Wikidata SPARQL.

Carga: ~61 eurodiputados (Person), grupos políticos europeos (PoliticalGroup).
Legislatura 10ª (2024-2029).
"""
from __future__ import annotations
import hashlib, json
from datetime import UTC, datetime
from pathlib import Path
import httpx
from rich.console import Console
from esacc_etl.loader import GraphLoader
from esacc_etl.transforms import normalize_name, parse_date

console = Console()
SOURCE_ID = "eurodiputados_es"
LEGISLATURA = 10
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIDATA_QUERY = """
SELECT DISTINCT ?person ?personLabel ?partidoLabel ?grupoLabel ?birth_date WHERE {
  ?person p:P39 ?statement.
  ?statement ps:P39 wd:Q27169.
  ?statement pq:P2937 wd:Q112567597.
  ?person wdt:P27 wd:Q29.
  OPTIONAL { ?person wdt:P102 ?partido. }
  OPTIONAL { ?statement pq:P4100 ?grupo. }
  OPTIONAL { ?person wdt:P569 ?birth_date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 100
"""


def _pid(nombre: str) -> str:
    return hashlib.sha256(f"eurodiputados_es|eurodiputado|{normalize_name(nombre, sort_tokens=True)}".encode()).hexdigest()[:16]


def _gid(nombre: str) -> str:
    return hashlib.sha256(f"eurodiputados_es|grupo|{normalize_name(nombre)}".encode()).hexdigest()[:16]


def download(data_dir: Path) -> Path:
    out = data_dir / "eurodiputados_wikidata.json"
    console.log("[bold blue]EURODIPUTADOS[/] Descargando de Wikidata...")
    headers = {
        "User-Agent": "VIGILIA/1.0 (datos-publicos-espana) httpx/0.28",
        "Accept": "application/sparql-results+json",
    }
    try:
        r = httpx.get(WIKIDATA_SPARQL, params={"query": WIKIDATA_QUERY, "format": "json"},
                      headers=headers, timeout=60, follow_redirects=True)
        if r.status_code == 200:
            bindings = r.json().get("results", {}).get("bindings", [])
            eurods = []
            for b in bindings:
                nombre = b.get("personLabel", {}).get("value", "")
                if not nombre or nombre.startswith("Q"):
                    continue
                eurods.append({
                    "id": b.get("person", {}).get("value", "").split("/")[-1],
                    "nombre_completo": nombre.upper(),
                    "partido": b.get("partidoLabel", {}).get("value", ""),
                    "grupo_europeo": b.get("grupoLabel", {}).get("value", ""),
                    "fecha_nacimiento": b.get("birth_date", {}).get("value", "")[:10] if b.get("birth_date") else None,
                    "legislatura": LEGISLATURA,
                })
            if eurods:
                out.write_text(json.dumps({"eurodiputados": eurods}, ensure_ascii=False), encoding="utf-8")
                console.log(f"[green]✓[/] {len(eurods)} eurodiputados descargados")
                return out
    except Exception as e:
        console.log(f"[yellow]⚠[/] Wikidata error: {e}")

    console.log("[yellow]⚠[/] Usando muestra de desarrollo")
    sample = [
        {"id": "e001", "nombre_completo": "DOLORS MONTSERRAT MONTSERRAT", "partido": "Partido Popular", "grupo_europeo": "Grupo del Partido Popular Europeo", "legislatura": LEGISLATURA},
        {"id": "e002", "nombre_completo": "IRENE MONTERO GIL", "partido": "Podemos", "grupo_europeo": "Grupo de la Izquierda", "legislatura": LEGISLATURA},
        {"id": "e003", "nombre_completo": "ESTEBAN GONZÁLEZ PONS", "partido": "Partido Popular", "grupo_europeo": "Grupo del Partido Popular Europeo", "legislatura": LEGISLATURA},
        {"id": "e004", "nombre_completo": "LINA GÁLVEZ MUÑOZ", "partido": "PSOE", "grupo_europeo": "Grupo de la Alianza Progresista de Socialistas y Demócratas", "legislatura": LEGISLATURA},
        {"id": "e005", "nombre_completo": "JORGE BUXADÉ VILLALBA", "partido": "Vox", "grupo_europeo": "Grupo de los Conservadores y Reformistas Europeos", "legislatura": LEGISLATURA},
    ]
    out.write_text(json.dumps({"eurodiputados": sample}, ensure_ascii=False), encoding="utf-8")
    return out


def parse(file_path: Path):
    data = json.loads(file_path.read_text(encoding="utf-8"))
    persons, groups, offices = [], {}, []

    for ep in data.get("eurodiputados", []):
        nombre = normalize_name(ep.get("nombre_completo", ""))
        if not nombre:
            continue
        pid = _pid(nombre)
        grupo = ep.get("grupo_europeo", "").strip()
        partido = ep.get("partido", "").strip()

        persons.append({
            "id": pid,
            "name": nombre,
            "partido": partido,
            "camara": "Parlamento Europeo",
            "pep": True,
            "tipo_cargo": "EURODIPUTADO",
            "_source": SOURCE_ID,
        })

        office_id = f"europarl:{pid}:L{LEGISLATURA}"
        offices.append((
            {"id": office_id, "title": "Eurodiputado/a", "institution": "Parlamento Europeo",
             "start_date": None, "end_date": None, "active": True, "_source": SOURCE_ID},
            pid
        ))

        if grupo:
            gid = _gid(grupo)
            if gid not in groups:
                groups[gid] = {"id": gid, "name": grupo, "camara": "Parlamento Europeo", "_source": SOURCE_ID}

    console.log(f"[green]✓[/] EURODIPUTADOS: {len(persons)} personas, {len(groups)} grupos europeos")
    return persons, list(groups.values()), offices


def load(loader: GraphLoader, persons, groups, offices_data):
    loader.load_persons(persons)
    if groups:
        loader.load_political_groups(groups)
    office_list = [o for o, _ in offices_data]
    links = [{"person_id": pid, "office_id": o["id"]} for o, pid in offices_data]
    if office_list:
        loader.load_public_offices(office_list)
        loader.link_person_to_office(links)


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: eurodiputados_es")
    data_dir.mkdir(parents=True, exist_ok=True)
    persons, groups, offices_data = parse(download(data_dir))
    load(loader, persons, groups, offices_data)
    console.log("[bold green]✓ Pipeline eurodiputados_es completado[/]")
