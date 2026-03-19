"""Pipeline: PLACE — Plataforma de Contratación del Sector Público.

Source: https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilContratante_ATOM.atom
Fetches public contracts from the ATOM feed and creates Contract + Company + PublicOrgan nodes.
"""

from __future__ import annotations
import hashlib
import httpx
from rich.console import Console
from pathlib import Path
from lxml import etree
from datetime import datetime

from esacc_etl.loader import GraphLoader
from esacc_etl.transforms.normalize import normalize_name, normalize_nif, slugify

console = Console()
SOURCE_ID = "contratos_estado"

# PLACE ATOM feed (public procurement)
PLACE_ATOM_URL = "https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilContratante_ATOM.atom"

# Alternative: SPARQL endpoint or CSV bulk downloads
PLACE_BULK_URL = "https://contrataciondelestado.es/sindicacion/sindicacion_643/PlataformasAgregwordasCSV.zip"

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom",
           "cbc": "urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-1",
           "cac": "urn:dgpe:names:draft:codice:schema:xsd:CommonAggregateComponents-1"}


def download(data_dir: Path, max_pages: int = 5) -> Path:
    """Download PLACE ATOM feed (paginated)."""
    out_dir = data_dir / "contratos"
    out_dir.mkdir(parents=True, exist_ok=True)
    console.log(f"[bold blue]Descargando[/] contratos de PLACE (hasta {max_pages} páginas)")

    url = PLACE_ATOM_URL
    all_entries = []

    for page in range(max_pages):
        try:
            resp = httpx.get(
                url,
                timeout=60,
                follow_redirects=True,
                headers={"User-Agent": "VIGILIA/0.1 (transparency research)"},
            )
            resp.raise_for_status()

            root = etree.fromstring(resp.content)

            entries = root.findall("atom:entry", ATOM_NS)
            all_entries.extend(entries)
            console.log(f"  Página {page + 1}: {len(entries)} entradas")

            # Find next page link
            next_link = root.find("atom:link[@rel='next']", ATOM_NS)
            if next_link is not None:
                url = next_link.get("href")
            else:
                break

        except Exception as e:
            console.log(f"[yellow]⚠[/] Error en página {page + 1}: {e}")
            break

    # Save combined XML
    combined = etree.Element("contracts")
    for entry in all_entries:
        combined.append(entry)

    out_path = out_dir / "contratos_atom.xml"
    etree.ElementTree(combined).write(str(out_path), encoding="utf-8", xml_declaration=True)
    console.log(f"[green]✓[/] {len(all_entries)} entradas guardadas en {out_path}")
    return out_path


def _text(el, path: str, ns: dict) -> str | None:
    """Extract text from XML element by path."""
    found = el.find(path, ns)
    return found.text.strip() if found is not None and found.text else None


def _make_contract_id(title: str, organ: str, date_str: str | None) -> str:
    """Generate deterministic contract ID."""
    raw = f"{title}|{organ}|{date_str or 'nodate'}"
    return f"ct:{hashlib.sha256(raw.encode()).hexdigest()[:16]}"


