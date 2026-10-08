import unicodedata


def has_foreign_script(text: str) -> bool:
    """Wykrywamy zmiane alfabetu, nie oceniamy poprawnosci jezykowej, nazwy lacinskie i emoji sa dozwolone"""
    return any(
        character.isalpha() and "LATIN" not in unicodedata.name(character, "")
        for character in text
    )
