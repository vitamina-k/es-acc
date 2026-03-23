"""Pipeline: CNMC — Sanciones de Competencia y Mercados.

Source: BOE API — https://api.boe.es/opendata/BOE/sumario/YYYYMMDD
Loads: Sanction + Company nodes, SANCTIONED relationships
"""
from __future__ import annotations
import hashlib, json, re, time
from datetime import UTC, datetime, timedelta
from pathlib import Path
import httpx
from rich.console import Console
from esacc_etl.loader import GraphLoader
from esacc_etl.transforms.normalize import normalize_name

console = Console()
SOURCE_ID = "cnmc"
_BOE = "https://api.boe.es/opendata/BOE/sumario"
_DEPT = ["comisión nacional de los mercados", "comision nacional de los mercados", "cnmc"]
_SANCION = re.compile(r"resolución\s+sancionadora|multa|sanción|expediente\s+sancionador|infracción\s+(?:muy\s+)?grave|abuso\s+de\s+posición|prácticas\s+restrictivas", re.I)
_NIF = re.compile(r"\b([A-HJNP-SUVW]\d{7}[0-9A-J]|\d{8}[A-Z])\b")
_AMT = re.compile(r"(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:euros?|€)", re.I)


def _sid(ref): return "cnmc:" + hashlib.sha256(ref.encode()).hexdigest()[:16]


def download(data_dir: Path) -> Path:
    out = data_dir / "cnmc_boe.json"
    console.log("[bold blue]CNMC[/] Descargando resoluciones del BOE (90 días)...")
    today, results = datetime.now(tz=UTC), []
    for d in range(0, 90, 3):
        date = today - timedelta(days=d)
        try:
            r = httpx.get(f"{_BOE}/{date.strftime('%Y%m%d')}", timeout=20, headers={"Accept": "application/json"})
            if r.status_code != 200: continue
            diarios = r.json().get("data", {}).get("sumario", {}).get("diario", {})
            if isinstance(diarios, dict): diarios = [diarios]
            for diario in (diarios if isinstance(diarios, list) else []):
                for sec in diario.get("secciones", {}).get("seccion", []):
                    depts = sec.get("departamento", [])
                    if isinstance(depts, dict): depts = [depts]
                    for dept in depts:
                        if not any(p in dept.get("@nombre","").lower() for p in _DEPT): continue
                        items = dept.get("item", [])
                        if isinstance(items, dict): items = [items]
                        for item in items:
                            t = item.get("titulo", "")
                            if _SANCION.search(t):
                                results.append({"id": item.get("identificador",""), "titulo": t,
                                    "departamento": dept.get("@nombre","CNMC"), "fecha": date.strftime("%Y-%m-%d"),
                                    "url": item.get("urlPdf",{}).get("#text","")})
            time.sleep(0.2)
        except Exception as e:
            console.log(f"[yellow]⚠[/] BOE {date.strftime('%Y%m%d')}: {e}")
    if results:
        out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        console.log(f"[green]✓[/] {len(results)} resoluciones CNMC")
    else:
        console.log("[yellow]⚠[/] Sin datos — muestra de desarrollo")
        out.write_text(json.dumps([{"id":"CNMC-SAMPLE-001","titulo":"Resolución sancionadora — prácticas restrictivas sector energía","departamento":"CNMC","fecha":"2024-06-01","url":"","sancionado":"ENERGÍA EJEMPLO SA","nif":"A12345678"}], ensure_ascii=False), encoding="utf-8")
    return out


def parse(file_path: Path):
    items = json.loads(file_path.read_text(encoding="utf-8"))
    sanctions, companies, links = [], [], []
    for item in (items if isinstance(items, list) else []):
        ref, titulo = item.get("id","").strip(), item.get("titulo","").strip()
        if not ref or not titulo: continue
        sid = _sid(ref)
        sanctions.append({"id": sid, "sanction_type": "administrative", "source": "CNMC",
            "entity_name": item.get("sancionado", titulo[:120]), "reason": titulo, "_source": SOURCE_ID})
        nombre = normalize_name(item.get("sancionado",""))
        nif = re.sub(r"\s+","", item.get("nif","").strip().upper())
        if not nif:
            mn = _NIF.search(titulo)
            nif = mn.group(1) if mn else ""
        if nombre and nif:
            companies.append({"nif": nif, "name": nombre, "status": None, "province": None, "_source": SOURCE_ID})
            links.append({"entity_id": nif, "sanction_id": sid})
    console.log(f"[green]✓[/] CNMC: {len(sanctions)} sanciones, {len(companies)} empresas")
    return sanctions, companies, links


def load(loader: GraphLoader, sanctions, companies, links):
    loader.load_sanctions(sanctions)
    if companies: loader.load_companies(companies)
    if links: loader.link_entity_to_sanction(links)


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: cnmc")
    data_dir.mkdir(parents=True, exist_ok=True)
    s, c, l = parse(download(data_dir))
    load(loader, s, c, l)
    console.log("[bold green]✓ Pipeline cnmc completado[/]")
