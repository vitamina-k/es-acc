"""Middleware that masks personal identification numbers (NIF/NIE/CIF) in API responses.

Politically Exposed Persons (PEPs) have their IDs kept visible.
"""

from __future__ import annotations

import json
import re
from typing import TYPE_CHECKING, Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, StreamingResponse

from esacc.constants import PEP_ROLES

if TYPE_CHECKING:
    from starlette.middleware.base import RequestResponseEndpoint
    from starlette.requests import Request

# Matches Spanish identity documents:
# - NIF/DNI: 8 digits + letter, e.g. 12345678A
# - NIE: X/Y/Z + 7 digits + letter, e.g. X1234567A
# - CIF: letter + 7 digits + digit/letter, e.g. A12345674
_ID_RAW = re.compile(r"(?<![A-Z0-9])(\d{8}[A-Z]|[XYZ]\d{7}[A-Z]|[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J])(?![A-Z0-9])")


def mask_id(val: str) -> str:
    """Mask an ID, keeping only the last 4 characters visible."""
    if len(val) <= 4:
        return "****"
    return f"{'*' * (len(val)-4)}{val[-4:]}"


def _is_pep_record(record: dict[str, Any]) -> bool:
    """Determine whether a JSON record describes a PEP."""
    if record.get("is_pep") is True:
        return True

    for field in ("role", "cargo", "position"):
        value = record.get(field)
        if isinstance(value, str) and any(kw in value.strip().lower() for kw in PEP_ROLES):
            return True

    return False


def _collect_pep_ids(data: Any) -> set[str]:
    """Walk a JSON structure and return the set of ID strings belonging to PEPs."""
    pep_ids: set[str] = set()

    if isinstance(data, dict):
        if _is_pep_record(data):
            for field in ("nif", "nie", "cif", "dni", "tax_id"):
                val = data.get(field)
                if isinstance(val, str) and val:
                    pep_ids.add(re.sub(r"[^A-Z0-9]", "", val.upper()))
        for value in data.values():
            pep_ids |= _collect_pep_ids(value)
    elif isinstance(data, list):
        for item in data:
            pep_ids |= _collect_pep_ids(item)

    return pep_ids


def mask_ids_in_json(text: str, pep_ids: set[str] | None = None) -> str:
    """Replace ID patterns in *text* with masked versions."""
    safe: set[str] = pep_ids or set()

    def _replace(m: re.Match[str]) -> str:
        raw_val = re.sub(r"[^A-Z0-9]", "", m.group().upper())
        if raw_val in safe:
            return m.group()
        return mask_id(m.group())

    text = _ID_RAW.sub(_replace, text)
    return text


class IDMaskingMiddleware(BaseHTTPMiddleware):
    """Middleware that masks personal identification numbers in JSON responses."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)

        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response

        body_bytes = b""
        if isinstance(response, StreamingResponse):
            chunks: list[bytes] = []
            async for chunk in response.body_iterator:
                if isinstance(chunk, str):
                    chunks.append(chunk.encode("utf-8"))
                elif isinstance(chunk, bytes):
                    chunks.append(chunk)
                else:
                    chunks.append(bytes(chunk))
            body_bytes = b"".join(chunks)
        else:
            body_bytes = getattr(response, "body", b"")

        if not body_bytes:
            return response

        try:
            body_text = body_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return response

        pep_ids: set[str] = set()
        try:
            data = json.loads(body_text)
            pep_ids = _collect_pep_ids(data)
        except (json.JSONDecodeError, TypeError):
            pass

        masked_text = mask_ids_in_json(body_text, pep_ids)
        masked_bytes = masked_text.encode("utf-8")

        return Response(
            content=masked_bytes,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )
