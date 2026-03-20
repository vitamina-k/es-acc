"""Pipeline Eurodiputados Españoles — Parlamento Europeo.

Fuente: Wikidata SPARQL
URL: https://www.europarl.europa.eu/

Qué carga:
- Eurodiputados españoles (nombre, partido, grupo europeo, legislatura 10ª)
- Grupos políticos europeos
- Relación PERTENECE_A entre eurodiputado y grupo político
"""
from __future__ import annotations

import hashlib
import json
import logging
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

# Wikidata SPARQL — eurodiputados españoles legislatura 2024-2029 (10ª)
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
WIKIDATA_QUERY = """
SELECT DISTINCT ?person ?personLabel ?partidoLabel ?grupoLabel ?birth_date WHERE {
  ?person p:P39 ?statement.
  ?statement ps:P39 wd:Q27169.
  ?statement pq:P2937 wd:Q112567597.
  ?person wdt:P27 wd:Q29.
  OPTIONAL { ?person wdt:P102 ?partido. }
  OPTIONAL { ?statement pq:P4100 ?grupo. }
  OPTIONAL { ?person wdt:P569 ?birth_date. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
LIMIT 100
"""

# Legislatura actual del Parlamento Europeo (10ª, 2024-2029)
LEGISLATURA_ACTUAL = 10


def _make_eurodiputado_id(nombre: str) -> str:
    nombre_clean = normalize_name(nombre, sort_tokens=True)
    raw = f"eurodiputados_es|eurodiputado|{nombre_clean}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _make_grupo_europeo_id(nombre: str) -> str:
    raw = f"eurodiputados_es|grupo|{normalize_name(nombre)}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


