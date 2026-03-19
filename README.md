# VIGILIA — Vigilancia + IA

<p align="center">
  <strong>Sistema de grafos de código abierto para transparencia y rendición de cuentas en España</strong>
</p>

<p align="center">
  <a href="#qué-es-vigilia">Qué es</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#arquitectura">Arquitectura</a> ·
  <a href="#fuentes-de-datos">Fuentes</a> ·
  <a href="#api">API</a> ·
  <a href="#etl-pipelines">ETL</a> ·
  <a href="#contribuir">Contribuir</a>
</p>

---

## Qué es VIGILIA

VIGILIA cruza bases de datos públicas españolas — BORME, PLACE, BOE, AEAT, Congreso, Senado, Tribunal Supremo, listas de sanciones internacionales — y las conecta en un **grafo de conocimiento** consultable en segundos.

**El equivalente a OpenCorporates o ICIJ Offshore Leaks, pero enfocado 100% en España, construido sobre grafos (Neo4j), y de código abierto.**

### El problema

España tiene decenas de portales de datos abiertos oficiales, pero cada uno es un silo. Una empresa puede tener contratos públicos por millones, aparecer en los Papeles de Panamá, tener administradores sancionados por Hacienda y un diputado como socio — y esa información existe, es pública, pero está en 5 portales distintos que nadie cruza.

### La solución

VIGILIA ingesta todas esas fuentes, las normaliza, las conecta en un grafo de conocimiento y las hace consultables en segundos.

---

## Quick Start

### Con Docker (recomendado)

```bash
# Clonar el repo
git clone https://github.com/thebraidbrothers/es-acc.git
cd es-acc

# Levantar todo el stack
docker compose up -d --build

# Acceder:
# - Frontend: http://localhost:5173
# - API docs: http://localhost:8000/docs
# - Neo4j Browser: http://localhost:7474
```

### Seed de desarrollo

```bash
# Cargar esquema + datos de prueba
./scripts/seed-neo4j.sh changeme
```

### ETL (pipelines de datos)

```bash
# Crear virtualenv para ETL
python3 -m venv /tmp/vigilia-venv
source /tmp/vigilia-venv/bin/activate
pip install -e etl/

# Ejecutar un pipeline
esacc-etl run --source congreso --neo4j-password changeme --data-dir /tmp/vigilia-data

# Ver pipelines disponibles
esacc-etl list
```

---

## Arquitectura

```
Fuentes públicas oficiales
        ↓
  Pipelines ETL (esacc-etl)
        ↓
  Neo4j (grafo de entidades y relaciones)
        ↓
  FastAPI (API pública + consultas Cypher)
        ↓
  Frontend React (exploración visual)
```

| Capa | Tecnología |
|------|-----------|
| Base de datos de grafos | Neo4j 5 Community |
| Backend / API | FastAPI (Python 3.12+, async) |
| Frontend | Vite + React 19 + TypeScript |
| ETL | Python (pandas, httpx) — módulo `esacc-etl` |
| Infraestructura | Docker Compose |

---

## Entidades del grafo

| Nodo | Descripción |
|------|-------------|
| `Person` | Persona física (político, administrador, sancionado) |
| `Company` | Empresa (identificada por NIF/CIF) |
| `Contract` | Contrato público adjudicado |
| `Grant` | Subvención pública recibida |
| `Sanction` | Sanción (fiscal, medioambiental, internacional) |
| `PublicOffice` | Cargo público (diputado, senador, alto cargo) |
| `PoliticalGroup` | Grupo parlamentario |
| `PublicOrgan` | Organismo público contratante |
| `GazetteEntry` | Entrada del BOE |
| `TaxDebt` | Deuda tributaria con la AEAT |
| `Investigation` | Investigación judicial (Tribunal Supremo) |
| `Partner` | Socio/accionista de empresa |

---

## Fuentes de datos

