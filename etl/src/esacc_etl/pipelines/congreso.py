"""Pipeline: Congreso de los Diputados — API interna Liferay + fallback JSON.

Carga: 350 diputados (Person), grupos parlamentarios (PoliticalGroup),
       cargos PublicOffice y relaciones PERTENECE_A / OCUPA_CARGO.

Source: API interna del Congreso (requiere GET previo para sesión Liferay).
        La API devuelve nombre, partido, grupo, circunscripción, fechas.
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
SOURCE_ID = "congreso"
LEGISLATURA = 15

_CONGRESO_PAGE = "https://www.congreso.es/es/busqueda-de-diputados"
_CONGRESO_API = (
    "https://www.congreso.es/es/busqueda-de-diputados"
    "?p_p_id=diputadomodule&p_p_lifecycle=2&p_p_state=normal"
    "&p_p_mode=view&p_p_resource_id=searchDiputados&p_p_cacheability=cacheLevelPage"
)

_SAMPLE = [
    {"nombre_completo": "PEDRO SÁNCHEZ PÉREZ-CASTEJÓN", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista", "circunscripcion": "Madrid"},
    {"nombre_completo": "ALBERTO NÚÑEZ FEIJÓO", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Congreso", "circunscripcion": "Madrid"},
    {"nombre_completo": "SANTIAGO ABASCAL CONDE", "partido": "VOX", "grupo_parlamentario": "Grupo Parlamentario VOX", "circunscripcion": "Madrid"},
    {"nombre_completo": "YOLANDA DÍAZ PÉREZ", "partido": "SUMAR", "grupo_parlamentario": "Grupo Parlamentario Plurinacional SUMAR", "circunscripcion": "A Coruña"},
    {"nombre_completo": "GABRIEL RUFIÁN ROMERO", "partido": "ERC", "grupo_parlamentario": "Grupo Parlamentario Republicano", "circunscripcion": "Barcelona"},
]


def download(data_dir: Path) -> Path:
    out = data_dir / "congreso_diputados_xv.json"

    # Si ya existe el archivo (descargado manualmente), usarlo directamente
    if out.exists() and out.stat().st_size > 10000:
        console.log(f"[green]✓[/] Usando datos existentes: {out.stat().st_size:,} bytes")
        return out

    console.log("[bold blue]CONGRESO[/] Descargando diputados via API Liferay...")
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": _CONGRESO_PAGE,
        "Origin": "https://www.congreso.es",
    }
    try:
        with httpx.Client(follow_redirects=True, timeout=30) as client:
            # Paso 1: GET para inicializar sesión Liferay
            r1 = client.get(_CONGRESO_PAGE, headers=headers)
            r1.raise_for_status()
            time.sleep(0.5)

            # Paso 2: POST con cookies de sesión
            form_data = (
                "_diputadomodule_idLegislatura=15"
                "&_diputadomodule_tipo=0"
                "&_diputadomodule_genero="
                "&_diputadomodule_grupo="
                "&_diputadomodule_nombre="
                "&_diputadomodule_apellidos="
                "&_diputadomodule_formacion="
            )
            r2 = client.post(
                _CONGRESO_API,
                content=form_data,
                headers={**headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
            )
            if r2.status_code == 200 and r2.text:
                raw = r2.json()
                diputados = [
                    {
                        "nombre_completo": (d["nombre"] + " " + d["apellidos"]).upper(),
                        "partido": d.get("formacion", ""),
                        "grupo_parlamentario": d.get("grupo", ""),
                        "circunscripcion": d.get("nombreCircunscripcion", ""),
                        "fecha_alta": d.get("fchAlta", ""),
                        "fecha_baja": d.get("fchBaja", ""),
                        "legislatura": d.get("idLegislatura", LEGISLATURA),
                        "cod_parlamentario": d.get("codParlamentario"),
                    }
                    for d in raw.get("data", [])
                    if d.get("nombre") and d.get("apellidos")
                ]
                if diputados:
                    out.write_text(
                        json.dumps({"diputados": diputados}, ensure_ascii=False, indent=2),
                        encoding="utf-8",
                    )
                    console.log(f"[green]✓[/] {len(diputados)} diputados descargados de la API del Congreso")
                    return out
            console.log(f"[yellow]⚠[/] API devolvió respuesta vacía (HTTP {r2.status_code}, {len(r2.text)} bytes)")
    except Exception as e:
        console.log(f"[yellow]⚠[/] Error descargando del Congreso: {e}")

    console.log("[yellow]⚠[/] Usando muestra de desarrollo (5 diputados)")
    out.write_text(json.dumps({"diputados": _SAMPLE}, ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def parse(file_path: Path):
    data = json.loads(file_path.read_text(encoding="utf-8"))
    persons, offices_data, groups_dict = [], [], {}

    for d in data.get("diputados", []):
        nombre_raw = d.get("nombre_completo", "")
        nombre = normalize_name(nombre_raw)
        if not nombre:
            continue

        partido = d.get("partido", "").strip()
        grupo = d.get("grupo_parlamentario", "").strip()
        circunscripcion = d.get("circunscripcion", "").strip()
        fecha_alta = d.get("fecha_alta", "")
        pid = make_person_id(nombre, SOURCE_ID)
        office_id = make_office_id(nombre, "Diputado/a", "Congreso de los Diputados")

        persons.append({
            "id": pid,
            "name": nombre,
            "partido": partido,
            "circunscripcion": circunscripcion,
            "camara": "Congreso de los Diputados",
            "pep": True,
            "_source": SOURCE_ID,
        })

        offices_data.append({
            "office": {
                "id": office_id,
                "role": "Diputado/a",
                "institution": "Congreso de los Diputados",
                "start_date": _parse_date(fecha_alta),
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
                "camara": "Congreso de los Diputados",
                "_source": SOURCE_ID,
            }

    groups = list(groups_dict.values())
    console.log(f"[green]✓[/] CONGRESO: {len(persons)} diputados, {len(groups)} grupos")
    return persons, offices_data, groups


def _parse_date(s: str) -> str | None:
    """Convierte DD/MM/YYYY a YYYY-MM-DD."""
    if not s:
        return None
    parts = s.strip().split("/")
    if len(parts) == 3:
        try:
            return f"{parts[2]}-{parts[1]}-{parts[0]}"
        except Exception:
            pass
    return None


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

    console.log(f"[green]✓[/] Cargados {len(persons)} diputados, {len(offices)} cargos, {len(groups)} grupos")


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: congreso")
    data_dir.mkdir(parents=True, exist_ok=True)
    persons, offices_data, groups = parse(download(data_dir))
    load(loader, persons, offices_data, groups)
    console.log("[bold green]✓ Pipeline congreso completado[/]")
