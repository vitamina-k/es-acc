"""Name and NIF normalization utilities."""

from __future__ import annotations
import re
import unicodedata


_PERSON_PART = re.compile(r"^[A-Za-záéíóúüÁÉÍÓÚÜñÑçÇàèìòùÀÈÌÒÙâêîôûÂÊÎÔÛ\s\-']+$")


def _invert_if_needed(name: str) -> str:
    """Convierte 'APELLIDO(S), NOMBRE' → 'NOMBRE APELLIDO(S)'.
    Solo aplica si hay exactamente una coma y ambas partes parecen nombres de persona.
    """
    if "," not in name:
        return name
    parts = name.split(",", 1)
    apellido = parts[0].strip()
    nombre = parts[1].strip()
    # Solo invertir si ambas partes son texto puro (sin números ni símbolos de empresa)
    if nombre and _PERSON_PART.match(apellido) and _PERSON_PART.match(nombre):
        return f"{nombre} {apellido}"
    return name


def normalize_name(name: str) -> str:
    """Normalize a person/company name: strip, title-case, collapse whitespace.

    Handles inverted Spanish registry format: 'APELLIDO, NOMBRE' → 'Nombre Apellido'.
    """
    if not name:
        return ""
    name = unicodedata.normalize("NFC", name.strip())
    name = re.sub(r"\s+", " ", name)
    name = _invert_if_needed(name)
    # Title case but preserve common particles; capitalize each hyphen-part
    particles = {"de", "del", "la", "las", "los", "el", "y", "e", "i"}

    def cap_word(w: str) -> str:
        return "-".join(part.capitalize() for part in w.split("-"))

    words = name.split()
    result = []
    for i, w in enumerate(words):
        if i > 0 and w.lower() in particles:
            result.append(w.lower())
        else:
            result.append(cap_word(w))
    return " ".join(result)


def normalize_nif(nif: str) -> str:
    """Normalize a Spanish NIF/CIF: uppercase, strip whitespace and dashes."""
    if not nif:
        return ""
    return re.sub(r"[\s\-.]", "", nif.strip().upper())


def slugify(text: str) -> str:
    """Create a URL-safe slug from text."""
    text = unicodedata.normalize("NFD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


def make_person_id(name: str, source: str) -> str:
    """Generate a deterministic person ID from name + source."""
    return f"{source}:{slugify(normalize_name(name))}"


def make_office_id(person_name: str, role: str, institution: str) -> str:
    """Generate a deterministic office ID."""
    return f"office:{slugify(f'{person_name}-{role}-{institution}')}"
