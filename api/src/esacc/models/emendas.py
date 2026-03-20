from pydantic import BaseModel


class EmendaRecord(BaseModel):
    payment: dict[str, str | float | int | bool | None]
    beneficiary: dict[str, str | float | int | bool | None] | None = None


class EmendasListResponse(BaseModel):
    data: list[EmendaRecord]
    total_count: int
    skip: int
    limit: int
