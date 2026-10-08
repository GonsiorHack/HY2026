def positive_closing(question: str, *, rejected: bool = False) -> str:
    if rejected:
        return "Chętnie pomogę Ci w sprawach dostępności i obsługi aplikacji!"
    topic = question.casefold()
    if any(word in topic for word in ("muzeum", "wystawa", "wawel", "zwiedzanie")):
        return "Udanej wizyty!"
    if any(word in topic for word in ("tras", "dojazd", "podróż", "tramwaj", "autobus", "start", "cel")):
        return "Życzę Ci spokojnej podróży!"
    if any(word in topic for word in ("zniż", "kart", "ulg", "dokument")):
        return "Powodzenia w załatwianiu formalności!"
    if any(word in topic for word in ("ustawie", "tekst", "motyw", "kontrast", "mikrofon")):
        return "Korzystaj z aplikacji po swojemu!"
    return "Działajmy razem, krok po kroku!"


def append_closing(reply: str, question: str, *, rejected: bool = False) -> str:
    closing = positive_closing(question, rejected=rejected)
    if reply.rstrip().endswith(closing):
        return reply
    return f"{reply.rstrip()}\n\n{closing}"
