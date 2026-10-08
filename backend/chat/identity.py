import json
import re
import unicodedata
from pathlib import Path

from pydantic import Field

from .schemas import ChatRequest, StrictModel


class Member(StrictModel):
    name: str = Field(min_length=1)
    handle: str = Field(min_length=1)
    role: str = Field(min_length=1)


class Identity(StrictModel):
    assistant_name: str = Field(min_length=1)
    app_name: str = Field(min_length=1)
    team_name: str = Field(min_length=1)
    team_description: str = Field(min_length=1)
    members: list[Member] = Field(min_length=1)


def normalized(text: str) -> str:
    text = text.casefold().replace("ł", "l")
    return "".join(
        char for char in unicodedata.normalize("NFKD", text)
        if not unicodedata.combining(char)
    )


class IdentityAnswers:
    def __init__(self):
        path = Path(__file__).with_name("identity.json")
        self.data = Identity.model_validate(json.loads(path.read_text(encoding="utf-8")))

    def answer_question(self, question: str) -> str | None:
        text = normalized(question)
        creator_question = re.search(
            r"\bkto\b.{0,60}\b(stworzyl|stworzyliscie|napisal|opracowal|tworzy|zrobil)\b"
            r"|\b(tworca|tworcy|tworcow|autor|autorzy|autorstwo|gonsiorhack|smartkrakow)\b"
            r"|\b(opowiedz|czym jest|co to|sponsor|inwestor|wspolpraca)\b.{0,60}"
            r"\b(projekt|projekcie|czyprzejade)\b",
            text,
        )
        member_question = re.search(
            r"\b(kojarzysz|znasz|kim|kto|napisal|stworzyl|tworzy|autor|zespol|rola)\b",
            text,
        ) and any(
            normalized(member.handle) in text or normalized(member.name) in text
            for member in self.data.members
        )
        if creator_question or member_question:
            team = self.data
            members = "\n".join(
                f"- {member.name} ({member.handle}): {member.role}."
                for member in team.members
            )
            return (
                f"{team.app_name} tworzy {team.team_name}, {team.team_description}:\n{members}\n\n"
                f"Jestem {team.assistant_name}, asystent AI tego projektu. "
                "Projekt nie jest autorstwa miasta Krakowa ani komisji miejskiej. "
                "Korzystam z modelu językowego przez Ollamę; zespół nie wytrenował "
                "tego modelu od podstaw.\n\n"
                "Rozwijamy projekt dla miast całej Polski. Szukamy sponsorów, inwestorów, "
                "wsparcia infrastruktury oraz partnerów samorządowych i wdrożeniowych. "
                "Jeśli chcesz wesprzeć czyPrzejade, znajdziesz zespół na "
                "https://github.com/GonsiorHack."
            )
        if re.search(
            r"\b(kim jestes|kto ty jestes|jak (masz|ci) na imie|jak sie nazywasz"
            r"|przedstaw sie|co potrafisz)\b", text,
        ):
            return (
                f"Jestem {self.data.assistant_name}, Twój asystent AI w {self.data.app_name}! "
                "Pomogę Ci w obsłudze aplikacji i przygotowaniu podróży "
                "po miastach w całej Polsce. Nie sprawdzam na żywo przejezdności "
                "ani nie klikam w aplikacji za Ciebie."
            )
        return None

    def answer(self, request: ChatRequest) -> str | None:
        current = request.messages[-1].content
        if re.fullmatch(
            r"(nie[ ,.!?]*)*(nieprawda|to nieprawda|to nie prawda|blad|mylisz sie)"
            r"[ ,.!?]*", normalized(current).strip(),
        ):
            # Nie ufamy poprzednim odpowiedziom; sprawdzamy temat poprzedniego pytania
            for message in reversed(request.messages[:-1]):
                if message.role == "user":
                    reply = self.answer_question(message.content)
                    if reply is not None:
                        return "Dzięki za sprostowanie. Podaję potwierdzone informacje:\n\n" + reply
            return (
                "Dzięki za zwrócenie uwagi. Nie będę powtarzać niepotwierdzonej informacji. "
                "Który fragment mam wyjaśnić lub poprawić?"
            )
        return self.answer_question(current)
