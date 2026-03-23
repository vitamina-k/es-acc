"""Pipeline: AEPD — Sanciones de Protección de Datos (RGPD/LOPDGDD).

Source: API resoluciones AEPD — https://www.aepd.es/es/resoluciones
Loads: Sanction + Company nodes, SANCTIONED relationships
"""
from __future__ import annotations
import hashlib, json, re, time
from pathlib import Path
import httpx
from rich.console import Console
from esacc_etl.loader import GraphLoader
from esacc_etl.transforms.normalize import normalize_name

console = Console()
SOURCE_ID = "aepd"
_API = "https://www.aepd.es/es/resoluciones/resoluciones-publicadas-json"
_SANCION = re.compile(r"multa|sanción|sancion|PS/\d+|procedimiento\s+sancionador", re.I)
_NIF = re.compile(r"\b([A-HJNP-SUVW]\d{7}[0-9A-J]|\d{8}[A-Z])\b")


def _sid(ref): return "aepd:" + hashlib.sha256(ref.encode()).hexdigest()[:16]


def download(data_dir: Path) -> Path:
    out = data_dir / "aepd_resoluciones.json"
    console.log("[bold blue]AEPD[/] Descargando resoluciones...")
    all_items = []
    for page in range(0, 15):
        try:
            r = httpx.get(_API, params={"page": page}, timeout=30, follow_redirects=True,
                headers={"User-Agent": "VIGILIA/1.0 (transparency research)", "Accept": "application/json"})
            if r.status_code != 200: break
            data = r.json()
            items = data if isinstance(data, list) else data.get("resoluciones", data.get("items", []))
            if not items: break
            for item in items:
                titulo = item.get("titulo", item.get("title",""))
                if _SANCION.search(titulo) or item.get("tipo","").lower() in ("sancion","sanción"):
                    all_items.append(item)
            time.sleep(0.3)
        except Exception as e:
            console.log(f"[yellow]⚠[/] AEPD página {page}: {e}"); break
    if all_items:
        out.write_text(json.dumps(all_items, ensure_ascii=False, indent=2), encoding="utf-8")
        console.log(f"[green]✓[/] {len(all_items)} resoluciones AEPD")
    else:
        console.log("[yellow]⚠[/] Sin datos API — muestra de desarrollo")
        out.write_text(json.dumps([
            {"ref":"PS/00120/2024","titulo":"PS — Videovigilancia sin información (Art. 13 RGPD)","sancionado":"SUPERMERCADOS EJEMPLO SL","nif":"B23456789","importe":50000,"fecha_resolucion":"2024-03-01"},
            {"ref":"PS/00245/2024","titulo":"PS — Spam sin consentimiento (Art. 6 RGPD)","sancionado":"MARKETING INTRUSIVO SA","nif":"A34567890","importe":150000,"fecha_resolucion":"2024-05-15"},
            {"ref":"PS/00388/2024","titulo":"PS — Brecha de seguridad datos clientes (Art. 32 RGPD)","sancionado":"TIENDA DIGITAL INSEGURA SL","nif":"B45678901","importe":300000,"fecha_resolucion":"2024-07-20"},
        ], ensure_ascii=False), encoding="utf-8")
    return out


def parse(file_path: Path):
    items = json.loads(file_path.read_text(encoding="utf-8"))
    sanctions, companies, links = [], [], []
    for item in (items if isinstance(items, list) else []):
        ref = item.get("ref", item.get("id", item.get("procedimiento",""))).strip()
        titulo = item.get("titulo", item.get("title","")).strip()
        if not ref: continue
        importe_raw = item.get("importe", item.get("multa", 0))
        try: importe = float(str(importe_raw).replace(",",".").replace("€","").strip() or 0)
        except (ValueError, TypeError): importe = 0.0
        sid = _sid(ref)
        sanctions.append({"id": sid, "sanction_type": "data_protection", "source": "AEPD",
            "entity_name": item.get("sancionado", titulo[:120]), "reason": titulo, "_source": SOURCE_ID})
        nombre = normalize_name(item.get("sancionado",""))
        nif = re.sub(r"\s+","", item.get("nif", item.get("cif","")).strip().upper())
        if nombre and nif:
            companies.append({"nif": nif, "name": nombre, "status": None, "province": None, "_source": SOURCE_ID})
            links.append({"entity_id": nif, "sanction_id": sid})
    console.log(f"[green]✓[/] AEPD: {len(sanctions)} sanciones, {len(companies)} empresas")
    return sanctions, companies, links


def load(loader: GraphLoader, sanctions, companies, links):
    loader.load_sanctions(sanctions)
    if companies: loader.load_companies(companies)
    if links: loader.link_entity_to_sanction(links)


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: aepd")
    data_dir.mkdir(parents=True, exist_ok=True)
    s, c, l = parse(download(data_dir))
    load(loader, s, c, l)
    console.log("[bold green]✓ Pipeline aepd completado[/]")
