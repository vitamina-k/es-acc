MATCH (c:Company)
WHERE elementId(c) = $company_id
   OR c.nif = $company_identifier
   OR c.nif = $company_identifier_formatted
MATCH (c)-[:ADJUDICATARIA_DE]->(ct:Contract)-[:REFERENTE_A]->(b:Bid)
WHERE b.srp = true
  AND ct.contracting_org IS NOT NULL
  AND trim(ct.contracting_org) <> ''
WITH c,
     b.bid_id AS bid_id,
     collect(DISTINCT ct.contracting_org) AS orgs,
     collect(DISTINCT ct.contract_id) AS bid_contract_ids,
     sum(coalesce(coalesce(ct.importe_adjudicacion, ct.value, 0), 0.0)) AS bid_total,
     min(coalesce(ct.fecha_adjudicacion, ct.date, "")) AS bid_start,
     max(coalesce(ct.fecha_adjudicacion, ct.date, "")) AS bid_end
WHERE size(orgs) >= toInteger($pattern_srp_min_orgs)
WITH c,
     collect(bid_id) AS bid_ids,
     collect(bid_contract_ids) AS contract_id_groups,
     collect(size(orgs)) AS org_sizes,
     sum(bid_total) AS amount_total,
     min(bid_start) AS window_start,
     max(bid_end) AS window_end
WITH c,
     amount_total,
     window_start,
     window_end,
     [x IN bid_ids WHERE x IS NOT NULL AND x <> ''] AS bid_ids,
     reduce(total_orgs = 0, size_item IN org_sizes | total_orgs + size_item) AS org_touchpoints,
     reduce(flat = [], ids IN contract_id_groups | flat + ids) AS contract_ids
WITH c,
     amount_total,
     window_start,
     window_end,
     bid_ids,
     org_touchpoints,
     [x IN contract_ids WHERE x IS NOT NULL AND x <> ''] AS contract_ids,
     [x IN bid_ids + contract_ids WHERE x IS NOT NULL AND x <> ''] AS evidence_refs
WHERE size(bid_ids) > 0
  AND size(evidence_refs) > 0
RETURN 'srp_multi_org_hitchhiking' AS pattern_id,
       c.nif AS nif,
       coalesce(c.razon_social, c.nombre, c.name) AS company_name,
       toFloat(size(bid_ids) + org_touchpoints) AS risk_signal,
       amount_total AS amount_total,
       window_start AS window_start,
       window_end AS window_end,
       evidence_refs[0..toInteger($pattern_max_evidence_refs)] AS evidence_refs,
       size(evidence_refs) AS evidence_count
