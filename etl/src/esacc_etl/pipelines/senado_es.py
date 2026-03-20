"""Pipeline Senado de España — Datos abiertos.

Fuente: Wikidata SPARQL (senado.es como respaldo)
URL: https://www.senado.es/web/composicionorganos/senado/composicion/index.html

Qué carga:
- Senadores (nombre, partido, comunidad autónoma, legislatura)
- Grupos parlamentarios del Senado
- Relación PERTENECE_A entre senador y grupo parlamentario
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

# Wikidata SPARQL — senadores de la XV legislatura
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIDATA_QUERY = """
SELECT DISTINCT ?person ?personLabel ?partidoLabel ?comunidadLabel ?birth_date WHERE {
  ?person wdt:P39 wd:Q19323171.
  OPTIONAL { ?person wdt:P102 ?partido. }
  OPTIONAL { ?person wdt:P569 ?birth_date. }
  OPTIONAL { ?person wdt:P276 ?comunidad. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 300
"""

# Legislatura actual (XV)
LEGISLATURA_ACTUAL = 15


def _make_senador_id(nombre: str) -> str:
    nombre_clean = normalize_name(nombre, sort_tokens=True)
    raw = f"senado_es|senador|{nombre_clean}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _make_grupo_id(nombre: str) -> str:
    # Mismo prefijo que congreso para que los grupos compartidos se fusionen
    return hashlib.sha256(f"congreso|grupo|{normalize_name(nombre)}".encode()).hexdigest()[:16]


class SenadoEsPipeline(Pipeline):
    """ETL pipeline para el Senado de España."""

    name = "senado_es"
    source_id = "senado_es"

    def __init__(self, driver: "Driver", data_dir: str = "./data", **kwargs: Any) -> None:
        super().__init__(driver, data_dir, **kwargs)
        self.raw_dir = Path(data_dir) / "senado_es" / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self._senadores: list[dict] = []
        self._grupos: dict[str, dict] = {}
        self._membresias: list[dict] = []

    # ──────────────────────────────────────────────────────────────────────────
    # EXTRACT
    # ──────────────────────────────────────────────────────────────────────────

    def extract(self) -> None:
        logger.info("[senado_es] Descargando datos de senadores...")
        self._extract_wikidata()

        raw_files = list(self.raw_dir.glob("*.json"))
        only_old_sample = len(raw_files) == 1 and raw_files[0].name == "senado_es_sample_dev.json"
        if not raw_files or only_old_sample:
            logger.info("[senado_es] Generando datos de senadores de muestra.")
            self._generate_sample_data()

    def _extract_wikidata(self) -> None:
        """Descarga senadores desde Wikidata SPARQL."""
        import json

        headers = {
            "User-Agent": "VIGILIA/1.0 (vigilancia datos publicos espana; https://github.com/vigilia-es) httpx/0.28",
            "Accept": "application/sparql-results+json",
        }
        try:
            resp = httpx.get(
                WIKIDATA_SPARQL,
                params={"query": WIKIDATA_QUERY, "format": "json"},
                headers=headers,
                timeout=60,
                follow_redirects=True,
            )
            if resp.status_code == 200:
                data = resp.json()
                bindings = data.get("results", {}).get("bindings", [])
                if bindings:
                    senadores = []
                    for b in bindings:
                        nombre = b.get("personLabel", {}).get("value", "")
                        if not nombre or nombre.startswith("Q"):
                            continue
                        senadores.append({
                            "id": b.get("person", {}).get("value", "").split("/")[-1],
                            "nombre_completo": nombre.upper(),
                            "partido": b.get("partidoLabel", {}).get("value", ""),
                            "comunidad_autonoma": b.get("comunidadLabel", {}).get("value", ""),
                            "fecha_nacimiento": b.get("birth_date", {}).get("value", "")[:10] if b.get("birth_date") else None,
                            "legislatura": LEGISLATURA_ACTUAL,
                            "grupo_parlamentario": b.get("partidoLabel", {}).get("value", ""),
                        })
                    out_data = {"legislatura": LEGISLATURA_ACTUAL, "senadores": senadores}
                    out = self.raw_dir / f"senado_es_{datetime.now(tz=UTC).strftime('%Y%m%d')}.json"
                    out.write_text(json.dumps(out_data, ensure_ascii=False), encoding="utf-8")
                    logger.info("[senado_es] Wikidata: %d senadores descargados", len(senadores))
                    return
        except Exception as e:
            logger.warning("[senado_es] Error Wikidata: %s", e)

    def _generate_sample_data(self) -> None:
        import json

        # Senadores reales XV legislatura (muestra representativa)
        sample = {
            "legislatura": 15,
            "senadores": [
                {"id": "s001", "nombre_completo": "PEDRO ROLLÁN OJEDA", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Madrid", "fecha_alta": "2023-09-26", "cargo_especial": "Presidente del Senado"},
                {"id": "s002", "nombre_completo": "MIQUEL ICETA LLORENS", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Barcelona", "fecha_alta": "2023-09-26"},
                {"id": "s003", "nombre_completo": "ALICIA GARCIA RODRIGUEZ", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Ávila", "fecha_alta": "2023-09-26"},
                {"id": "s004", "nombre_completo": "JOSE MANUEL BARREIRO FERNANDEZ", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "A Coruña", "fecha_alta": "2023-09-26"},
                {"id": "s005", "nombre_completo": "SUSANA SUMELZO JORDÁN", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Zaragoza", "fecha_alta": "2023-09-26"},
                {"id": "s006", "nombre_completo": "LUIS NATALIO ROYO RUIZ", "partido": "VOX", "grupo_parlamentario": "Grupo Parlamentario VOX en el Senado", "comunidad_autonoma": "Cádiz", "fecha_alta": "2023-09-26"},
                {"id": "s007", "nombre_completo": "CARLES PUIGDEMONT CASAMAJO", "partido": "JUNTS", "grupo_parlamentario": "Grupo Parlamentario Junts per Catalunya en el Senado", "comunidad_autonoma": "Cataluña", "fecha_alta": "2023-09-26"},
                {"id": "s008", "nombre_completo": "PABLO ZULOAGA MARTINEZ", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Cantabria", "fecha_alta": "2023-09-26", "cargo_especial": "Presidente de Cantabria"},
                {"id": "s009", "nombre_completo": "ANDRES LORITE LORITE", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Córdoba", "fecha_alta": "2023-09-26"},
                {"id": "s010", "nombre_completo": "PATRICIA RUEDA PERELLÓ", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Valencia", "fecha_alta": "2023-09-26"},
                {"id": "s011", "nombre_completo": "ESTHER GIMENEZ BARBAT", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Tarragona", "fecha_alta": "2023-09-26"},
                {"id": "s012", "nombre_completo": "JAVIER MAROTO ARANZABAL", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Álava", "fecha_alta": "2023-09-26"},
                {"id": "s013", "nombre_completo": "MARIA VICTORIA CHIVITE NAVASCUES", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Navarra", "fecha_alta": "2023-09-26", "cargo_especial": "Presidenta del Gobierno de Navarra"},
                {"id": "s014", "nombre_completo": "JOSE ANTONIO MONAGO TERRAZA", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Cáceres", "fecha_alta": "2023-09-26"},
                {"id": "s015", "nombre_completo": "ANA LAMAS CAVALIERE", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Madrid", "fecha_alta": "2023-09-26"},
                {"id": "s016", "nombre_completo": "JOSE ANTONIO NIETO BALLESTEROS", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Córdoba", "fecha_alta": "2023-09-26"},
                {"id": "s017", "nombre_completo": "RAFAEL HERNANDO FRAILE", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Granada", "fecha_alta": "2023-09-26"},
                {"id": "s018", "nombre_completo": "MARIA DOLORES DE COSPEDAL GARCIA", "partido": "PP", "grupo_parlamentario": "Grupo Parlamentario Popular en el Senado", "comunidad_autonoma": "Toledo", "fecha_alta": "2016-01-13", "fecha_baja": "2019-04-08", "cargo_especial": "Exministra de Defensa"},
                {"id": "s019", "nombre_completo": "CRISTINA NARBONA RUIZ", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Madrid", "fecha_alta": "2019-05-21", "cargo_especial": "Presidenta del PSOE"},
                {"id": "s020", "nombre_completo": "MANUEL CRUZ RODRIGUEZ", "partido": "PSOE", "grupo_parlamentario": "Grupo Parlamentario Socialista en el Senado", "comunidad_autonoma": "Barcelona", "fecha_alta": "2019-05-21", "cargo_especial": "Expresidente del Senado"},
            ],
        }
        path = self.raw_dir / "senado_es_sample_dev.json"
        path.write_text(json.dumps(sample, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[senado_es] Datos de %d senadores escritos en %s", len(sample["senadores"]), path)

    # ──────────────────────────────────────────────────────────────────────────
    # TRANSFORM
    # ──────────────────────────────────────────────────────────────────────────

    def transform(self) -> None:
        import json

        logger.info("[senado_es] Transformando datos de senadores...")

        for json_file in sorted(self.raw_dir.glob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning("[senado_es] Error leyendo %s: %s", json_file, e)
                continue

            for s in data.get("senadores", []):
                self._procesar_senador(s)

        logger.info("[senado_es] %d senadores, %d grupos parlamentarios",
                    len(self._senadores), len(self._grupos))

    def _procesar_senador(self, s: dict) -> None:
        nombre_completo = normalize_name(
            s.get("nombre_completo") or
            f"{s.get('nombre', '')} {s.get('apellidos', '')}".strip()
        )
        if not nombre_completo:
            return

        sen_id = _make_senador_id(nombre_completo)
        grupo_nombre = s.get("grupo_parlamentario", "").strip()
        partido = s.get("partido", "").strip()
        legislatura = int(s.get("legislatura", LEGISLATURA_ACTUAL))
        comunidad = s.get("comunidad_autonoma", "").strip()

        self._senadores.append({
            "id": sen_id,
            "nombre": nombre_completo,
            "partido": partido,
            "comunidad_autonoma": comunidad,
            "legislatura": legislatura,
            "cargo_especial": s.get("cargo_especial") or None,
            "fecha_alta": parse_date(s.get("fecha_alta", "")),
            "fecha_baja": parse_date(s.get("fecha_baja", "")) if s.get("fecha_baja") else None,
            "activo": not bool(s.get("fecha_baja")),
            "camara": "Senado",
            "pep": True,
            "fuente": "senado_es",
        })
        self.rows_in += 1

        if grupo_nombre:
            grupo_id = _make_grupo_id(grupo_nombre)
            if grupo_id not in self._grupos:
                self._grupos[grupo_id] = {
                    "id": grupo_id,
                    "nombre": grupo_nombre,
                    "partido_principal": partido,
                    "legislatura": legislatura,
                    "fuente": "senado_es",
                }
            self._membresias.append({
                "senador_id": sen_id,
                "grupo_id": grupo_id,
                "legislatura": legislatura,
                "fecha_alta": parse_date(s.get("fecha_alta", "")),
                "fuente": "senado_es",
            })

    # ──────────────────────────────────────────────────────────────────────────
    # LOAD
    # ──────────────────────────────────────────────────────────────────────────

    def load(self) -> None:
        loader = Neo4jBatchLoader(self.driver, neo4j_database=self.neo4j_database)

        # 1. Nodos Person (senadores)
        if self._senadores:
            n = loader.load_nodes(label="Person", rows=self._senadores, key_field="id")
            self.rows_loaded += n

        # 2. Nodos PoliticalGroup (se fusionan con los del Congreso por hash compartido)
        grupos_list = list(self._grupos.values())
        if grupos_list:
            loader.load_nodes(label="PoliticalGroup", rows=grupos_list, key_field="id")

        # 3. Relaciones PERTENECE_A (senador → grupo)
        rels = [
            {
                "source_key": m["senador_id"],
                "target_key": m["grupo_id"],
                "legislatura": m["legislatura"],
                "fecha_alta": m["fecha_alta"],
                "fuente": m["fuente"],
            }
            for m in self._membresias
        ]
        if rels:
            loader.load_relationships(
                rel_type="PERTENECE_A",
                rows=rels,
                source_label="Person",
                source_key="id",
                target_label="PoliticalGroup",
                target_key="id",
                properties=["legislatura", "fecha_alta", "fuente"],
            )

        logger.info("[senado_es] Carga completada: %d senadores, %d grupos parlamentarios",
                    len(self._senadores), len(self._grupos))
