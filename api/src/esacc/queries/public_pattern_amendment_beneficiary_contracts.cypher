MATCH (c:Company)
WHERE elementId(c) = $company_id
   OR c.nif = $company_identifier
   OR c.nif = $company_identifier_formatted
CALL {
  WITH c
  MATCH (a:Amendment)-[:BENEFICIARIA_DE]->(c)
  RETURN collect(DISTINCT a.amendment_id) AS amendment_ids
}
CALL {
  WITH c
  MATCH (c)-[:ADJUDICATARIA_DE]->(ct:Contract)
  RETURN collect(DISTINCT ct.contract_id) AS contract_ids,
         sum(coalesce(coalesce(ct.importe_adjudicacion, ct.value, 0), 0.0)) AS contract_total,
         min(coalesce(ct.fecha_adjudicacion, ct.date, "")) AS contract_start,
         max(coalesce(ct.fecha_adjudicacion, ct.date, "")) AS contract_end
}
CALL {
  WITH c
  MATCH (a:Amendment)-[:BENEFICIARIA_DE]->(c)
  OPTIONAL MATCH (a)-[:CONCEDE]->(cv:Grant)
  RETURN collect(DISTINCT cv.id) AS convenio_ids,
         sum(DISTINCT coalesce(cv.importe, 0.0)) AS convenio_total
}
WITH c,
     [x IN amendment_ids WHERE x IS NOT NULL AND x <> ''] AS amendment_ids,
     [x IN contract_ids WHERE x IS NOT NULL AND x <> ''] AS contract_ids,
     [x IN convenio_ids WHERE x IS NOT NULL AND x <> ''] AS convenio_ids,
     contract_total,
     convenio_total,
     contract_start,
     contract_end
WITH c,
     amendment_ids,
     contract_ids,
     convenio_ids,
     contract_total + convenio_total AS amount_total,
     contract_start AS window_start,
     contract_end AS window_end,
     [x IN amendment_ids + convenio_ids + contract_ids WHERE x IS NOT NULL AND x <> ''] AS evidence_refs
WHERE size(amendment_ids) > 0
  AND size(contract_ids) > 0
  AND size(evidence_refs) > 0
RETURN 'amendment_beneficiary_contracts' AS pattern_id,
       c.nif AS nif,
       coalesce(c.razon_social, c.nombre, c.name) AS company_name,
       toFloat(size(amendment_ids) + size(convenio_ids) + size(contract_ids)) AS risk_signal,
       amount_total AS amount_total,
       window_start AS window_start,
       window_end AS window_end,
       evidence_refs[0..toInteger($pattern_max_evidence_refs)] AS evidence_refs,
       size(evidence_refs) AS evidence_count
