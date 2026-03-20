from __future__ import annotations

import re

from fastapi import HTTPException, status

from esacc.config import settings

PERSON_LABELS = {"Person", "Partner"}
INTERNAL_LABELS = {"User", "Investigation", "Annotation", "Tag"}
SENSITIVE_PROP_KEYS = {
    "nif",
    "nie",
    "cif",
    "dni",
    "nif_partial",
    "nif_raw",
    "doc_partial",
    "doc_raw",
    "masked_doc",
}

# NIF español: letra+7dígitos+letra (empresa/CIF) o 8dígitos+letra (DNI) o letra+7dígitos+letra (NIE)
NIF_ES_PATTERN = re.compile(r"^[A-Z]\d{7}[A-Z0-9]$|^\d{8}[A-Z]$|^[KLMXYZ]\d{7}[A-Z]$")
# Persona física: DNI (8 dígitos + letra) o NIE (letra K/L/M/X/Y/Z + 7 dígitos + letra)
PERSON_ID_PATTERN = re.compile(r"^\d{8}[A-Z]$|^[KLMXYZ]\d{7}[A-Z]$")


def _clean_identifier(value: str) -> str:
    return re.sub(r"[.\-/]", "", value or "")


def is_public_mode() -> bool:
    return settings.public_mode


def should_hide_person_entities() -> bool:
    return settings.public_mode and not settings.public_allow_person


def has_person_labels(labels: list[str]) -> bool:
    return any(label in PERSON_LABELS for label in labels)


def infer_exposure_tier(labels: list[str]) -> str:
    label_set = set(labels)
    if label_set & INTERNAL_LABELS:
        return "internal_only"
    if label_set & PERSON_LABELS:
        return "restricted"
    return "public_safe"


def sanitize_public_properties(
    props: dict[str, str | float | int | bool | None],
) -> dict[str, str | float | int | bool | None]:
    if not is_public_mode():
        return props
    return {
        key: value
        for key, value in props.items()
        if key not in SENSITIVE_PROP_KEYS and "nie" not in key.lower()
    }


def enforce_entity_lookup_policy(raw_identifier: str) -> None:
    if not is_public_mode():
        return
    enforce_entity_lookup_enabled()
    clean = _clean_identifier(raw_identifier).upper()
    if PERSON_ID_PATTERN.match(clean) and not settings.public_allow_person:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Consulta de personas físicas deshabilitada en modo público",
        )
    if not NIF_ES_PATTERN.match(clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de identificador no válido (NIF/NIE/CIF)",
        )


def enforce_entity_lookup_enabled() -> None:
    if settings.public_mode and not settings.public_allow_entity_lookup:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Entity lookup endpoint disabled in public mode",
        )


def enforce_person_access_policy(labels: list[str]) -> None:
    if not is_public_mode():
        return
    if has_person_labels(labels) and should_hide_person_entities():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Person-level entities disabled in public mode",
        )


def ensure_investigations_enabled() -> None:
    if settings.public_mode and not settings.public_allow_investigations:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Investigation endpoints disabled in public mode",
        )