def parse(file_path: Path) -> tuple[list[dict], list[dict], list[dict], list[dict], list[dict]]:
    """Parse PLACE ATOM entries into contracts, companies, organs, and relationships.

    Returns:
        (contracts, companies, organs, contract_company_links, contract_organ_links)
    """
    contracts = []
    companies = {}
    organs = {}
    ct_company_links = []
    ct_organ_links = []

    tree = etree.parse(str(file_path))
    root = tree.getroot()

    for entry in root:
        # Extract fields from ATOM entry (with CODICE extensions)
        title = _text(entry, "atom:title", ATOM_NS) or _text(entry, "title", {})
        if not title:
            # Try direct child text
            title_el = entry.find("title")
            title = title_el.text if title_el is not None and title_el.text else "Sin título"

        summary = _text(entry, "atom:summary", ATOM_NS) or _text(entry, "summary", {}) or ""

        # Try to extract structured contract data
        amount_str = _text(entry, ".//cbc:TotalAmount", ATOM_NS)
        amount = None
        if amount_str:
            try:
                amount = float(amount_str.replace(",", "."))
            except ValueError:
                pass

        # Award date
        updated = _text(entry, "atom:updated", ATOM_NS) or _text(entry, "updated", {})
        award_date = None
        if updated:
            try:
                award_date = datetime.fromisoformat(updated.replace("Z", "+00:00")).date().isoformat()
            except (ValueError, AttributeError):
                pass

        # Contracting authority
        organ_name = _text(entry, ".//cac:ContractingParty//cbc:Name", ATOM_NS)
        if not organ_name:
            # Try to extract from summary
            if "Órgano" in summary:
                parts = summary.split("Órgano")
                if len(parts) > 1:
                    organ_name = parts[1].split(".")[0].strip(": ")

        organ_name = organ_name or "Organismo no identificado"

        # Procedure type
        procedure = _text(entry, ".//cbc:ProcedureCode", ATOM_NS) or "No especificado"

        # Winner company
        winner_name = _text(entry, ".//cac:WinningParty//cbc:Name", ATOM_NS)
        winner_nif = _text(entry, ".//cac:WinningParty//cbc:TaxID", ATOM_NS)

        if winner_nif:
            winner_nif = normalize_nif(winner_nif)

        # Create contract
        contract_id = _make_contract_id(title or "unknown", organ_name, award_date)
        contracts.append({
            "id": contract_id,
            "title": title or "Sin título",
            "amount": amount,
            "award_date": award_date,
            "procedure_type": procedure,
            "cpv_code": _text(entry, ".//cbc:CPVCode", ATOM_NS),
            "_source": SOURCE_ID,
        })

        # Organ
        organ_id = f"organ:{slugify(organ_name)}"
        if organ_id not in organs:
            organs[organ_id] = {
                "id": organ_id,
                "name": normalize_name(organ_name),
                "level": "estatal",
                "_source": SOURCE_ID,
            }
        ct_organ_links.append({"organ_id": organ_id, "contract_id": contract_id})

        # Winner company
        if winner_nif and winner_name:
            if winner_nif not in companies:
                companies[winner_nif] = {
                    "nif": winner_nif,
                    "name": normalize_name(winner_name),
                    "status": None,
                    "province": None,
                    "_source": SOURCE_ID,
                }
            ct_company_links.append({"contract_id": contract_id, "company_nif": winner_nif})

    console.log(
        f"[green]✓[/] Parseados: {len(contracts)} contratos, "
        f"{len(companies)} empresas, {len(organs)} organismos"
    )
    return contracts, list(companies.values()), list(organs.values()), ct_company_links, ct_organ_links


def load(
    loader: GraphLoader,
    contracts: list[dict],
    companies: list[dict],
    organs: list[dict],
    ct_company_links: list[dict],
    ct_organ_links: list[dict],
):
    """Load parsed data into Neo4j."""
    console.log("[bold blue]Cargando[/] contratos en Neo4j...")

    loader.load_companies(companies)
    loader.load_public_organs(organs)
    loader.load_contracts(contracts)
    loader.link_contract_to_company(ct_company_links)
    loader.link_contract_to_organ(ct_organ_links)

    console.log(
        f"[green]✓[/] Cargados {len(contracts)} contratos, "
        f"{len(companies)} empresas, {len(organs)} organismos"
    )


def run(data_dir: Path, loader: GraphLoader):
    """Execute the full PLACE pipeline: download → parse → load."""
    console.rule(f"[bold]Pipeline: {SOURCE_ID}")
    data_dir.mkdir(parents=True, exist_ok=True)
    file_path = download(data_dir)
    contracts, companies, organs, ct_company_links, ct_organ_links = parse(file_path)
    load(loader, contracts, companies, organs, ct_company_links, ct_organ_links)
    console.log(f"[bold green]✓ Pipeline {SOURCE_ID} completado[/]")
