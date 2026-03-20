"""Pipeline ROLECE — Registro Oficial de Licitadores inhabilitados.

Fuente: Hacienda / Plataforma de Contratación del Sector Público
URL: https://contrataciondelestado.es/wps/portal/plataforma

Qué carga:
- Empresas y personas inhabilitadas para contratar con el Estado
- Motivo de inhabilitación, fechas, órgano sancionador
- Nodo Sanction con tipo INHABILITACION_CONTRATACION
- Relación INHABILITADA_PARA_CONTRATAR entre Company/Person y Sanction
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

# Feed Atom de inhabilitados del PLACE
ROLECE_ATOM = "https://contrataciondelestado.es/sindicacion/sindicacion_641/inhabilitados.atom"
# Endpoint alternativo de datos abiertos Hacienda
ROLECE_ALT = "https://www.hacienda.gob.es/Documentacion/Publico/ROLECE/inhabilitados.xml"


def _make_inhabilitado_id(nif: str, es_empresa: bool) -> str:
    nif_clean = re.sub(r"[^A-Z0-9]", "", nif.upper().strip())
    prefix = "es_empresa" if es_empresa else "es_persona"
    return hashlib.sha256(f"{prefix}|{nif_clean}".encode()).hexdigest()[:16]


def _make_sancion_id(nif: str, fecha: str, organo: str) -> str:
    raw = f"rolece|sancion|{nif}|{fecha}|{organo}"
    return hashlib.sha256(raw.encode()).hexdigest()[:20]


class RolecePipeline(Pipeline):
    """ETL pipeline para inhabilitados del ROLECE."""

    name = "rolece"
    source_id = "rolece"

    def __init__(self, driver: "Driver", data_dir: str = "./data", **kwargs: Any) -> None:
        super().__init__(driver, data_dir, **kwargs)
        self.raw_dir = Path(data_dir) / "rolece" / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self._inhabilitados: list[dict] = []
        self._sanciones: list[dict] = []

    # ──────────────────────────────────────────────────────────────────────────
    # EXTRACT
    # ──────────────────────────────────────────────────────────────────────────

    def extract(self) -> None:
        logger.info("[rolece] Descargando lista de inhabilitados...")
        self._extract_atom()

        raw_files = list(self.raw_dir.glob("*.xml")) + list(self.raw_dir.glob("*.json"))
        if not raw_files:
            logger.warning("[rolece] Sin datos raw. Generando muestra de desarrollo.")
            self._generate_sample_data()

    def _extract_atom(self) -> None:
        for url in (ROLECE_ATOM, ROLECE_ALT):
            try:
                resp = httpx.get(url, timeout=60,
                                 headers={"Accept": "application/atom+xml,application/xml,*/*"})
                if resp.status_code == 200 and len(resp.content) > 1000:
                    # Validar que es XML real (no página de error HTML)
                    content_type = resp.headers.get("content-type", "")
                    snippet = resp.content[:100].decode("utf-8", errors="ignore").strip()
                    if snippet.startswith("<") and "html" not in snippet.lower()[:30]:
                        fname = f"rolece_{datetime.now(tz=UTC).strftime('%Y%m%d')}.xml"
                        out = self.raw_dir / fname
                        out.write_bytes(resp.content)
                        logger.info("[rolece] Descargado %d bytes → %s", len(resp.content), out)
                        return
                    else:
                        logger.warning("[rolece] Respuesta no es XML válido en %s", url)
                else:
                    logger.warning("[rolece] HTTP %d o respuesta vacía en %s", resp.status_code, url)
            except httpx.RequestError as e:
                logger.warning("[rolece] Error descargando %s: %s", url, e)

    def _generate_sample_data(self) -> None:
        import json

        sample = {
            "inhabilitados": [
                {
                    "nif": "B12345000",
                    "nombre": "CONSTRUCTORA CORRUPTA SL",
                    "tipo": "EMPRESA",
                    "motivo": "Falsedad documental en licitación",
                    "organo_sancionador": "TRIBUNAL ADMINISTRATIVO CENTRAL DE RECURSOS CONTRACTUALES",
                    "fecha_inicio": "2023-06-01",
                    "fecha_fin": "2026-06-01",
                    "expediente_sancion": "TACRC/2023/00456",
                },
                {
                    "nif": "12345000A",
                    "nombre": "LOPEZ GARCIA, ANTONIO",
                    "tipo": "PERSONA",
                    "motivo": "Infracción muy grave en contratación pública",
                    "organo_sancionador": "JUNTA CONSULTIVA DE CONTRATACION ADMINISTRATIVA",
                    "fecha_inicio": "2024-01-15",
                    "fecha_fin": "2027-01-15",
                    "expediente_sancion": "JCCA/2024/00123",
                },
                {
                    "nif": "A87654000",
                    "nombre": "SERVICIOS OPACOS SA",
                    "tipo": "EMPRESA",
                    "motivo": "Incumplimiento grave de contrato",
                    "organo_sancionador": "MINISTERIO DE HACIENDA",
                    "fecha_inicio": "2022-09-10",
                    "fecha_fin": "2025-09-10",
                    "expediente_sancion": "MH/2022/00789",
                },
            ]
        }
        path = self.raw_dir / "rolece_sample_dev.json"
        path.write_text(__import__("json").dumps(sample, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[rolece] Muestra escrita en %s", path)

    # ──────────────────────────────────────────────────────────────────────────
    # TRANSFORM
    # ──────────────────────────────────────────────────────────────────────────

    def transform(self) -> None:
        import json

        logger.info("[rolece] Transformando inhabilitados...")

        for json_file in sorted(self.raw_dir.glob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning("[rolece] Error leyendo %s: %s", json_file, e)
                continue
            for item in data.get("inhabilitados", []):
                self._procesar_inhabilitado(item)

        for xml_file in sorted(self.raw_dir.glob("*.xml")):
            try:
                self._parse_xml(xml_file)
            except Exception as e:
                logger.warning("[rolece] Error procesando XML %s: %s", xml_file, e)

        logger.info("[rolece] %d inhabilitados procesados", len(self._inhabilitados))

    def _procesar_inhabilitado(self, item: dict) -> None:
        nif = re.sub(r"\s+", "", item.get("nif", "").strip().upper())
        nombre = normalize_name(item.get("nombre", ""))
        if not nif or not nombre:
            return

        tipo = item.get("tipo", "EMPRESA").upper()
        es_empresa = tipo in ("EMPRESA", "SOCIEDAD", "COMPANY")

        entidad_id = _make_inhabilitado_id(nif, es_empresa)
        organo = item.get("organo_sancionador", "").strip()
        fecha_inicio = parse_date(item.get("fecha_inicio", ""))
        fecha_fin = parse_date(item.get("fecha_fin", ""))
        sancion_id = _make_sancion_id(nif, fecha_inicio or "", organo)

        tipo = item.get("tipo", "EMPRESA").upper()
        es_empresa = tipo in ("EMPRESA", "SOCIEDAD", "COMPANY")

        self._inhabilitados.append({
            "id": entidad_id,
            "nif": nif,
            "nombre": nombre,
            "tipo": tipo,
            "es_empresa": es_empresa,
            "fuente": "rolece",
        })
        self._sanciones.append({
            "sancion_id": sancion_id,
            "entidad_id": entidad_id,
            "motivo": item.get("motivo", "").strip(),
            "organo_sancionador": organo,
            "expediente": item.get("expediente_sancion", "").strip(),
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
            "activa": self._es_activa(fecha_fin),
            "tipo_sancion": "INHABILITACION_CONTRATACION",
            "fuente": "rolece",
        })
        self.rows_in += 1

    def _es_activa(self, fecha_fin: str | None) -> bool:
        if not fecha_fin:
            return True
        try:
            from datetime import date
            fin = date.fromisoformat(fecha_fin)
            return fin >= datetime.now(tz=UTC).date()
        except ValueError:
            return True

    def _parse_xml(self, xml_path: Path) -> None:
        """Parsea el feed XML/Atom del ROLECE."""
        try:
            import defusedxml.ElementTree as ET
        except ImportError:
            import xml.etree.ElementTree as ET  # type: ignore[no-redef]

        def local(tag: str) -> str:
            return tag.split("}")[-1] if "}" in tag else tag

        tree = ET.parse(str(xml_path))
        root = tree.getroot()

        # Buscar entries Atom
        entries = [el for el in root.iter() if local(el.tag) == "entry"]
        if not entries:
            # Buscar directamente nodos de inhabilitado
            entries = [root]

        count = 0
        for entry in entries:
            all_text: dict[str, str] = {}
            for el in entry.iter():
                lname = local(el.tag)
                if el.text and el.text.strip() and lname not in all_text:
                    all_text[lname] = el.text.strip()

            nif = all_text.get("NIF") or all_text.get("nif") or all_text.get("Nif", "")
            nombre = (all_text.get("Nombre") or all_text.get("nombre") or
                      all_text.get("RazonSocial") or all_text.get("title", ""))
            if not nif or not nombre:
                continue

            item = {
                "nif": nif,
                "nombre": nombre,
                "tipo": all_text.get("Tipo", "EMPRESA"),
                "motivo": all_text.get("Motivo") or all_text.get("DescripcionSancion", ""),
                "organo_sancionador": all_text.get("OrganoSancionador") or all_text.get("Organo", ""),
                "fecha_inicio": all_text.get("FechaInicio") or all_text.get("FechaResolucion", ""),
                "fecha_fin": all_text.get("FechaFin") or all_text.get("FechaFinInhabilitacion", ""),
                "expediente_sancion": all_text.get("Expediente") or all_text.get("NumeroExpediente", ""),
            }
            self._procesar_inhabilitado(item)
            count += 1

        logger.info("[rolece] XML: %d inhabilitados extraídos de %s", count, xml_path.name)

    # ──────────────────────────────────────────────────────────────────────────
    # LOAD
    # ──────────────────────────────────────────────────────────────────────────

    def load(self) -> None:
        loader = Neo4jBatchLoader(self.driver, neo4j_database=self.neo4j_database)

        # Separar empresas y personas
        empresas = [i for i in self._inhabilitados if i["es_empresa"]]
        personas = [i for i in self._inhabilitados if not i["es_empresa"]]

        if empresas:
            loader.load_nodes(label="Company", rows=empresas, key_field="id")
        if personas:
            loader.load_nodes(label="Person", rows=personas, key_field="id")

        # Nodos Sanction
        sancion_records = [
            {
                "id": s["sancion_id"],
                "motivo": s["motivo"],
                "organo_sancionador": s["organo_sancionador"],
                "expediente": s["expediente"],
                "fecha_inicio": s["fecha_inicio"],
                "fecha_fin": s["fecha_fin"],
                "activa": s["activa"],
                "tipo_sancion": s["tipo_sancion"],
                "fuente": s["fuente"],
            }
            for s in self._sanciones
        ]
        if sancion_records:
            n = loader.load_nodes(label="Sanction", rows=sancion_records, key_field="id")
            self.rows_loaded += n

        # Relaciones INHABILITADA_PARA_CONTRATAR
        rels: list[dict] = []
        for s, i in zip(self._sanciones, self._inhabilitados):
            rels.append({
                "source_key": i["id"],
                "target_key": s["sancion_id"],
                "fecha_inicio": s["fecha_inicio"],
                "fecha_fin": s["fecha_fin"],
                "activa": s["activa"],
                "fuente": "rolece",
            })

        if rels:
            # Relaciones desde Company
            rels_empresa = [r for r, i in zip(rels, self._inhabilitados) if i["es_empresa"]]
            rels_persona = [r for r, i in zip(rels, self._inhabilitados) if not i["es_empresa"]]

            if rels_empresa:
                loader.load_relationships(
                    rel_type="INHABILITADA_PARA_CONTRATAR",
                    rows=rels_empresa,
                    source_label="Company",
                    source_key="id",
                    target_label="Sanction",
                    target_key="id",
                    properties=["fecha_inicio", "fecha_fin", "activa", "fuente"],
                )
            if rels_persona:
                loader.load_relationships(
                    rel_type="INHABILITADA_PARA_CONTRATAR",
                    rows=rels_persona,
                    source_label="Person",
                    source_key="id",
                    target_label="Sanction",
                    target_key="id",
                    properties=["fecha_inicio", "fecha_fin", "activa", "fuente"],
                )

        logger.info("[rolece] Carga completada: %d inhabilitados (%d empresas, %d personas)",
                    len(self._inhabilitados), len(empresas), len(personas))
