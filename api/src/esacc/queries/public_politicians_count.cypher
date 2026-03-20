MATCH (p:Person)
WHERE p.pep = true
RETURN count(p) AS total
