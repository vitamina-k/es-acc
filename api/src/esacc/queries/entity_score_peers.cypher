// Sample peer entities for percentile computation (capped at 500 for performance)
// For companies: peers share the same cnae
// For persons: peers share the same primary label
// ES-ACC: Uses ADJUDICATARIA_DE, TIENE_DEUDA_TRIBUTARIA
MATCH (peer)
WHERE ($peer_label IS NULL OR $peer_label IN labels(peer))
  AND ($cnae IS NULL OR peer.cnae = $cnae OR peer.cnae_principal = $cnae)
  AND elementId(peer) <> $entity_id
WITH peer LIMIT 500
OPTIONAL MATCH (peer)-[r]-(connected)
WITH peer, count(r) AS conn_count
OPTIONAL MATCH (peer)-[:ADJUDICATARIA_DE]->(c:Contract)
WITH peer, conn_count, COALESCE(sum(coalesce(c.importe_adjudicacion, c.value, 0)), 0) AS contract_vol
OPTIONAL MATCH (peer)-[:TIENE_DEUDA_TRIBUTARIA]->(d:TaxDebt)
WITH peer, conn_count, contract_vol + COALESCE(sum(d.importe), 0) AS fin_vol
RETURN
  count(peer) AS peer_count,
  collect(conn_count) AS connection_counts,
  collect(fin_vol) AS financial_volumes