| ID | Nombre | Categoría | Frecuencia | Estado |
|----|--------|-----------|------------|--------|
| `borme` | BORME — Registro Mercantil | Identidad empresarial | Diaria | ✓ |
| `contratos_estado` | PLACE — Contratación Pública | Contratos | Diaria | ✓ |
| `congreso` | Congreso de los Diputados | Legislativo | Diaria | ✓ |
| `senado_es` | Senado de España | Legislativo | Mensual | ○ |
| `eurodiputados_es` | Eurodiputados españoles | Legislativo | Mensual | ○ |
| `boe` | BOE — Boletín Oficial del Estado | Gaceta oficial | Diaria | ○ |
| `boe_pep` | BOE PEP — Altos Cargos | Integridad | Mensual | ○ |
| `aeat_deudores` | AEAT — Grandes deudores | Fiscal | Anual | ○ |
| `rolece` | ROLECE — Licitadores inhabilitados | Contratos | Mensual | ○ |
| `bdns` | BDNS — Subvenciones | Subvenciones | Diaria | ○ |
| `miteco` | MITECO — Sanciones medioambientales | Sanciones | Mensual | ○ |
| `tribunal_supremo` | Tribunal Supremo (CENDOJ) | Integridad judicial | Mensual | ○ |
| `icij` | ICIJ Offshore Leaks | Identidad offshore | Anual | ○ |
| `opensanctions` | OpenSanctions | Sanciones | Diaria | ○ |
| `eu_sanctions` | Sanciones UE | Sanciones | Semanal | ○ |
| `ofac` | OFAC SDN List | Sanciones | Semanal | ○ |
| `un_sanctions` | Sanciones ONU | Sanciones | Semanal | ○ |
| `world_bank` | World Bank — Inhabilitados | Sanciones | Mensual | ○ |

✓ = Pipeline implementado | ○ = Pendiente

---

## API

Base URL: `http://localhost:8000`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del sistema |
| GET | `/api/v1/public/meta` | Métricas agregadas y estado de fuentes |
| GET | `/api/v1/public/graph/company/{nif}` | Subgrafo de una empresa por NIF |
| GET | `/api/v1/public/patterns/company/{nif}` | Análisis de patrones de riesgo |
| GET | `/api/v1/public/search?q=...` | Búsqueda full-text de entidades |

Documentación interactiva Swagger en `/docs`.

---

## Estructura del repo

```
es-acc/
├── api/              FastAPI backend
│   ├── main.py       Aplicación FastAPI
│   ├── services.py   Consultas Neo4j
│   ├── models.py     Modelos Pydantic
│   ├── db.py         Driver Neo4j
│   └── config.py     Configuración
├── etl/              Pipelines ETL
│   └── src/esacc_etl/
│       ├── pipelines/   Un .py por fuente
│       ├── schemas/     Validación Pydantic
│       ├── transforms/  Normalización
│       ├── loader.py    Cargador a Neo4j
│       └── runner.py    CLI orquestador
├── frontend/         App React (Vite + TS)
├── infra/            Docker Compose, esquema Neo4j
│   └── neo4j/
│       ├── init.cypher   Constraints e índices
│       └── seed.cypher   Datos de desarrollo
├── scripts/          Utilidades
├── docs/             Documentación
├── data/             Datasets (.gitignore)
└── docker-compose.yml
```

---

## Contribuir

### Nuevo pipeline ETL

Crear `etl/src/esacc_etl/pipelines/nueva_fuente.py` siguiendo el patrón de `congreso.py`:

1. `download()` — Descarga datos del portal oficial
2. `parse()` — Normaliza al esquema común
3. `load()` — Carga en Neo4j vía `loader.py`
4. `run()` — Orquesta el flujo completo

### Consultas Cypher útiles

Queries para detectar patrones: empresas con contratos y deudas en AEAT, políticos con cargos en empresas subvencionadas, etc.

### Mejoras de frontend

React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui.

### Restricciones

- **Nunca exponer datos personales de ciudadanos normales**
- **Lenguaje neutral** en outputs: "conexión documentada", "señal", nunca "culpable"
- **Privacidad por defecto**: `PUBLIC_MODE=true`, `PUBLIC_ALLOW_PERSON=false`
- Código reproducible: `docker compose up -d --build`

---

## Marco legal

| Ley | Alcance |
|-----|---------|
| CE Art. 105.b | Derecho de acceso a archivos y registros públicos |
| Ley 19/2013 | Transparencia, acceso a información pública |
| Ley 9/2017 (LCSP) | Transparencia en contratación pública |
| RGPD (EU 2016/679) | Protección de datos — permite tratamiento para interés público |
| LO 3/2018 (LOPDGDD) | Ley española de protección de datos |

**Los datos ya son públicos. VIGILIA los hace accesibles de forma estructurada.**

---

## Licencia

Código abierto. Los datos provienen de fuentes públicas oficiales.

---

*es-acc — Spanish Accelerationism: builders españoles usando tecnología y datos abiertos para hacer la información pública más accesible.*
