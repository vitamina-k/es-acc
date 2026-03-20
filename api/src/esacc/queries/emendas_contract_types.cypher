MATCH (p:Contract)
WHERE p.procedimiento IS NOT NULL AND p.procedimiento <> ''
RETURN DISTINCT p.procedimiento AS tipo
ORDER BY tipo
