"""Pipeline: Registro Público Concursal — Concursos de acreedores.

Source: BOE API — concursos publicados (últimos 180 días)
        https://api.boe.es/opendata/BOE/sumario/YYYYMMDD
Loads: TaxDebt nodes (tipo=insolvencia), Company nodes, HAS_DEBT relationships
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
SOURCE_ID = "registro_concursal"
_BOE = "https://api.boe.es/opendata/BOE/sumario"
_CONCURSO = re.compile(r"concurso\s+de\s+acreedores|auto\s+declarando\s+concurso|procedimiento\s+concursal|liquidaci[oó]n\s+concursal|convenio\s+concursal|segunda\s+oportunidad", re.I)
_NIF = re.compile(r"\b([A-HJNP-SUVW]\d{7}[0-9A-J]|\d{8}[A-Z])\b")
_NOMBRE = re.compile(r"(?:sociedad|empresa|entidad)[\s:]+([A-ZÁÉÍÓÚÑ][^,\.;]{3,60}(?:S\.?L\.?|S\.?A\.?|S\.?L\.?U\.?|COOPERATIVA)?)", re.I)


def _did(ref): return "concursal:" + hashlib.sha256(ref.encode()).hexdigest()[:16]


def download(data_dir: Path) -> Path:
    out = data_dir / "concursal_boe.json"
    console.log("[bold blue]Concursal[/] Descargando concursos del BOE (180 días)...")
    today, results = datetime.now(tz=UTC), []
    for d in range(0, 180, 2):
        date = today - timedelta(days=d)
        try:
            r = httpx.get(f"{_BOE}/{date.strftime('%Y%m%d')}", timeout=20, headers={"Accept": "application/json"})
            if r.status_code != 200: continue
            data = r.json()
            diarios = data.get("data",{}).get("sumario",{}).get("diario",{})
            if isinstance(diarios, dict): diarios = [diarios]
            for diario in (diarios if isinstance(diarios, list) else []):
                for sec in diario.get("secciones",{}).get("seccion",[]):
                    depts = sec.get("departamento",[])
                    if isinstance(depts, dict): depts = [depts]
                    for dept in depts:
                        items = dept.get("item",[])
                        if isinstance(items, dict): items = [items]
                        for item in items:
                            t = item.get("titulo","")
                            if _CONCURSO.search(t):
                                entry = {"id": item.get("identificador",""), "titulo": t,
                                    "departamento": dept.get("@nombre",""), "fecha": date.strftime("%Y-%m-%d"),
                                    "url": item.get("urlPdf",{}).get("#text","")}
                                mn = _NIF.search(t)
                                if mn: entry["nif"] = mn.group(1)
                                mb = _NOMBRE.search(t)
                                if mb: entry["nombre"] = mb.group(1).strip()
                                results.append(entry)
            time.sleep(0.25)
        except Exception as e:
            console.log(f"[yellow]⚠[/] BOE {date.strftime('%Y%m%d')}: {e}")
    if results:
        out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        console.log(f"[green]✓[/] {len(results)} concursos de acreedores")
    else:
        console.log("[yellow]⚠[/] Sin datos BOE — muestra de desarrollo")
        out.write_text(json.dumps([
            {"id":"BOE-B-2024-10001","titulo":"Auto de declaración de concurso de acreedores de CONSTRUCCIONES FALLIDAS SL (B12345678)","departamento":"Juzgado Mercantil nº1 Madrid","fecha":"2024-03-10","nif":"B12345678","nombre":"CONSTRUCCIONES FALLIDAS SL"},
            {"id":"BOE-B-2024-10002","titulo":"Auto de apertura de liquidación concursal — HOSTELERÍA EJEMPLO SA","departamento":"Juzgado Mercantil nº2 Barcelona","fecha":"2024-05-22","nif":"A98765432","nombre":"HOSTELERÍA EJEMPLO SA"},
        ], ensure_ascii=False), encoding="utf-8")
    return out


def parse(file_path: Path):
    items = json.loads(file_path.read_text(encoding="utf-8"))
    debts, companies, links = [], [], []
    for item in (items if isinstance(items, list) else []):
        ref, titulo = item.get("id","").strip(), item.get("titulo","").strip()
        if not ref or not titulo: continue
        fase = "liquidacion" if "liquidaci" in titulo.lower() else "declaracion" if "declaraci" in titulo.lower() else "convenio"
        did = _did(ref)
        debts.append({"id": did, "debtor_name": item.get("nombre", titulo[:100]), "nif": item.get("nif",""),
            "amount": 0.0, "year": item.get("fecha","")[:4], "_source": SOURCE_ID,
            "tipo": "concurso_acreedores", "fase": fase, "juzgado": item.get("departamento","")})
        nombre = normalize_name(item.get("nombre",""))
        nif = re.sub(r"\s+","", item.get("nif","").strip().upper())
        if nif:
            companies.append({"nif": nif, "name": nombre or nif, "status": f"concurso_{fase}", "province": None, "_source": SOURCE_ID})
            links.append({"company_nif": nif, "debt_id": did})
    console.log(f"[green]✓[/] Concursal: {len(debts)} concursos, {len(companies)} empresas")
    return debts, companies, links


def load(loader: GraphLoader, debts, companies, links):
    loader.load_tax_debts(debts)
    if companies: loader.load_companies(companies)
    if links: loader.link_company_to_debt(links)


def run(data_dir: Path, loader: GraphLoader):
    console.rule("[bold]Pipeline: registro_concursal")
    data_dir.mkdir(parents=True, exist_ok=True)
    d, c, l = parse(download(data_dir))
    load(loader, d, c, l)
    console.log("[bold green]✓ Pipeline registro_concursal completado[/]")
