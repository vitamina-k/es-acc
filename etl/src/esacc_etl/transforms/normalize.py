"""Name and NIF normalization utilities."""

from __future__ import annotations
import re
import unicodedata


def normalize_name(name: str) -> str:
    """Normalize a person/company name: strip, title-case, collapse whitespace."""
    if not name:
        return ""
    name = unicodedata.normalize("NFC", name.strip())
    name = re.sub(r"\s+", " ", name)
    # Title case but preserve common particles
    particles = {"de", "del", "la", "las", "los", "el", "y", "e", "i"}
    words = name.split()
    result = []
    for i, w in enumerate(words):
        if i > 0 and w.lower() in particles:
            result.append(w.lower())
        else:
            result.append(w.capitalize())
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
