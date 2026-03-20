"""Tests for ID masking middleware and helpers (NIF/NIE/CIF)."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import pytest

from esacc.middleware.id_masking import (
    _collect_pep_ids,
    _is_pep_record,
    mask_id,
    mask_ids_in_json,
)

if TYPE_CHECKING:
    from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Unit tests for pure helper functions
# ---------------------------------------------------------------------------


class TestMaskId:
    def test_nif(self) -> None:
        assert mask_id("12345678Z") == "*****678Z"

    def test_nie(self) -> None:
        assert mask_id("X1234567L") == "*****567L"

    def test_cif(self) -> None:
        assert mask_id("A12345679") == "*****5679"

    def test_short(self) -> None:
        assert mask_id("AB") == "****"


class TestIsPepRecord:
    def test_explicit_is_pep_true(self) -> None:
        assert _is_pep_record({"name": "Juan", "nif": "12345678Z", "is_pep": True})

    def test_explicit_is_pep_false(self) -> None:
        assert not _is_pep_record({"name": "Juan", "nif": "12345678Z", "is_pep": False})

    @pytest.mark.parametrize(
        "role",
        [
            "diputado",
            "diputada",
            "senador",
            "senadora",
            "alcalde",
            "alcaldesa",
            "presidente",
            "presidenta",
            "ministro",
            "ministra",
            "Diputado",
            "SENADORA",
            "Ministra",
        ],
    )
    def test_political_role(self, role: str) -> None:
        assert _is_pep_record({"name": "X", "nif": "12345678Z", "role": role})

    def test_cargo_field(self) -> None:
        assert _is_pep_record({"name": "X", "nif": "12345678Z", "cargo": "Diputado"})

    @pytest.mark.parametrize(
        "role",
        [
            "Diputado Federal",
            "diputado autonómico",
            "Senador de las Cortes",
            "Ministro de Hacienda",
            "Presidente del Gobierno",
            "Director General de Presupuestos",
        ],
    )
    def test_compound_role_detected_as_pep(self, role: str) -> None:
        assert _is_pep_record({"name": "X", "nif": "12345678Z", "role": role})

    def test_non_pep_role(self) -> None:
        assert not _is_pep_record({"name": "X", "nif": "12345678Z", "role": "asesor"})

    def test_no_role_no_is_pep(self) -> None:
        assert not _is_pep_record({"name": "X", "nif": "12345678Z"})


class TestCollectPepIds:
    def test_flat_pep(self) -> None:
        data = {"nif": "12345678Z", "is_pep": True}
        assert _collect_pep_ids(data) == {"12345678Z"}

    def test_flat_non_pep(self) -> None:
        data = {"nif": "12345678Z", "is_pep": False}
        assert _collect_pep_ids(data) == set()

    def test_nested_list(self) -> None:
        data = {
            "results": [
                {"nif": "12345678Z", "role": "diputado"},
                {"nif": "87654321A", "role": "asesor"},
            ]
        }
        peps = _collect_pep_ids(data)
        assert "12345678Z" in peps
        assert "87654321A" not in peps

    def test_deeply_nested(self) -> None:
        data = {"a": {"b": {"c": [{"nif": "12345678Z", "is_pep": True}]}}}
        assert "12345678Z" in _collect_pep_ids(data)

    def test_nie_field(self) -> None:
        data = {"nie": "X1234567L", "is_pep": True}
        assert "X1234567L" in _collect_pep_ids(data)

    def test_cif_field(self) -> None:
        data = {"cif": "A12345679", "is_pep": True}
        assert "A12345679" in _collect_pep_ids(data)


# ---------------------------------------------------------------------------
# Unit tests for mask_ids_in_json
# ---------------------------------------------------------------------------


class TestMaskIdsInJson:
    def test_nif_masked(self) -> None:
        text = '{"nif": "12345678Z"}'
        result = mask_ids_in_json(text)
        assert "12345678Z" not in result
        assert "****" in result

    def test_nie_masked(self) -> None:
        text = '{"nie": "X1234567L"}'
        result = mask_ids_in_json(text)
        assert "X1234567L" not in result

    def test_cif_masked(self) -> None:
        text = '{"cif": "A12345679"}'
        result = mask_ids_in_json(text)
        assert "A12345679" not in result

    def test_pep_nif_not_masked(self) -> None:
        text = '{"nif": "12345678Z"}'
        result = mask_ids_in_json(text, pep_ids={"12345678Z"})
        assert "12345678Z" in result

    def test_multiple_ids(self) -> None:
        text = json.dumps({
            "people": [
                {"name": "A", "nif": "12345678Z"},
                {"name": "B", "nif": "87654321A"},
            ]
        })
        result = mask_ids_in_json(text)
        assert "12345678Z" not in result
        assert "87654321A" not in result

    def test_mixed_pep_and_non_pep(self) -> None:
        text = json.dumps({
            "people": [
                {"name": "A", "nif": "12345678Z"},
                {"name": "B", "nif": "87654321A"},
            ]
        })
        result = mask_ids_in_json(text, pep_ids={"12345678Z"})
        assert "12345678Z" in result   # PEP: no enmascarado
        assert "87654321A" not in result  # No PEP: enmascarado

    def test_empty_string(self) -> None:
        assert mask_ids_in_json("") == ""

    def test_no_ids(self) -> None:
        text = '{"name": "hello"}'
        assert mask_ids_in_json(text) == text

    def test_short_digit_sequence_not_masked(self) -> None:
        text = '{"partial": "123456"}'
        result = mask_ids_in_json(text)
        assert "123456" in result

    def test_non_json_text_passthrough(self) -> None:
        text = "This is plain text with no IDs."
        assert mask_ids_in_json(text) == text


# ---------------------------------------------------------------------------
# Integration tests via the ASGI app
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_health_not_masked(client: AsyncClient) -> None:
    """Non-ID JSON responses pass through unchanged."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
