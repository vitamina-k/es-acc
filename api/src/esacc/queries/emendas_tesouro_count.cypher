MATCH (p:Contract)
OPTIONAL MATCH (p)<-[:ADJUDICATARIA_DE|GANA_CONTRATO]-(c:Company)
WITH p, c
WHERE ($q_ref IS NULL OR p.expediente CONTAINS $q_ref OR p.contract_id CONTAINS $q_ref)
  AND ($q_type IS NULL OR p.procedimiento CONTAINS $q_type OR p.procedure_type CONTAINS $q_type)
  AND ($q_beneficiary IS NULL OR c.razon_social CONTAINS $q_beneficiary OR coalesce(c.razon_social, c.nombre, c.name) CONTAINS $q_beneficiary)
RETURN count(p) AS total
