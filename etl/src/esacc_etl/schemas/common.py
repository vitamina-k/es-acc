"""Common Pydantic schemas for all ETL pipelines."""

from __future__ import annotations
from datetime import date
from pydantic import BaseModel, Field


class PersonRecord(BaseModel):
    id: str
    name: str
    aliases: str | None = None
    _source: str = ""


class CompanyRecord(BaseModel):
    nif: str
    name: str
    status: str | None = None
    province: str | None = None
    _source: str = ""


class ContractRecord(BaseModel):
    id: str
    title: str
    amount: float | None = None
    award_date: str | None = None  # ISO date string
    procedure_type: str | None = None
    cpv_code: str | None = None
    company_nif: str | None = None
    organ_name: str | None = None
    _source: str = ""


class GrantRecord(BaseModel):
    id: str
    title: str
    amount: float | None = None
    grant_date: str | None = None
    organ_name: str | None = None
    beneficiary_nif: str | None = None
    _source: str = ""


class SanctionRecord(BaseModel):
    id: str
    sanction_type: str
    source: str
    entity_name: str | None = None
    reason: str | None = None
    _source: str = ""


class PublicOfficeRecord(BaseModel):
    id: str
    role: str
    institution: str = ""
    person_name: str | None = None
    person_id: str | None = None
    group_name: str | None = None
    group_abbreviation: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    _source: str = ""


class TaxDebtRecord(BaseModel):
    id: str
    debtor_name: str
    nif: str | None = None
    amount: float = 0
    year: int | None = None
    _source: str = ""


class PoliticalGroupRecord(BaseModel):
    id: str
    name: str
    abbreviation: str | None = None
    _source: str = ""
