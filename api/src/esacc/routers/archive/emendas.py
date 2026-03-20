from typing import Annotated

from fastapi import APIRouter, Depends, Query
from neo4j import AsyncSession

from esacc.dependencies import get_session
from esacc.models.emendas import EmendaRecord, EmendasListResponse
from esacc.services.neo4j_service import execute_query, sanitize_props
from esacc.services.public_guard import sanitize_public_properties

router = APIRouter(prefix="/api/v1/emendas", tags=["emendas"])


@router.get("/types")
async def list_contract_types(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[str]:
    """Return distinct procedure types present in the contracts."""
    records = await execute_query(
        session,
        "emendas_contract_types",
        {},
    )
    types = [r["tipo"] for r in records if r["tipo"]]
    return sorted(types)


@router.get("/", response_model=EmendasListResponse)
async def list_emendas_tesouro(
    session: Annotated[AsyncSession, Depends(get_session)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    sort_by: str | None = Query(None, description="Field to sort by: expediente, date, value, procedure, beneficiary"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    q_ref: str | None = Query(None, description="Filter by contract reference (expediente)"),
    q_type: str | None = Query(None, description="Filter by procedure type"),
    q_beneficiary: str | None = Query(None, description="Filter by beneficiary name (razon_social)"),
) -> EmendasListResponse:
    """List Tesouro Emendas payments with pagination."""
    params = {
        "skip": skip,
        "limit": limit,
        "sort_by": sort_by,
        "order": order,
        "q_ref": q_ref,
        "q_type": q_type,
        "q_beneficiary": q_beneficiary,
    }

    count_records = await execute_query(
        session, "emendas_tesouro_count", params
    )
    total_count = count_records[0]["total"] if count_records else 0

    records = await execute_query(
        session,
        "emendas_tesouro_list",
        params,
    )

    results: list[EmendaRecord] = []
    for record in records:
        payment_props = sanitize_public_properties(
            sanitize_props(dict(record["p"]))
        )
        company_props = None
        if record["c"] is not None:
            company_props = sanitize_public_properties(
                sanitize_props(dict(record["c"]))
            )

        results.append(
            EmendaRecord(payment=payment_props, beneficiary=company_props)
        )

    return EmendasListResponse(
        data=results,
        total_count=total_count,
        skip=skip,
        limit=limit,
    )
