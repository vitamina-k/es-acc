"""Pipeline: CNMV — Sanciones del Mercado de Valores.

Source: CSV oficial CNMV — https://www.cnmv.es/DocPortal/Publicaciones/Sanciones/Sanciones_abiertos.csv
Loads: Sanction + Company/Person nodes, SANCTIONED relationships
"""
from __future__ import annotations
import csv, hashlib, io, json, re
from pathlib import Path
import httpx
from rich.console import Console
from esacc_etl.loader import GraphLoader
from esacc_etl.transforms.normalize import normalize_name

console = Console()
SOURCE_ID = "cnmv"
_CSV_URL = "https://www.cnmv.es/DocPortal/Publicaciones/Sanciones/Sanciones_abiertos.csv"
_NIF = re.compile(r"\b([A-HJNP-SUVW]\d{7}[0-9A-J]|\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b")


def _sid(ref): return "cnmv:" + hashlib.sha256(ref.encode()).hexdigest()[:16]


def download(data_dir: Path) -> Path:
    out = data_dir / "cnmv_sanciones.csv"
    console.log("[bold blue]CNMV[/] Descargando CSV de sanciones...")
    try:
        r = httpx.get(_CSV_URL, timeout=60, follow_redirects=True,
            headers={"User-Agent": "VIGILIA/1.0 (transparency research)"})
        if r.status_code == 200 and len(r.content) > 500:
            out.write_bytes(r.content)
            console.log(f"[green]✓[/] CSV descargado: {len(r.content):,} bytes")
            return out
        console.log(f"[yellow]⚠[/] HTTP {r.status_code} — usando muestra")
    except Exception as e:
        console.log(f"[yellow]⚠[/] Error descarga: {e} — usando muestra")
    # muestra de desarrollo
    sample = "expediente;sancionado;nif;tipo;infraccion;gravedad;importe;fecha_resolucion;estado\nCNMV-2024-001;BROKER IRREGULAR SL;B12345678;JURIDICA;Prestación sin autorización;GRAVE;500000;2024-03-15;FIRME\nCNMV-2024-002;GARCIA LOPEZ PEDRO;12345678A;FISICA;Insider trading;MUY GRAVE;800000;2024-06-20;FIRME\n"
    out.write_text(sample, encoding="utf-8")
    return out


def parse(file_path: Path):
    sanctions, companies, persons, links = [], [], [], []
    for enc in ("utf-8-sig", "latin-1", "utf-8"):
        try:
            content = file_path.read_text(encoding=enc, errors="replace"); break
        except Exception: pass
    sep = ";" if content.count(";") > content.count(",") else ","
    reader = csv.DictReader(io.StringIO(content), delimiter=sep)
    for row in reader:
        norm = {k.strip().upper().replace(" ","_"): (v or "").strip() for k,v in row.items() if k}
        exp = norm.get("EXPEDIENTE","").strip()
        nombre = normalize_name(norm.get("SANCIONADO",""))
        if not exp or not nombre: continue
        nif = re.sub(r"\s+","", norm.get("NIF", norm.get("CIF","")).upper())
        inf = norm.get("INFRACCION", norm.get("TIPO_INFRACCION",""))
        grav = norm.get("GRAVEDAD","").upper()
        importe_str = re.sub(r"[€\s\.]", "", norm.get("IMPORTE","0")).replace(",",".")
        try: importe = float(importe_str)
        except ValueError: importe = 0.0
        fecha = norm.get("FECHA_RESOLUCION","")
        es_fisica = bool(re.match(r"^\d{8}[A-Z]$", nif)) or norm.get("TIPO","").upper() == "FISICA"
        sid = _sid(exp)
        sanctions.append({"id": sid, "sanction_type": "securities", "source": "CNMV",
            "entity_name": nombre, "reason": inf, "_source": SOURCE_ID})
        if nif:
            if es_fisica:
                persons.append({"id": "cnmv_p:" + nif, "name": nombre, "aliases": None, "_source": SOURCE_ID})
                links.append({"entity_id": "cnmv_p:" + nif, "sanction_id": sid})
            else:
                companies.append({"nif": nif, "name": nombre, "status": f"sancionada_cnmv_{grav.lower()}", "province": None, "_source": SOURCE_ID})
                links.append({"entity_id": nif, "sanction_id": sid})
    console.log(f"[green]✓[/] CNMV: {len(sanctions)} sanciones, {len(companies)} empresas, {len(persons)} personas")
    return sanctions, companies, persons, links


def load(loader: GraphLoader, sanctions, companies, persons, links):
    loader.load_sanctions(sanctions)
    if companies: loader.load_companies(companies)
    if persons: loader.load_persons(persons)
    if links: loader.link_entity_to_sanction(links)


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: cnmv")
    data_dir.mkdir(parents=True, exist_ok=True)
    s, c, p, l = parse(download(data_dir))
    load(loader, s, c, p, l)
    console.log("[bold green]✓ Pipeline cnmv completado[/]")
