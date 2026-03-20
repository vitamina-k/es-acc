MATCH (p:Contract)
OPTIONAL MATCH (p)<-[:ADJUDICATARIA_DE|GANA_CONTRATO]-(c:Company)
WITH p, c
WHERE ($q_ref IS NULL OR p.expediente CONTAINS $q_ref OR p.contract_id CONTAINS $q_ref)
  AND ($q_type IS NULL OR p.procedimiento CONTAINS $q_type OR p.procedure_type CONTAINS $q_type)
  AND ($q_beneficiary IS NULL OR c.razon_social CONTAINS $q_beneficiary OR coalesce(c.razon_social, c.nombre, c.name) CONTAINS $q_beneficiary)
RETURN p, null AS r, c
ORDER BY 
  CASE WHEN $order = 'asc' THEN
    CASE 
      WHEN $sort_by = 'expediente' THEN p.expediente
      WHEN $sort_by = 'date' THEN coalesce(p.fecha_adjudicacion, p.date, '1900-01-01')
      WHEN $sort_by = 'value' THEN toFloat(coalesce(p.importe_adjudicacion, p.value, 0.0))
      WHEN $sort_by = 'procedure' THEN coalesce(p.procedimiento, p.procedure_type, '')
      WHEN $sort_by = 'beneficiary' THEN coalesce(c.razon_social, coalesce(c.razon_social, c.nombre, c.name), '')
      ELSE coalesce(p.fecha_adjudicacion, p.date, '1900-01-01')
    END
  END ASC,
  CASE WHEN $order = 'desc' THEN
    CASE 
      WHEN $sort_by = 'expediente' THEN p.expediente
      WHEN $sort_by = 'date' THEN coalesce(p.fecha_adjudicacion, p.date, '1900-01-01')
      WHEN $sort_by = 'value' THEN toFloat(coalesce(p.importe_adjudicacion, p.value, 0.0))
      WHEN $sort_by = 'procedure' THEN coalesce(p.procedimiento, p.procedure_type, '')
      WHEN $sort_by = 'beneficiary' THEN coalesce(c.razon_social, coalesce(c.razon_social, c.nombre, c.name), '')
      ELSE coalesce(p.fecha_adjudicacion, p.date, '1900-01-01')
    END
  END DESC
SKIP $skip
LIMIT $limit
