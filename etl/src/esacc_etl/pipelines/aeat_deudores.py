"""Pipeline AEAT — Lista de deudores tributarios.

Fuente: Agencia Estatal de Administración Tributaria
URL: https://sede.agenciatributaria.gob.es/Sede/deudores.html

Qué carga:
- Personas físicas y jurídicas con deudas tributarias > 600.000 €
- Importe de la deuda, año de publicación, tipo de deudor
- Nodo TaxDebt con importe y estado
- Relación TIENE_DEUDA_TRIBUTARIA entre Company/Person y TaxDebt
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

import httpx

from esacc_etl.base import Pipeline

if TYPE_CHECKING:
    from neo4j import Driver
from esacc_etl.loader import Neo4jBatchLoader
from esacc_etl.transforms import normalize_name, parse_date

logger = logging.getLogger(__name__)

# URL base de la lista de deudores AEAT (publicación anual)
AEAT_DEUDORES_BASE = "https://sede.agenciatributaria.gob.es/Sede/deudores.html"
# Formato de descarga directa (CSV/XML cuando disponible)
AEAT_DEUDORES_CSV = "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GN04/deudores_{year}.csv"

UMBRAL_DEUDA = 600_000  # EUR — umbral legal para aparecer en la lista


def _make_deudor_id(nif: str, es_empresa: bool) -> str:
    nif_clean = re.sub(r"[^A-Z0-9]", "", nif.upper().strip())
    prefix = "es_empresa" if es_empresa else "es_persona"
    return hashlib.sha256(f"{prefix}|{nif_clean}".encode()).hexdigest()[:16]


def _make_deuda_id(nif: str, year: int) -> str:
    raw = f"aeat|deuda|{nif}|{year}"
    return hashlib.sha256(raw.encode()).hexdigest()[:20]


class AeatDeudoresPipeline(Pipeline):
    """ETL pipeline para la lista de deudores tributarios de la AEAT."""

    name = "aeat_deudores"
    source_id = "aeat_deudores"

    def __init__(self, driver: "Driver", data_dir: str = "./data", **kwargs: Any) -> None:
        super().__init__(driver, data_dir, **kwargs)
        self.raw_dir = Path(data_dir) / "aeat_deudores" / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self._deudores: list[dict] = []
        self._deudas: list[dict] = []

    # ──────────────────────────────────────────────────────────────────────────
    # EXTRACT
    # ──────────────────────────────────────────────────────────────────────────

    def extract(self) -> None:
        logger.info("[aeat_deudores] Descargando lista de deudores tributarios...")
        self._extract_csv()

        raw_files = list(self.raw_dir.glob("*.csv")) + list(self.raw_dir.glob("*.json"))
        if not raw_files:
            logger.warning("[aeat_deudores] Sin datos raw. Generando muestra de desarrollo.")
            self._generate_sample_data()

    def _extract_csv(self) -> None:
        """Intenta descargar el CSV de deudores del año actual y anterior."""
        current_year = datetime.now(tz=UTC).year
        for year in (current_year, current_year - 1):
            url = AEAT_DEUDORES_CSV.format(year=year)
            try:
                resp = httpx.get(url, timeout=60, follow_redirects=True,
                                 headers={"Accept": "text/csv,text/plain,*/*"})
                if resp.status_code == 200 and len(resp.content) > 1000:
                    out = self.raw_dir / f"aeat_deudores_{year}.csv"
                    out.write_bytes(resp.content)
                    logger.info("[aeat_deudores] CSV descargado: %s (%d bytes)", out.name, len(resp.content))
                    return
                logger.warning("[aeat_deudores] HTTP %d para año %d", resp.status_code, year)
            except httpx.RequestError as e:
                logger.warning("[aeat_deudores] Error descargando año %d: %s", year, e)

    def _generate_sample_data(self) -> None:
        import json

        # Datos de muestra representativos (formato similar al real)
        sample = {
            "año": 2024,
            "deudores": [
                {
                    "nif": "B12300000",
                    "nombre": "INMOBILIARIA EVASION SL",
                    "tipo": "JURIDICA",
                    "importe_deuda": 4532000.00,
                    "tipo_deuda": "IVA e Impuesto de Sociedades",
                    "año_publicacion": 2024,
                    "estado": "PENDIENTE",
                },
                {
                    "nif": "12300000B",
                    "nombre": "MARTINEZ RUIZ, JOSE MARIA",
                    "tipo": "FISICA",
                    "importe_deuda": 1234567.89,
                    "tipo_deuda": "IRPF",
                    "año_publicacion": 2024,
                    "estado": "PENDIENTE",
                },
                {
                    "nif": "A98765000",
                    "nombre": "GRUPO EVASION HOLDING SA",
                    "tipo": "JURIDICA",
                    "importe_deuda": 22800000.00,
                    "tipo_deuda": "Impuesto de Sociedades",
                    "año_publicacion": 2024,
                    "estado": "PENDIENTE",
                },
                {
                    "nif": "B00100200",
                    "nombre": "TRANSPORTES FANTASMA SL",
                    "tipo": "JURIDICA",
                    "importe_deuda": 678000.50,
                    "tipo_deuda": "IVA",
                    "año_publicacion": 2024,
                    "estado": "PENDIENTE",
                },
            ],
        }
        path = self.raw_dir / "aeat_sample_dev.json"
        path.write_text(__import__("json").dumps(sample, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[aeat_deudores] Muestra escrita en %s", path)

    # ──────────────────────────────────────────────────────────────────────────
    # TRANSFORM
    # ──────────────────────────────────────────────────────────────────────────

    def transform(self) -> None:
        import json

        logger.info("[aeat_deudores] Transformando deudores tributarios...")

        # JSON (muestra o descarga estructurada)
        for json_file in sorted(self.raw_dir.glob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning("[aeat_deudores] Error leyendo %s: %s", json_file, e)
                continue
            year = data.get("año", datetime.now(tz=UTC).year)
            for d in data.get("deudores", []):
                self._procesar_deudor(d, year)

        # CSV (formato real AEAT)
        for csv_file in sorted(self.raw_dir.glob("*.csv")):
            try:
                year = self._year_from_filename(csv_file.name)
                self._parse_csv(csv_file, year)
            except Exception as e:
                logger.warning("[aeat_deudores] Error procesando CSV %s: %s", csv_file, e)

        logger.info("[aeat_deudores] %d deudores transformados", len(self._deudores))

    def _year_from_filename(self, name: str) -> int:
        m = re.search(r"(\d{4})", name)
        return int(m.group(1)) if m else datetime.now(tz=UTC).year

    def _procesar_deudor(self, d: dict, year: int) -> None:
        nif = re.sub(r"\s+", "", d.get("nif", "").strip().upper())
        nombre = normalize_name(d.get("nombre", ""))
        if not nif or not nombre:
            return

        importe = float(d.get("importe_deuda", 0) or 0)
        if importe < UMBRAL_DEUDA:
            return  # filtrar registros por debajo del umbral

        tipo = d.get("tipo", "JURIDICA").upper()
        es_empresa = tipo in ("JURIDICA", "EMPRESA", "SOCIEDAD")
        deudor_id = _make_deudor_id(nif, es_empresa)
        deuda_id = _make_deuda_id(nif, year)

        self._deudores.append({
            "id": deudor_id,
            "nif": nif,
            "nombre": nombre,
            "tipo": tipo,
            "es_empresa": es_empresa,
            "fuente": "aeat",
        })
        self._deudas.append({
            "deuda_id": deuda_id,
            "deudor_id": deudor_id,
            "importe": importe,
            "tipo_deuda": d.get("tipo_deuda", "").strip(),
            "año_publicacion": year,
            "estado": d.get("estado", "PENDIENTE").upper(),
            "fuente": "aeat",
        })
        self.rows_in += 1

    def _parse_csv(self, csv_path: Path, year: int) -> None:
        """Parsea el CSV real de la AEAT.

        El CSV real suele tener columnas como:
        NIF/NIE/CIF | NOMBRE/RAZON SOCIAL | IMPORTE (EUR) | TIPO DEUDA
        Separador: ; o ,
        """
        import csv
        import io

        content = csv_path.read_text(encoding="latin-1", errors="replace")
        # Detectar separador
        sep = ";" if content.count(";") > content.count(",") else ","

        reader = csv.DictReader(io.StringIO(content), delimiter=sep)
        count = 0
        for row in reader:
            # Normalizar nombres de columna (el CSV real varía entre ediciones)
            row_norm = {k.strip().upper().replace(" ", "_"): v.strip() for k, v in row.items() if k}

            nif = (row_norm.get("NIF") or row_norm.get("NIE") or
                   row_norm.get("CIF") or row_norm.get("NIF/NIE/CIF", "")).strip()
            nombre = (row_norm.get("NOMBRE") or row_norm.get("RAZON_SOCIAL") or
                      row_norm.get("DENOMINACION", "")).strip()
            importe_str = (row_norm.get("IMPORTE") or row_norm.get("DEUDA") or
                           row_norm.get("IMPORTE_DEUDA", "0")).strip()

            importe_str = re.sub(r"[€\s]", "", importe_str).replace(".", "").replace(",", ".")
            try:
                importe = float(importe_str)
            except ValueError:
                importe = 0.0

            tipo_deuda = (row_norm.get("TIPO_DEUDA") or row_norm.get("CONCEPTO", "")).strip()

            d = {
                "nif": nif,
                "nombre": nombre,
                "tipo": "FISICA" if re.match(r"^\d{8}[A-Z]$", nif.upper()) else "JURIDICA",
                "importe_deuda": importe,
                "tipo_deuda": tipo_deuda,
                "año_publicacion": year,
                "estado": "PENDIENTE",
            }
            self._procesar_deudor(d, year)
            count += 1

        logger.info("[aeat_deudores] CSV: %d filas procesadas de %s", count, csv_path.name)

    # ──────────────────────────────────────────────────────────────────────────
    # LOAD
    # ──────────────────────────────────────────────────────────────────────────

    def load(self) -> None:
        loader = Neo4jBatchLoader(self.driver, neo4j_database=self.neo4j_database)

        empresas = [d for d in self._deudores if d["es_empresa"]]
        personas = [d for d in self._deudores if not d["es_empresa"]]

        if empresas:
            loader.load_nodes(label="Company", rows=empresas, key_field="id")
        if personas:
            loader.load_nodes(label="Person", rows=personas, key_field="id")

        # Nodos TaxDebt
        deuda_records = [
            {
                "id": d["deuda_id"],
                "importe": d["importe"],
                "tipo_deuda": d["tipo_deuda"],
                "año_publicacion": d["año_publicacion"],
                "estado": d["estado"],
                "fuente": d["fuente"],
            }
            for d in self._deudas
        ]
        if deuda_records:
            n = loader.load_nodes(label="TaxDebt", rows=deuda_records, key_field="id")
            self.rows_loaded += n

        # Relaciones TIENE_DEUDA_TRIBUTARIA
        rels = [
            {
                "source_key": d["deudor_id"],
                "target_key": d["deuda_id"],
                "importe": d["importe"],
                "año": d["año_publicacion"],
                "fuente": "aeat",
            }
            for d in self._deudas
        ]
        if rels:
            rels_empresa = [r for r, d in zip(rels, self._deudas)
                            if any(dd["id"] == d["deudor_id"] and dd["es_empresa"]
                                   for dd in self._deudores)]
            rels_persona = [r for r, d in zip(rels, self._deudas)
                            if any(dd["id"] == d["deudor_id"] and not dd["es_empresa"]
                                   for dd in self._deudores)]

            if rels_empresa:
                loader.load_relationships(
                    rel_type="TIENE_DEUDA_TRIBUTARIA",
                    rows=rels_empresa,
                    source_label="Company",
                    source_key="id",
                    target_label="TaxDebt",
                    target_key="id",
                    properties=["importe", "año", "fuente"],
                )
            if rels_persona:
                loader.load_relationships(
                    rel_type="TIENE_DEUDA_TRIBUTARIA",
                    rows=rels_persona,
                    source_label="Person",
                    source_key="id",
                    target_label="TaxDebt",
                    target_key="id",
                    properties=["importe", "año", "fuente"],
                )

        logger.info("[aeat_deudores] Carga completada: %d deudores (%d empresas, %d personas)",
                    len(self._deudores), len(empresas), len(personas))
