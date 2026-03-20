MATCH (c:Company)
WHERE elementId(c) = $company_id
   OR c.nif = $company_identifier
   OR c.nif = $company_identifier_formatted
OPTIONAL MATCH (c)-[:ADJUDICATARIA_DE]->(contract)
WITH c, count(DISTINCT contract) AS contract_count
OPTIONAL MATCH (c)-[:INHABILITADA_PARA_CONTRATAR]->(sanction)
WITH c, contract_count, count(DISTINCT sanction) AS sanction_count
OPTIONAL MATCH (c)-[:TIENE_DEUDA_TRIBUTARIA]->(debt)
WITH c, contract_count, sanction_count, count(DISTINCT debt) AS debt_count
OPTIONAL MATCH (c)-[:BENEFICIARIA_DE]->(loan)
WITH c, contract_count, sanction_count, debt_count, count(DISTINCT loan) AS loan_count
OPTIONAL MATCH (c)-[:BENEFICIARIA_DE]->(amendment:Amendment)
WITH c, contract_count, sanction_count, debt_count, loan_count, count(DISTINCT amendment) AS amendment_count
WITH c, contract_count, sanction_count, debt_count, loan_count, amendment_count, [
  {
    pattern_id: 'sanctioned_still_receiving',
    trigger: sanction_count > 0 AND contract_count > 0,
    summary_es: 'Empresa sancionada con contratos públicos',
    summary_en: 'Sanctioned company with public contracts',
    risk_signal: sanction_count + contract_count
  },
  {
    pattern_id: 'debtor_contracts',
    trigger: debt_count > 0 AND contract_count > 0,
    summary_es: 'Empresa deudora con contratos públicos',
    summary_en: 'Debtor company with public contracts',
    risk_signal: debt_count + contract_count
  },
  {
    pattern_id: 'loan_debtor',
    trigger: debt_count > 0 AND loan_count > 0,
    summary_es: 'Empresa deudora con préstamo público',
    summary_en: 'Debtor company with public loan',
    risk_signal: debt_count + loan_count
  },
  {
    pattern_id: 'amendment_beneficiary_contracts',
    trigger: amendment_count > 0 AND contract_count > 0,
    summary_es: 'Beneficiaria de subvención con contratos',
    summary_en: 'Subsidy beneficiary with contracts',
    risk_signal: amendment_count + contract_count
  }
] AS patterns
UNWIND patterns AS p
WITH c, p, contract_count, sanction_count, debt_count, loan_count, amendment_count
WHERE p.trigger
RETURN p.pattern_id AS pattern_id,
       c.nif AS nif,
       coalesce(c.razon_social, c.name) AS company_name,
       contract_count,
       sanction_count,
       debt_count,
       loan_count,
       amendment_count,
       p.summary_es AS summary_es,
       p.summary_en AS summary_en,
       p.risk_signal AS risk_signal
ORDER BY risk_signal DESC
