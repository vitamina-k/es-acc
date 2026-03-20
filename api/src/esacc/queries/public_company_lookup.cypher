// ES-ACC: Company lookup by NIF
MATCH (c:Company)
WHERE elementId(c) = $company_id
   OR c.nif = $company_identifier
   OR c.nif = $company_identifier_formatted
RETURN c, labels(c) AS entity_labels, elementId(c) AS entity_id
LIMIT 1
