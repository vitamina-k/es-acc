#!/bin/bash
# Run ETL pipelines
# Usage: ./scripts/run-etl.sh [source] [neo4j-password]

SOURCE="${1:-all}"
NEO4J_PASSWORD="${2:-changeme}"
DATA_DIR="${3:-/tmp/vigilia-data}"

echo "🔄 VIGILIA ETL — Running pipeline: $SOURCE"
echo "   Neo4j: bolt://localhost:7687"
echo "   Data dir: $DATA_DIR"
echo ""

# Activate virtualenv if it exists
if [ -d "/tmp/vigilia-venv" ]; then
    source /tmp/vigilia-venv/bin/activate
fi

# Run the ETL
cd "$(dirname "$0")/.."
esacc-etl run \
    --source "$SOURCE" \
    --neo4j-password "$NEO4J_PASSWORD" \
    --data-dir "$DATA_DIR"