class EurodiputadosEsPipeline(Pipeline):
    """ETL pipeline para los eurodiputados españoles."""

    name = "eurodiputados_es"
    source_id = "eurodiputados_es"

    def __init__(self, driver: "Driver", data_dir: str = "./data", **kwargs: Any) -> None:
        super().__init__(driver, data_dir, **kwargs)
        self.raw_dir = Path(data_dir) / "eurodiputados_es" / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self._eurodiputados: list[dict] = []
        self._grupos: dict[str, dict] = {}
        self._membresias: list[dict] = []

    # ──────────────────────────────────────────────────────────────────────────
    # EXTRACT
    # ──────────────────────────────────────────────────────────────────────────

    def extract(self) -> None:
        logger.info("[eurodiputados_es] Descargando datos de eurodiputados...")
        self._extract_wikidata()

        raw_files = list(self.raw_dir.glob("*.json"))
        only_old_sample = len(raw_files) == 1 and raw_files[0].name == "eurodiputados_es_sample_dev.json"
        if not raw_files or only_old_sample:
            logger.info("[eurodiputados_es] Generando datos de eurodiputados de muestra.")
            self._generate_sample_data()

    def _extract_wikidata(self) -> None:
        """Descarga eurodiputados españoles desde Wikidata SPARQL."""
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
                    eurodiputados = []
                    for b in bindings:
                        nombre = b.get("personLabel", {}).get("value", "")
                        if not nombre or nombre.startswith("Q"):
                            continue
                        eurodiputados.append({
                            "id": b.get("person", {}).get("value", "").split("/")[-1],
                            "nombre_completo": nombre.upper(),
                            "partido": b.get("partidoLabel", {}).get("value", ""),
                            "grupo_europeo": b.get("grupoLabel", {}).get("value", ""),
                            "fecha_nacimiento": b.get("birth_date", {}).get("value", "")[:10] if b.get("birth_date") else None,
                            "legislatura": LEGISLATURA_ACTUAL,
                        })
                    out_data = {"legislatura": LEGISLATURA_ACTUAL, "eurodiputados": eurodiputados}
                    out = self.raw_dir / f"eurodiputados_es_{datetime.now(tz=UTC).strftime('%Y%m%d')}.json"
                    out.write_text(json.dumps(out_data, ensure_ascii=False), encoding="utf-8")
                    logger.info("[eurodiputados_es] Wikidata: %d eurodiputados descargados", len(eurodiputados))
                    return
        except Exception as e:
            logger.warning("[eurodiputados_es] Error Wikidata: %s", e)

    def _generate_sample_data(self) -> None:
        """Genera datos de muestra para desarrollo sin conexión."""
        sample = {
            "legislatura": 10,
            "eurodiputados": [
                {"id": "e001", "nombre_completo": "DOLORS MONTSERRAT MONTSERRAT", "partido": "Partido Popular", "grupo_europeo": "Grupo del Partido Popular Europeo", "legislatura": 10},
                {"id": "e002", "nombre_completo": "IRENE MONTERO GIL", "partido": "Podemos", "grupo_europeo": "Grupo de la Izquierda", "legislatura": 10},
                {"id": "e003", "nombre_completo": "LUIS GARICANO GABILONDO", "partido": "Ciudadanos", "grupo_europeo": "Grupo Renew Europe", "legislatura": 10},
                {"id": "e004", "nombre_completo": "JORGE BUXADÉ VILLALBA", "partido": "Vox", "grupo_europeo": "Grupo de los Conservadores y Reformistas Europeos", "legislatura": 10},
                {"id": "e005", "nombre_completo": "ESTRELLA GALÁN PÉREZ", "partido": "Sumar", "grupo_europeo": "Grupo de la Izquierda", "legislatura": 10},
                {"id": "e006", "nombre_completo": "ESTEBAN GONZÁLEZ PONS", "partido": "Partido Popular", "grupo_europeo": "Grupo del Partido Popular Europeo", "legislatura": 10},
                {"id": "e007", "nombre_completo": "LINA GÁLVEZ MUÑOZ", "partido": "PSOE", "grupo_europeo": "Grupo de la Alianza Progresista de Socialistas y Demócratas", "legislatura": 10},
                {"id": "e008", "nombre_completo": "JAVIER ZARZALEJOS NIETO", "partido": "Partido Popular", "grupo_europeo": "Grupo del Partido Popular Europeo", "legislatura": 10},
                {"id": "e009", "nombre_completo": "DIANA RIBA I GINER", "partido": "Esquerra Republicana", "grupo_europeo": "Grupo de los Verdes/Alianza Libre Europea", "legislatura": 10},
                {"id": "e010", "nombre_completo": "CÉSAR LUENA LÓPEZ", "partido": "PSOE", "grupo_europeo": "Grupo de la Alianza Progresista de Socialistas y Demócratas", "legislatura": 10},
            ],
        }
        path = self.raw_dir / "eurodiputados_es_sample_dev.json"
        path.write_text(json.dumps(sample, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("[eurodiputados_es] Datos de %d eurodiputados escritos en %s", len(sample["eurodiputados"]), path)

    # ──────────────────────────────────────────────────────────────────────────
    # TRANSFORM
    # ──────────────────────────────────────────────────────────────────────────

    def transform(self) -> None:
        logger.info("[eurodiputados_es] Transformando datos de eurodiputados...")

        for json_file in sorted(self.raw_dir.glob("*.json")):
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
            except Exception as e:
                logger.warning("[eurodiputados_es] Error leyendo %s: %s", json_file, e)
                continue

            for ep in data.get("eurodiputados", []):
                self._procesar_eurodiputado(ep)

        logger.info("[eurodiputados_es] %d eurodiputados, %d grupos políticos europeos",
                    len(self._eurodiputados), len(self._grupos))

    def _procesar_eurodiputado(self, ep: dict) -> None:
        nombre_completo = normalize_name(
            ep.get("nombre_completo") or
            f"{ep.get('nombre', '')} {ep.get('apellidos', '')}".strip()
        )
        if not nombre_completo:
            return

        ep_id = _make_eurodiputado_id(nombre_completo)
        grupo_nombre = ep.get("grupo_europeo", "").strip()
        partido = ep.get("partido", "").strip()
        legislatura = int(ep.get("legislatura", LEGISLATURA_ACTUAL))

        self._eurodiputados.append({
            "id": ep_id,
            "nombre": nombre_completo,
            "partido": partido,
            "grupo_europeo": grupo_nombre,
            "camara": "Parlamento Europeo",
            "pep": True,
            "tipo_cargo": "EURODIPUTADO",
            "legislatura": legislatura,
            "activo": True,
            "fecha_nacimiento": parse_date(ep.get("fecha_nacimiento", "")) if ep.get("fecha_nacimiento") else None,
            "fuente": "eurodiputados_es",
        })
        self.rows_in += 1

        if grupo_nombre:
            grupo_id = _make_grupo_europeo_id(grupo_nombre)
            if grupo_id not in self._grupos:
                self._grupos[grupo_id] = {
                    "id": grupo_id,
                    "nombre": grupo_nombre,
                    "fuente": "eurodiputados_es",
                    "camara": "Parlamento Europeo",
                }
            self._membresias.append({
                "eurodiputado_id": ep_id,
                "grupo_id": grupo_id,
                "legislatura": legislatura,
                "fuente": "eurodiputados_es",
            })

    # ──────────────────────────────────────────────────────────────────────────
    # LOAD
    # ──────────────────────────────────────────────────────────────────────────

    def load(self) -> None:
        loader = Neo4jBatchLoader(self.driver, neo4j_database=self.neo4j_database)

        # 1. Nodos Person (eurodiputados)
        if self._eurodiputados:
            n = loader.load_nodes(label="Person", rows=self._eurodiputados, key_field="id")
            self.rows_loaded += n

        # 2. Nodos PoliticalGroup (grupos políticos europeos)
        grupos_list = list(self._grupos.values())
        if grupos_list:
            loader.load_nodes(label="PoliticalGroup", rows=grupos_list, key_field="id")

        # 3. Relaciones PERTENECE_A (eurodiputado → grupo)
        rels = [
            {
                "source_key": m["eurodiputado_id"],
                "target_key": m["grupo_id"],
                "legislatura": m["legislatura"],
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
                properties=["legislatura", "fuente"],
            )

        logger.info("[eurodiputados_es] Carga completada: %d eurodiputados, %d grupos políticos",
                    len(self._eurodiputados), len(self._grupos))
