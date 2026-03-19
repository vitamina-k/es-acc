#!/bin/bash
# Seed Neo4j with development data
# Usage: ./scripts/seed-neo4j.sh [neo4j-password]

NEO4J_PASSWORD="${1:-changeme}"
NEO4J_URI="bolt://localhost:7687"

echo "🔧 VIGILIA — Seeding Neo4j with development data..."

# Wait for Neo4j to be ready
echo "⏳ Waiting for Neo4j..."
for i in $(seq 1 30); do
    if cypher-shell -u neo4j -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" "RETURN 1" &>/dev/null; then
        echo "✓ Neo4j is ready"
        break
    fi
    sleep 2
done

# Run schema initialization
echo "📊 Applying schema (constraints + indexes)..."
cypher-shell -u neo4j -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" < infra/neo4j/init.cypher

# Run seed data
echo "🌱 Loading seed data..."
cypher-shell -u neo4j -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" < infra/neo4j/seed.cypher

echo "✅ Seed completed!"
echo ""
echo "📈 Node counts:"
cypher-shell -u neo4j -p "$NEO4J_PASSWORD" -a "$NEO4J_URI" \
    "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY count DESC"
