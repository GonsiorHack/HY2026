from pathlib import Path

CONTEXT_PATH = Path(__file__).with_name("context.md")
MAX_CONTEXT_CHARACTERS = 12000


def load_app_context() -> str:
    # Zaufana wiedza pochodzi z pliku backendu, nigdy z historii przegladarki
    context = CONTEXT_PATH.read_text(encoding="utf-8").strip()
    if not context or len(context) > MAX_CONTEXT_CHARACTERS:
        raise ValueError("Chat context must contain 1-12000 characters")
    return context
