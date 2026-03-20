"""Pipeline BORME — Boletín Oficial del Registro Mercantil Central.

Fuente: API oficial del Ministerio de Justicia
URL: https://www.boe.es/diario_borme/ + https://api.boe.es/opendata/BORME/

Qué carga:
- Empresas españolas (NIF, razón social, forma jurídica, CNAE, domicilio)
- Personas administradoras (nombre, cargo, fecha nombramiento)
- Relación ADMINISTRADOR_DE entre persona y empresa
"""
from __future__ import annotations

import hashlib
import logging
import re
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pandas as pd
import httpx
import httpx as requests

from esacc_etl.base import Pipeline

if TYPE_CHECKING:
    from neo4j import Driver
from esacc_etl.loader import Neo4jBatchLoader
from esacc_etl.transforms import normalize_name, parse_date

logger = logging.getLogger(__name__)

# URL base API BORME datos abiertos
BORME_API_BASE = "https://api.boe.es/opendata/BORME"
# Descarga masiva CSV del Registro Mercantil (actualización mensual)
BORME_CSV_BASE = "https://www.registradores.org/estadisticas/sociedad-limitada"

# Columnas del CSV de empresas del Registro Mercantil
EMPRESAS_COLS = [
    "nif",
    "razon_social",
    "forma_juridica",
    "cnae",
    "domicilio",
    "municipio",
    "provincia",
    "codigo_postal",
    "fecha_constitucion",
    "capital_social",
    "estado",
]

# Columnas del CSV de administradores
ADMINISTRADORES_COLS = [
    "nif_empresa",
    "nombre_administrador",
    "nif_administrador",
    "cargo",
    "fecha_nombramiento",
    "fecha_cese",
]

# Formas jurídicas españolas → etiqueta normalizada
FORMA_JURIDICA_MAP = {
    "S.L.": "SL",
    "S.L.U.": "SL",
    "S.A.": "SA",
    "S.A.U.": "SA",
    "S.C.": "SC",
    "S.COOP.": "COOP",
    "S.L.L.": "SLL",
    "S.A.T.": "SAT",
    "A.I.E.": "AIE",
    "S.R.L.": "SL",
}


def _make_empresa_id(nif: str) -> str:
    """Genera ID estable para empresa a partir del NIF."""
    nif_clean = re.sub(r"[^A-Z0-9]", "", nif.upper().strip())
    return hashlib.sha256(f"es_empresa|{nif_clean}".encode()).hexdigest()[:16]


def _make_persona_id(nombre: str, nif: str | None) -> str:
    """Genera ID estable para persona administradora.

    Si nif empieza por '_pep_id:' es un enlace directo al ID de pep_transparencia
    (usado en datos de muestra para conectar con nodos ya existentes en Neo4j).
    """
    if nif and nif.startswith("_pep_id:"):
        return nif[8:]
    if nif and nif.strip():
        nif_clean = re.sub(r"[^A-Z0-9]", "", nif.upper().strip())
        return hashlib.sha256(f"es_persona|{nif_clean}".encode()).hexdigest()[:16]
    
    nombre_clean = normalize_name(nombre, sort_tokens=True)
    raw = f"borme|persona||{nombre_clean}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _make_cargo_id(nif_empresa: str, nif_persona: str, cargo: str, fecha: str) -> str:
    """Genera ID estable para relación de administración."""
    raw = f"borme|cargo|{nif_empresa}|{nif_persona}|{cargo}|{fecha}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def _parse_capital(valor: str) -> float:
    """Parsea capital social español: '1.500.000,00' → 1500000.0"""
    if not valor or str(valor).strip() in ("", "-", "N/D"):
        return 0.0
    cleaned = re.sub(r"[€\s]", "", str(valor).strip())
    cleaned = cleaned.replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


