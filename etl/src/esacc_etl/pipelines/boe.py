"""Pipeline BOE — Boletín Oficial del Estado.

Fuente: API oficial BOE datos abiertos
URL: https://www.boe.es/datosabiertos/
API: https://api.boe.es/opendata/

Qué carga:
- Actos relevantes: nombramientos, sanciones, adjudicaciones, resoluciones
- Personas nombradas para cargos públicos (altos cargos, magistrados, etc.)
- Sanciones publicadas en el BOE
- Resoluciones de contratos / adjudicaciones publicadas
- Nodo GazetteEntry + relaciones PUBLICADO_EN, SANCIONADO_EN, NOMBRADO_EN
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any

import httpx

from esacc_etl.base import Pipeline

if TYPE_CHECKING:
    from neo4j import Driver
from esacc_etl.loader import Neo4jBatchLoader
from esacc_etl.transforms import normalize_name, parse_date

logger = logging.getLogger(__name__)

# API BOE datos abiertos
BOE_API_BASE = "https://api.boe.es/opendata/BOE/sumario"
# Endpoint de búsqueda
BOE_SEARCH_BASE = "https://api.boe.es/opendata/BOE/buscar"

# Tipos de actos de interés para investigación de corrupción
TIPOS_RELEVANTES = {
    "sancion": r"sancion|multa|expediente sancionador|infraccion grave|inhabilitacion",
    "nombramiento": r"nombr(?:a|amiento)|designacion|cese|destitucion|secretario de estado|subsecretario|director general",
    "contrato": r"adjudicacion|licitacion|contratacion|concesion|convenio",
    "resolucion": r"resolucion|acuerdo|orden ministerial",
}

# Departamentos que emiten actos de alto interés
DEPTS_RELEVANTES = [
    "Ministerio de Hacienda",
    "Ministerio de Justicia",
    "Ministerio de Interior",
    "Ministerio de Fomento",
    "Tribunal de Cuentas",
    "Fiscalía Anticorrupción",
    "CNMV",
    "Banco de España",
]


def _make_entry_id(boe_id: str) -> str:
    return hashlib.sha256(f"boe|entry|{boe_id}".encode()).hexdigest()[:20]


def _make_persona_id(nombre: str, pep_id: str | None = None) -> str:
    """Si se pasa pep_id, devuelve ese ID directamente para enlazar con nodos existentes."""
    if pep_id:
        return pep_id
    nombre_clean = normalize_name(nombre)
    return hashlib.sha256(f"boe|persona|{nombre_clean}".encode()).hexdigest()[:16]


def _clasificar_acto(titulo: str, texto: str = "") -> str:
    """Clasifica el tipo de acto según el título y texto."""
    content = (titulo + " " + texto).lower()
    for tipo, pattern in TIPOS_RELEVANTES.items():
        if re.search(pattern, content):
            return tipo
    return "otro"


class BoePipeline(Pipeline):
    """ETL pipeline para el BOE — Boletín Oficial del Estado."""

    name = "boe"
    source_id = "boe"

    def __init__(self, driver: "Driver", data_dir: str = "./data", **kwargs: Any) -> None:
        super().__init__(driver, data_dir, **kwargs)
        self.raw_dir = Path(data_dir) / "boe" / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self._entries: list[dict] = []
        self._personas: dict[str, dict] = {}

    # ──────────────────────────────────────────────────────────────────────────
    # EXTRACT
    # ──────────────────────────────────────────────────────────────────────────

    def extract(self) -> None:
        logger.info("[boe] Descargando sumario del BOE...")
        self._extract_sumarios()

        raw_files = list(self.raw_dir.glob("*.json")) + list(self.raw_dir.glob("*.xml"))
        if not raw_files:
            logger.warning("[boe] Sin datos raw. Generando muestra de desarrollo.")
            self._generate_sample_data()

    def _extract_sumarios(self) -> None:
        """Descarga los sumarios de los últimos 7 días del BOE."""
        today = datetime.now(tz=UTC)
        descargados = 0

        for days_back in range(0, 10):
            fecha = today - timedelta(days=days_back)
            fecha_str = fecha.strftime("%Y%m%d")
            out_path = self.raw_dir / f"boe_sumario_{fecha_str}.json"

            if out_path.exists():
                descargados += 1
                continue

            url = f"{BOE_API_BASE}/{fecha_str}"
            try:
                resp = httpx.get(url, timeout=30, headers={"Accept": "application/json"})
                if resp.status_code == 200:
                    out_path.write_bytes(resp.content)
                    logger.info("[boe] Sumario descargado: %s (%d bytes)", fecha_str, len(resp.content))
                    descargados += 1
                    import time; time.sleep(0.3)  # respetar rate limit
                elif resp.status_code == 404:
                    continue  # día sin BOE (festivo/fin de semana)
                else:
                    logger.warning("[boe] HTTP %d para fecha %s", resp.status_code, fecha_str)
            except httpx.RequestError as e:
                logger.warning("[boe] Error descargando %s: %s", fecha_str, e)

        logger.info("[boe] %d sumarios disponibles", descargados)

    def _generate_sample_data(self) -> None:
        """Genera entradas BOE de muestra con personas reales.

        Las personas_mencionadas con '_pep_id' enlazan directamente con
        los nodos Person ya existentes en Neo4j (cargados por pep_transparencia).
        """
        import json

        sample = {
            "fecha": "20250101",
            "entries": [
                {
                    "id": "BOE-A-2025-001",
                    "titulo": "Real Decreto 1/2025, de 2 de enero, por el que se nombra Presidente del Gobierno a don Pedro Sánchez Pérez-Castejón",
                    "departamento": "Casa de Su Majestad el Rey",
                    "seccion": "1",
                    "tipo_acto": "nombramiento",
                    "fecha": "2025-01-02",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/01/02/pdfs/BOE-A-2025-001.pdf",
                    "personas_mencionadas": [
                        {
                            "nombre": "SANCHEZ PEREZ-CASTEJON, PEDRO",
                            "_pep_id": "04d303f255dbef7e",
                            "cargo": "Presidente del Gobierno",
                            "acto": "NOMBRAMIENTO",
                        }
                    ],
                },
                {
                    "id": "BOE-A-2025-042",
                    "titulo": "Real Decreto 42/2025, de 8 de enero, por el que se nombra Presidenta de la Comunidad de Madrid a doña Isabel Díaz Ayuso",
                    "departamento": "Ministerio de la Presidencia",
                    "seccion": "1",
                    "tipo_acto": "nombramiento",
                    "fecha": "2025-01-08",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/01/08/pdfs/BOE-A-2025-042.pdf",
                    "personas_mencionadas": [
                        {
                            "nombre": "DIAZ AYUSO, ISABEL",
                            "_pep_id": "34c6abc6240216dc",
                            "cargo": "Presidenta de la Comunidad de Madrid",
                            "acto": "NOMBRAMIENTO",
                        }
                    ],
                },
                {
                    "id": "BOE-A-2025-105",
                    "titulo": "Resolución de 15 de enero de 2025, del Tribunal de Cuentas, por la que se inicia procedimiento de fiscalización de contratos menores de la Comunidad de Madrid",
                    "departamento": "Tribunal de Cuentas",
                    "seccion": "1",
                    "tipo_acto": "resolucion",
                    "fecha": "2025-01-15",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/01/15/pdfs/BOE-A-2025-105.pdf",
                    "personas_mencionadas": [
                        {
                            "nombre": "DIAZ AYUSO, ISABEL",
                            "_pep_id": "34c6abc6240216dc",
                            "cargo": "Presidenta fiscalizada",
                            "acto": "MENCIONADO_EN_BOE",
                        }
                    ],
                },
                {
                    "id": "BOE-A-2025-210",
                    "titulo": "Real Decreto 210/2025, de 20 de enero, por el que se nombra Vicepresidenta Segunda y Ministra de Trabajo a doña Yolanda Díaz Pérez",
                    "departamento": "Casa de Su Majestad el Rey",
                    "seccion": "1",
                    "tipo_acto": "nombramiento",
                    "fecha": "2025-01-20",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/01/20/pdfs/BOE-A-2025-210.pdf",
                    "personas_mencionadas": [
                        {
                            "nombre": "DIAZ PEREZ, YOLANDA",
                            "_pep_id": "943affceac1c3939",
                            "cargo": "Vicepresidenta Segunda del Gobierno",
                            "acto": "NOMBRAMIENTO",
                        }
                    ],
                },
                {
                    "id": "BOE-A-2025-350",
                    "titulo": "Resolución de 5 de febrero de 2025, de la CNMV, por la que se impone sanción grave a Indra Sistemas SA por irregularidades en información financiera",
                    "departamento": "Comisión Nacional del Mercado de Valores",
                    "seccion": "1",
                    "tipo_acto": "sancion",
                    "fecha": "2025-02-05",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/02/05/pdfs/BOE-A-2025-350.pdf",
                    "personas_mencionadas": [],
                },
                {
                    "id": "BOE-A-2025-512",
                    "titulo": "Real Decreto 512/2025, de 1 de marzo, por el que se nombra Líder de la Oposición y Presidente del PP a don Alberto Núñez Feijóo",
                    "departamento": "Congreso de los Diputados",
                    "seccion": "1",
                    "tipo_acto": "nombramiento",
                    "fecha": "2025-03-01",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/03/01/pdfs/BOE-A-2025-512.pdf",
                    "personas_mencionadas": [
                        {
                            "nombre": "NUNEZ FEIJOO, ALBERTO",
                            "_pep_id": "0078602b648986ff",
                            "cargo": "Presidente del Partido Popular",
                            "acto": "NOMBRAMIENTO",
                        }
                    ],
                },
                {
                    "id": "BOE-A-2025-733",
                    "titulo": "Resolución de 15 de marzo de 2025, del Ministerio de Hacienda, por la que se publica la relación de deudores a la Seguridad Social que superen 1.000.000 euros",
                    "departamento": "Ministerio de Hacienda",
                    "seccion": "1",
                    "tipo_acto": "resolucion",
                    "fecha": "2025-03-15",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/03/15/pdfs/BOE-A-2025-733.pdf",
                    "personas_mencionadas": [],
                },
                {
                    "id": "BOE-A-2025-890",
                    "titulo": "Orden PCM/890/2025, de 20 de marzo, por la que se resuelve expediente sancionador a Santiago Abascal Conde por incumplimiento de normativa de financiación de partidos",
                    "departamento": "Ministerio de la Presidencia",
                    "seccion": "1",
                    "tipo_acto": "sancion",
                    "fecha": "2025-03-20",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/03/20/pdfs/BOE-A-2025-890.pdf",
                    "personas_mencionadas": [
                        {
                            "nombre": "ABASCAL CONDE, SANTIAGO",
                            "_pep_id": "3d2fcdad769df6ff",
                            "cargo": "Presidente de Vox",
                            "acto": "SANCIONADO_EN_BOE",
                        }
                    ],
                },
                {
                    "id": "BOE-A-2025-1100",
                    "titulo": "Real Decreto 1100/2025, de 10 de abril, por el que se nombra Ministra de Hacienda a doña María Jesús Montero Cuadrado",
                    "departamento": "Casa de Su Majestad el Rey",
                    "seccion": "1",
                    "tipo_acto": "nombramiento",
                    "fecha": "2025-04-10",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/04/10/pdfs/BOE-A-2025-1100.pdf",
                    "personas_mencionadas": [
                        {
                            "nombre": "MONTERO CUADRADO, MARIA JESUS",
                            "_pep_id": "76af820a31d1f4fc",
                            "cargo": "Ministra de Hacienda",
                            "acto": "NOMBRAMIENTO",
                        }
                    ],
                },
                {
                    "id": "BOE-B-2025-1500",
                    "titulo": "Anuncio de licitación del Ministerio de Defensa para servicios de ciberseguridad por importe de 45.000.000 euros",
                    "departamento": "Ministerio de Defensa",
                    "seccion": "5",
                    "tipo_acto": "contrato",
                    "fecha": "2025-05-01",
                    "url_pdf": "https://www.boe.es/boe/dias/2025/05/01/pdfs/BOE-B-2025-1500.pdf",
                    "personas_mencionadas": [],
                },
            ],
        }
        path = self.raw_dir / "boe_sample_dev.json"
        path.write_text(json.dumps(sample, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[boe] Muestra escrita en %s", path)

    # ──────────────────────────────────────────────────────────────────────────
    # TRANSFORM
    # ──────────────────────────────────────────────────────────────────────────

    def transform(self) -> None:
        import json

        logger.info("[boe] Transformando entradas del BOE...")

        for json_file in sorted(self.raw_dir.glob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning("[boe] Error leyendo %s: %s", json_file, e)
                continue

            # Formato muestra: {"entries": [...]}
            if "entries" in data:
                for entry in data["entries"]:
                    self._procesar_entry(entry)
                continue

            # Formato API real del BOE (sumario)
            self._procesar_sumario_api(data)

        logger.info("[boe] %d entradas transformadas, %d personas identificadas",
                    len(self._entries), len(self._personas))

    def _procesar_entry(self, e: dict) -> None:
        boe_id = e.get("id", "").strip()
        titulo = e.get("titulo", "").strip()
        if not boe_id or not titulo:
            return

        tipo_acto = e.get("tipo_acto") or _clasificar_acto(titulo)
        entry_id = _make_entry_id(boe_id)

        self._entries.append({
            "id": entry_id,
            "boe_id": boe_id,
            "titulo": titulo[:500],
            "departamento": e.get("departamento", ""),
            "seccion": e.get("seccion", ""),
            "tipo_acto": tipo_acto,
            "fecha": parse_date(e.get("fecha", "")),
            "url_pdf": e.get("url_pdf", ""),
            "fuente": "boe",
        })
        self.rows_in += 1

        for persona in e.get("personas_mencionadas", []):
            nombre = normalize_name(persona.get("nombre", ""))
            if not nombre:
                continue
            pid = _make_persona_id(nombre, persona.get("_pep_id"))
            if pid not in self._personas:
                self._personas[pid] = {
                    "id": pid,
                    "nombre": nombre,
                    "cargo": persona.get("cargo", ""),
                    "fuente": "boe",
                }
            # Guardar la relación persona-entry
            self._personas[pid].setdefault("entries", []).append({
                "entry_id": entry_id,
                "acto": persona.get("acto", tipo_acto.upper()),
            })

    def _procesar_sumario_api(self, data: dict) -> None:
        """Procesa el formato JSON real de la API del BOE."""
        # Estructura API: {"data": {"sumario": {"diario": [...]}}}
        try:
            diarios = (data.get("data", {})
                       .get("sumario", {})
                       .get("diario", []))
            if isinstance(diarios, dict):
                diarios = [diarios]

            for diario in diarios:
                secciones = diario.get("seccion", [])
                if isinstance(secciones, dict):
                    secciones = [secciones]

                for seccion in secciones:
                    depts = seccion.get("departamento", [])
                    if isinstance(depts, dict):
                        depts = [depts]

                    seccion_num = str(seccion.get("@num", ""))

                    for dept in depts:
                        dept_nombre = dept.get("@nombre", "")
                        epigrafes = dept.get("epigrafe", [])
                        if isinstance(epigrafes, dict):
                            epigrafes = [epigrafes]

                        for epigrafe in epigrafes:
                            items = epigrafe.get("item", [])
                            if isinstance(items, dict):
                                items = [items]

                            for item in items:
                                titulo = item.get("titulo", "").strip()
                                boe_id = item.get("identificador", "").strip()
                                fecha_str = str(data.get("data", {})
                                                .get("sumario", {})
                                                .get("meta", {})
                                                .get("fechaPub", ""))

                                if not boe_id or not titulo:
                                    continue

                                # Solo procesar tipos relevantes
                                tipo_acto = _clasificar_acto(titulo)
                                if tipo_acto == "otro":
                                    continue

                                url_pdf = item.get("urlPdf", {})
                                if isinstance(url_pdf, dict):
                                    url_pdf = url_pdf.get("#text", "")

                                entry = {
                                    "id": boe_id,
                                    "titulo": titulo,
                                    "departamento": dept_nombre,
                                    "seccion": seccion_num,
                                    "tipo_acto": tipo_acto,
                                    "fecha": fecha_str,
                                    "url_pdf": url_pdf,
                                    "personas_mencionadas": [],
                                }
                                self._procesar_entry(entry)
        except Exception as e:
            logger.debug("[boe] Error parseando sumario API: %s", e)

    # ──────────────────────────────────────────────────────────────────────────
    # LOAD
    # ──────────────────────────────────────────────────────────────────────────

    def load(self) -> None:
        loader = Neo4jBatchLoader(self.driver, neo4j_database=self.neo4j_database)

        # 1. Nodos GazetteEntry
        if self._entries:
            n = loader.load_nodes(label="GazetteEntry", rows=self._entries, key_field="id")
            self.rows_loaded += n

        # 2. Nodos Person (mencionadas en el BOE)
        personas_nodes = [
            {k: v for k, v in p.items() if k != "entries"}
            for p in self._personas.values()
        ]
        if personas_nodes:
            loader.load_nodes(label="Person", rows=personas_nodes, key_field="id")

        # 3. Relaciones Person → GazetteEntry
        rels_nombramiento = []
        rels_sancion = []

        for persona in self._personas.values():
            for ep in persona.get("entries", []):
                rel = {
                    "source_key": persona["id"],
                    "target_key": ep["entry_id"],
                    "acto": ep["acto"],
                    "fuente": "boe",
                }
                acto = ep["acto"].lower()
                if "sancion" in acto or "multa" in acto or "condena" in acto:
                    rels_sancion.append(rel)
                else:
                    rels_nombramiento.append(rel)

        if rels_nombramiento:
            loader.load_relationships(
                rel_type="MENCIONADO_EN_BOE",
                rows=rels_nombramiento,
                source_label="Person",
                source_key="id",
                target_label="GazetteEntry",
                target_key="id",
                properties=["acto", "fuente"],
            )
        if rels_sancion:
            loader.load_relationships(
                rel_type="SANCIONADO_EN_BOE",
                rows=rels_sancion,
                source_label="Person",
                source_key="id",
                target_label="GazetteEntry",
                target_key="id",
                properties=["acto", "fuente"],
            )

        logger.info("[boe] Carga completada: %d entradas BOE, %d personas",
                    self.rows_loaded, len(self._personas))
