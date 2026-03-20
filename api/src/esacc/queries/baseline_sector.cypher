// Baseline: peer comparison by sector
// Compares a company's contract metrics against sector average
// ES-ACC: Uses ADJUDICATARIA_DE, nif, razon_social, cnae
MATCH (co:Company)-[:ADJUDICATARIA_DE]->(c:Contract)
WHERE coalesce(co.sector_code, co.cnae, co.cnae_principal) IS NOT NULL
  AND ($entity_id IS NULL OR elementId(co) = $entity_id)
WITH co, COUNT(c) AS contract_count, SUM(coalesce(c.importe_adjudicacion, c.value, 0)) AS total_value,
     coalesce(co.sector_code, co.cnae, co.cnae_principal, 'Sin clasificar') AS sector
WITH sector, co, contract_count, total_value

// Sector-wide stats
MATCH (peer:Company)-[:ADJUDICATARIA_DE]->(pc:Contract)
WHERE coalesce(peer.sector_code, peer.cnae, peer.cnae_principal, 'Sin clasificar') = sector
WITH sector, co, contract_count, total_value,
     COUNT(DISTINCT peer) AS sector_companies,
     COUNT(pc) AS sector_contracts,
     SUM(coalesce(pc.importe_adjudicacion, pc.value, 0)) AS sector_total_value
WITH sector, co, contract_count, total_value,
     sector_companies,
     toFloat(sector_contracts) / CASE WHEN sector_companies > 0
       THEN toFloat(sector_companies) ELSE 1.0 END AS avg_contracts,
     toFloat(sector_total_value) / CASE WHEN sector_companies > 0
       THEN toFloat(sector_companies) ELSE 1.0 END AS avg_value
RETURN coalesce(co.razon_social, co.nombre, co.name) AS company_name,
       co.nif AS company_nif,
       elementId(co) AS company_id,
       sector AS sector_code,
       contract_count,
       total_value,
       sector_companies,
       avg_contracts AS sector_avg_contracts,
       avg_value AS sector_avg_value,
       toFloat(contract_count) / CASE WHEN avg_contracts > 0
         THEN avg_contracts ELSE 1.0 END AS contract_ratio,
       toFloat(total_value) / CASE WHEN avg_value > 0
         THEN avg_value ELSE 1.0 END AS value_ratio
ORDER BY value_ratio DESC
LIMIT 50