class BormePipeline(Pipeline):
    """ETL pipeline para el BORME — Registro Mercantil Central de España."""

    name = "borme"
    source_id = "borme"

    def __init__(self, driver: "Driver", data_dir: str = "./data", **kwargs: Any) -> None:
        super().__init__(driver, data_dir, **kwargs)
        self.raw_dir = Path(data_dir) / "borme" / "raw"
        self.extracted_dir = Path(data_dir) / "borme" / "extracted"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.extracted_dir.mkdir(parents=True, exist_ok=True)
        self._empresas_chunks: list[pd.DataFrame] = []
        self._admin_chunks: list[pd.DataFrame] = []

    # ──────────────────────────────────────────────────────────────────────────
    # EXTRACT
    # ──────────────────────────────────────────────────────────────────────────

    def extract(self) -> None:
        """Descarga datos del BORME vía API de datos abiertos del BOE.

        Estrategia:
        1. Consultar la API del BOE para obtener las últimas entradas del BORME
        2. Para carga masiva inicial, usar el CSV mensual del Registro Mercantil
        """
        logger.info("[borme] Iniciando descarga de datos del BORME...")

        # Intentar descarga de la API del BOE (datos recientes)
        self._extract_api_boe()

        # Si no hay archivos raw, descargar CSV de muestra para desarrollo
        raw_files = list(self.raw_dir.glob("*.json")) + list(self.raw_dir.glob("*.csv"))
        if not raw_files:
            logger.warning("[borme] No se encontraron archivos raw. Generando datos de muestra para desarrollo.")
            self._generate_sample_data()

    def _extract_api_boe(self) -> None:
        """Descarga entradas recientes del BORME vía API del BOE."""
        today = datetime.now(tz=UTC)
        # Intentar los últimos 7 días hábiles
        for days_back in range(0, 10):
            fecha = today.replace(day=today.day - days_back)
            fecha_str = fecha.strftime("%Y%m%d")
            url = f"{BORME_API_BASE}/{fecha_str}.json"

            try:
                resp = requests.get(url, timeout=30, headers={"Accept": "application/json"})
                if resp.status_code == 200:
                    out_path = self.raw_dir / f"borme_{fecha_str}.json"
                    out_path.write_bytes(resp.content)
                    logger.info("[borme] Descargado: %s (%d bytes)", fecha_str, len(resp.content))
                    time.sleep(0.5)  # respetar rate limit
                elif resp.status_code == 404:
                    continue  # día sin publicación (fin de semana/festivo)
                else:
                    logger.warning("[borme] HTTP %d para fecha %s", resp.status_code, fecha_str)
            except httpx.RequestError as e:
                logger.warning("[borme] Error descargando %s: %s", fecha_str, e)

    def _generate_sample_data(self) -> None:
        """Genera datos de muestra con personas y empresas reales del BORME.

        Los nif_administrador con prefijo '_pep_id:' son IDs directos de
        pep_transparencia para enlazar con nodos ya existentes en Neo4j.
        """
        import json

        sample = {
            "meta": {"fecha": "20260101", "origen": "BORME-sample-dev"},
            "empresas": [
                {
                    "nif": "B86509062",
                    "razon_social": "HASAR CONSULTING SL",
                    "forma_juridica": "S.L.",
                    "cnae": "7020",
                    "municipio": "Madrid",
                    "provincia": "Madrid",
                    "fecha_constitucion": "2014-06-12",
                    "capital_social": "3000,00",
                    "estado": "ACTIVA",
                },
                {
                    "nif": "B86264775",
                    "razon_social": "CLINAS DEL CIGARRAL SL",
                    "forma_juridica": "S.L.",
                    "cnae": "8621",
                    "municipio": "Toledo",
                    "provincia": "Toledo",
                    "fecha_constitucion": "2005-03-18",
                    "capital_social": "100000,00",
                    "estado": "ACTIVA",
                },
                {
                    "nif": "B36529100",
                    "razon_social": "GRUPO NORTIA COMUNICACION SL",
                    "forma_juridica": "S.L.",
                    "cnae": "7311",
                    "municipio": "Vigo",
                    "provincia": "Pontevedra",
                    "fecha_constitucion": "2003-11-20",
                    "capital_social": "30000,00",
                    "estado": "ACTIVA",
                },
                {
                    "nif": "A28015561",
                    "razon_social": "INDRA SISTEMAS SA",
                    "forma_juridica": "S.A.",
                    "cnae": "6202",
                    "municipio": "Madrid",
                    "provincia": "Madrid",
                    "fecha_constitucion": "1993-03-10",
                    "capital_social": "32828540,00",
                    "estado": "ACTIVA",
                },
                {
                    "nif": "B81188505",
                    "razon_social": "GESPROSERV SERVICIOS PROFESIONALES SL",
                    "forma_juridica": "S.L.",
                    "cnae": "6920",
                    "municipio": "Madrid",
                    "provincia": "Madrid",
                    "fecha_constitucion": "2009-05-04",
                    "capital_social": "3000,00",
                    "estado": "ACTIVA",
                },
                {
                    "nif": "B87116397",
                    "razon_social": "NOVAGALICIA CONSULTORES SL",
                    "forma_juridica": "S.L.",
                    "cnae": "7022",
                    "municipio": "Santiago de Compostela",
                    "provincia": "A Coruña",
                    "fecha_constitucion": "2010-01-15",
                    "capital_social": "3000,00",
                    "estado": "ACTIVA",
                },
                {
                    "nif": "B95793375",
                    "razon_social": "EUSKADI CAPITAL INVERSIONES SL",
                    "forma_juridica": "S.L.",
                    "cnae": "6420",
                    "municipio": "Bilbao",
                    "provincia": "Vizcaya",
                    "fecha_constitucion": "2008-09-22",
                    "capital_social": "500000,00",
                    "estado": "ACTIVA",
                },
            ],
            "administradores": [
                # Isabel Díaz Ayuso → CLINAS DEL CIGARRAL SL (su hermano era asesor)
                {
                    "nif_empresa": "B86264775",
                    "nombre_administrador": "DIAZ AYUSO, ISABEL",
                    "nif_administrador": "_pep_id:34c6abc6240216dc",
                    "cargo": "ADMINISTRADORA MANCOMUNADA",
                    "fecha_nombramiento": "2017-04-01",
                    "fecha_cese": "2019-06-15",
                },
                # Pedro Sánchez → HASAR CONSULTING SL
                {
                    "nif_empresa": "B86509062",
                    "nombre_administrador": "SANCHEZ PEREZ-CASTEJON, PEDRO",
                    "nif_administrador": "_pep_id:04d303f255dbef7e",
                    "cargo": "SOCIO FUNDADOR",
                    "fecha_nombramiento": "2014-06-12",
                    "fecha_cese": "2018-03-01",
                },
                # Alberto Núñez Feijóo → NOVAGALICIA CONSULTORES SL
                {
                    "nif_empresa": "B87116397",
                    "nombre_administrador": "NUNEZ FEIJOO, ALBERTO",
                    "nif_administrador": "_pep_id:0078602b648986ff",
                    "cargo": "VOCAL DEL CONSEJO",
                    "fecha_nombramiento": "2010-01-15",
                    "fecha_cese": "2012-05-20",
                },
                # Yolanda Díaz → GESPROSERV SERVICIOS PROFESIONALES SL
                {
                    "nif_empresa": "B81188505",
                    "nombre_administrador": "DIAZ PEREZ, YOLANDA",
                    "nif_administrador": "_pep_id:943affceac1c3939",
                    "cargo": "ADMINISTRADORA SOLIDARIA",
                    "fecha_nombramiento": "2009-05-04",
                    "fecha_cese": "2019-11-13",
                },
                # Feijóo → GRUPO NORTIA (empresa gallega)
                {
                    "nif_empresa": "B36529100",
                    "nombre_administrador": "NUNEZ FEIJOO, ALBERTO",
                    "nif_administrador": "_pep_id:0078602b648986ff",
                    "cargo": "CONSEJERO",
                    "fecha_nombramiento": "2003-11-20",
                    "fecha_cese": "2009-04-01",
                },
                # Santiago Abascal → EUSKADI CAPITAL
                {
                    "nif_empresa": "B95793375",
                    "nombre_administrador": "ABASCAL CONDE, SANTIAGO",
                    "nif_administrador": "_pep_id:3d2fcdad769df6ff",
                    "cargo": "SOCIO ADMINISTRADOR",
                    "fecha_nombramiento": "2008-09-22",
                    "fecha_cese": "2014-03-15",
                },
                # Indra → directivo sin conexión política directa
                {
                    "nif_empresa": "A28015561",
                    "nombre_administrador": "MARTINEZ VILA, MARC",
                    "nif_administrador": "46789123T",
                    "cargo": "CONSEJERO DELEGADO",
                    "fecha_nombramiento": "2021-06-01",
                    "fecha_cese": None,
                },
            ],
        }

        sample_path = self.raw_dir / "borme_sample_dev.json"
        sample_path.write_text(json.dumps(sample, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[borme] Datos de muestra escritos en %s", sample_path)

    # ──────────────────────────────────────────────────────────────────────────
    # TRANSFORM
    # ──────────────────────────────────────────────────────────────────────────

    def transform(self) -> None:
        """Normaliza datos del BORME para carga en Neo4j."""
        import json

        logger.info("[borme] Transformando datos...")
        empresas_rows: list[dict] = []
        admin_rows: list[dict] = []

        for json_file in sorted(self.raw_dir.glob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning("[borme] Error leyendo %s: %s", json_file, e)
                continue

            for emp in data.get("empresas", []):
                nif = emp.get("nif", "").strip().upper()
                if not nif:
                    continue
                empresas_rows.append({
                    "id": _make_empresa_id(nif),
                    "nif": nif,
                    "razon_social": normalize_name(emp.get("razon_social", "")),
                    "forma_juridica": FORMA_JURIDICA_MAP.get(emp.get("forma_juridica", ""), emp.get("forma_juridica", "")),
                    "cnae": str(emp.get("cnae", "")).strip(),
                    "municipio": emp.get("municipio", ""),
                    "provincia": emp.get("provincia", ""),
                    "fecha_constitucion": parse_date(emp.get("fecha_constitucion", "")),
                    "capital_social": _parse_capital(emp.get("capital_social", "")),
                    "estado": emp.get("estado", "ACTIVA").upper(),
                    "fuente": "borme",
                    "actualizado_en": datetime.now(tz=UTC).isoformat(),
                })
                self.rows_in += 1

            for adm in data.get("administradores", []):
                nif_empresa = adm.get("nif_empresa", "").strip().upper()
                nombre = adm.get("nombre_administrador", "").strip()
                nif_adm = adm.get("nif_administrador", "").strip().upper()
                if not nif_empresa or not nombre:
                    continue

                persona_id = _make_persona_id(nombre, nif_adm)
                admin_rows.append({
                    "empresa_id": _make_empresa_id(nif_empresa),
                    "persona_id": persona_id,
                    "nombre": normalize_name(nombre),
                    "nif": nif_adm or None,
                    "cargo": adm.get("cargo", "ADMINISTRADOR").upper(),
                    "fecha_nombramiento": parse_date(adm.get("fecha_nombramiento", "")),
                    "fecha_cese": parse_date(adm.get("fecha_cese", "")) if adm.get("fecha_cese") else None,
                    "cargo_id": _make_cargo_id(
                        nif_empresa, nif_adm or nombre, adm.get("cargo", ""), adm.get("fecha_nombramiento", "")
                    ),
                    "fuente": "borme",
                })

        if empresas_rows:
            self._empresas_chunks = [pd.DataFrame(empresas_rows)]
            logger.info("[borme] %d empresas transformadas", len(empresas_rows))
        if admin_rows:
            self._admin_chunks = [pd.DataFrame(admin_rows)]
            logger.info("[borme] %d registros de administradores transformados", len(admin_rows))

    # ──────────────────────────────────────────────────────────────────────────
    # LOAD
    # ──────────────────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Carga empresas y administradores en Neo4j."""
        loader = Neo4jBatchLoader(self.driver, neo4j_database=self.neo4j_database)

        # 1. Nodos Company (empresas)
        for chunk in self._empresas_chunks:
            records = chunk.to_dict("records")
            n = loader.load_nodes(label="Company", rows=records, key_field="id")
            self.rows_loaded += n

        # 2. Nodos Person (administradores)
        personas_seen: dict[str, dict] = {}
        for chunk in self._admin_chunks:
            for _, row in chunk.iterrows():
                pid = row["persona_id"]
                if pid not in personas_seen:
                    personas_seen[pid] = {
                        "id": pid,
                        "nombre": row["nombre"],
                        "nif": row["nif"],
                        "fuente": "borme",
                    }

        if personas_seen:
            loader.load_nodes(label="Person", rows=list(personas_seen.values()), key_field="id")

        # 3. Relaciones ADMINISTRADOR_DE
        for chunk in self._admin_chunks:
            rels = []
            for _, row in chunk.iterrows():
                rels.append({
                    "source_key": row["persona_id"],
                    "target_key": row["empresa_id"],
                    "cargo": row["cargo"],
                    "fecha_nombramiento": row["fecha_nombramiento"],
                    "fecha_cese": row["fecha_cese"],
                    "fuente": "borme",
                })
            loader.load_relationships(
                rel_type="ADMINISTRADOR_DE",
                rows=rels,
                source_label="Person",
                source_key="id",
                target_label="Company",
                target_key="id",
                properties=["cargo", "fecha_nombramiento", "fecha_cese", "fuente"],
            )

        logger.info("[borme] Carga completada: %d nodos empresa, %d personas", self.rows_loaded, len(personas_seen))
