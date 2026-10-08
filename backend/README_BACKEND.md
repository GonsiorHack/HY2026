# czyPrzejade Backend – Routing API

Backend aplikacji oparty na frameworku **FastAPI** oraz silniku **OpenRouteService (ORS)**. Odpowiada za dynamiczne kalkulowanie tras dla osób z ograniczeniami ruchowymi, omijanie barier architektonicznych (wykrytych przez model ML) oraz serwowanie geometrii stref dla frontendu (Svelte/Leaflet).

---

## UWAGA: Zależność od modułu Machine Learning!

Backend pobiera geometrię barier bezpośrednio z plików wygenerowanych przez moduł sztucznej inteligencji.

**Zanim uruchomisz serwer backendowy, upewnij się, że zapoznałeś/aś się z README.md w folderze machinelearning oraz wykonałeś/aś odpowiednie kroki.**
1. W module ML został uruchomiony trening (`train_model.py`).
2. Został uruchomiony skrypt analityczny (`analyze_map_data.py`).
3. Folder **`analyzed_data/`** (zawierający plik `all_zones.geojson` oraz podfoldery z wynikami) wygenerował się prawidłowo

```text
machinelearning/
├── analyzed_data/
│   └── all_zones.geojson    # WYMAGANE: Wynik działania pipeline'u ML!
├── data/         # Opcjonalne ręczne strefy zamknięte
├── surface_model.pth
└── train_model.py
```

*Bez folderu `analyzed_data` backend nie będzie wiedział, które obszary omijać i trasy bezpieczne nie zostaną poprawnie wyznaczone!*

---

## Konfiguracja klucza OpenRouteService (.env)

Aplikacja korzysta z silnika routingu OpenRouteService. Aby uzyskać bezpłatny klucz API:

1. Wejdź na stronę: **[https://openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)** i załóż darmowe konto.
2. Po zalogowaniu przejdź do zakładki **Key**: [https://openrouteservice.org/dev/#/home](https://openrouteservice.org/dev/#/home)
3. Kliknij **Request a Token**, wybierz typ tokena: **Standard (Free)**, wpisz nazwę (np. `WheelRoute`) i zatwierdź.
4. Skopiuj wygenerowany ciąg znaków (klucz API).
5. W katalogu `backend/` utwórz plik o nazwie **`.env`** i wklej do niego swój klucz:

```env
5b3ce3597851110001cf6248...
```

---

## Instalacja zależności

Wymagany Python 3.10+. Zainstaluj pakiety:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

---

## 🏃 Uruchomienie lokalne

Uruchom serwer developerski poleceniem:

```bash
.venv/bin/uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Po uruchomieniu:
* **Interaktywna dokumentacja Swagger UI:** http://localhost:8000/docs

---

## Lokalny czat Ollama (niezależny od ORS i ML)

Wszystkie polecenia wykonuj z katalogu `backend`. Czat wymaga
działającego Ollama i lokalnie dostępnego modelu:

```bash
ollama serve                         # tylko jeśli usługa jeszcze nie działa
ollama pull qwen2.5:7b               # tylko jeśli model nie jest zainstalowany
export OLLAMA_BASE_URL=http://127.0.0.1:11434
export OLLAMA_MODEL=qwen2.5:7b
# Opcjonalnie osobny klasyfikator; domyślnie ten sam model:
export OLLAMA_VERIFY_MODEL=qwen2.5:7b
.venv/bin/uvicorn chat_app:app --host 127.0.0.1 --port 8001
```

Alternatywnie wspólna aplikacja `main:app` na porcie 8000 obsługuje mapę i
identyczne endpointy czatu. Brak pliku `.env` nie blokuje startu: endpointy tras
zwrócą 503 bez klucza ORS. Sam czat nie czyta klucza, plików ani wyników ML.
Dotychczasowy format `.env` (sam klucz ORS) pozostaje bez zmian.
**Nie kopiuj `.env.example` do `.env`!** Przykład dokumentuje zmienne procesu;
żaden moduł czatu nie ładuje pliku dotenv. Użyj `export NAZWA=wartość`.

```bash
curl --fail-with-body http://127.0.0.1:8001/api/chat/health
curl --fail-with-body http://127.0.0.1:8001/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"Jak sprawdzić dostępność tramwaju w Krakowie?"}]}'
.venv/bin/python -m unittest discover -s tests -v
```

`POST /api/chat` przyjmuje wyłącznie `messages`, maksymalnie 19 wiadomości
(9 par i aktualne pytanie), naprzemiennie `user`/`assistant`, początek i koniec
`user`. Nie przyjmuje roli `system` ani dodatkowych pól. Treść jest przycinana
z białych znaków i nie może być pusta: do 2000 znaków dla użytkownika, 8000 dla
odpowiedzi historii. Limit surowego body wynosi 128 KiB, sprawdzany przed JSON.
Generator dostaje tylko najnowsze pełne pary mieszczące się razem z bieżącym
pytaniem w 6000 znaków; starsza historia może zostać pominięta.

Odpowiedź: `{"reply":"...","verification":{"status":"accepted"}}` lub
`{"reply":"...","verification":{"status":"rejected","reason":"..."}}`.
Najpierw model klasyfikuje **zakres i bezpieczeństwo ostatniego pytania**,
nie prawdziwość faktów ani dostępność trasy. Wynik musi spełnić ścisły schemat JSON.
Odrzucenie nie uruchamia generatora. Nietypowy zapis zwykłego pytania o dostępność
sam w sobie nie jest podstawą odmowy. Generator dostaje własny prompt systemowy
i niezaufaną historię; odpowiada zwięźle po polsku, bez narzędzi/zapisu mapy.
Nie ma dostępu do aktualnych danych i nie może potwierdzić przejezdności trasy.
Klasyfikacja modelowa jest omylna, nie stanowi gwarancji bezpieczeństwa.

`GET /api/chat/health` rzeczywiście sprawdza `/api/tags`. `status: ready` oznacza
osiągalne Ollama i **oba modele dostępne na dysku**, nie załadowane do RAM/GPU,
nie rozgrzany model, nie gwarancję udanej generacji ani aktualnych danych mapy.
Brak usługi/modelu daje 503. Błędy: 422 walidacja, 413 rozmiar body,
429 zajęte sloty (Retry-After), 503 połączenie/model, 504 timeout,
502 błędna odpowiedź upstream. Błędy nie udają udanej odpowiedzi czatu.

Konfiguracja (domyślne wartości w `.env.example`):

| Zmienna | Domyślnie |
| --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | `qwen2.5:7b` |
| `OLLAMA_VERIFY_MODEL` | wartość `OLLAMA_MODEL` |
| `OLLAMA_REQUEST_TIMEOUT_SECONDS` | 50 na wywołanie (maksimum 50 s) |
| `CHAT_TOTAL_TIMEOUT_SECONDS` | 110 łącznie dla weryfikacji i generacji |
| `CHAT_MAX_CONCURRENT_REQUESTS` | 2 |
| `CHAT_ACQUIRE_TIMEOUT_SECONDS` | 1 |
| `CHAT_ALLOWED_ORIGINS` | localhost i 127.0.0.1, porty 5173 oraz 4173 |

Originy to lista rozdzielona przecinkami, np.
`export CHAT_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`.
Obie aplikacje korzystają z tej samej jawnej listy CORS (bez `*` i credentials).
Klient powinien mieć timeout co najmniej 120 sekund; zimny start może przekroczyć
limity, więc dobierz model/sprzęt lub kontrolowanie zwiększ limit. AsyncClient
jest współdzielony w lifespan i zamykany przy wyłączeniu; `trust_env=False`
wyłącza proxy środowiskowe dla Ollama. Odpowiedzi upstream ograniczono do 256 KiB.

### Kontekst aplikacji i język Cypka

Potwierdzone nazwy i autorzy są dodatkowo w `chat/identity.json`.
`chat/identity.py` odpowiada na rozpoznane pytania o tożsamość, twórców
i ich role bez wywoływania modelu. Dzięki temu Ollama nie może zmienić autorstwa
na urząd miasta ani odrzucić pytania o @sh3kda. Krótkie sprostowania, np.
„nieprawda”, korzystają z tematu wcześniejszych pytań, nie z fałszywych odpowiedzi.
Przy zmianie autorów aktualizuj ten plik, kontekst i frontendowe
`../frontend/src/lib/features/chat/services/faq.ts` razem.
Ta obsługa dotyczy rozpoznanych sformułowań; pozostałe odpowiedzi nadal są modelowe.

Po zmianie kodu restartuj backend; do lokalnego developmentu możesz użyć
`.venv/bin/uvicorn chat_app:app --reload --host 127.0.0.1 --port 8001`.
Odśwież frontend, aby usunąć wcześniejszą błędną historię z pamięci karty.

Wiedza o interfejsie jest w `chat/context.md`. Edytuj ten plik, gdy zmieniasz
nazwy kart, przycisków, funkcje lub ograniczenia aplikacji. Backend wczytuje go
przy starcie przez `chat/context.py`, niezależnie od katalogu uruchomienia.
Po zmianie uruchom serwer ponownie. Brak pliku, pusty plik lub przekroczenie
12000 znaków zatrzymuje start: czat nie udaje wtedy, że zna aplikację.
Nie wpisuj tam sekretów ani niepotwierdzonych informacji o przejezdności.
To kontekst systemowy z backendu, nie edytowalna historia klienta.

Plik obejmuje także genezę HackYeah, autorów i role zespołu GonsiorHack,
architekturę, misję oraz plany biznesowe na podstawie `../README.md`.
Rozróżnia opis prototypu od planowanych funkcji i od gwarancji dostępności.
Przy zmianach autorstwa lub planów aktualizuj oba dokumenty; nie dopisuj
niepotwierdzonych partnerstw, nagród ani danych osobowych.
Ollama dostaje okno kontekstu 16384 tokenów, aby pomieścić wiedzę projektu
i ograniczoną historię; wymaga to więcej pamięci niż wcześniejsze 8192.

Prompt w `chat/service.py` określa osobowość Cypka i wymaga odpowiedzi po polsku,
również gdy rozmówca próbuje zmienić język. `chat/language.py` wykrywa litery
spoza alfabetu łacińskiego (np. chińskie); nazwy łacińskie i emoji są dozwolone.
Przy wykryciu takich znaków w odpowiedzi generator dostaje jedną próbę ponownej
generacji w ramach istniejącego łącznego timeoutu. Ponowny błąd daje jawne HTTP 502,
nie błędną odpowiedź. Obcy alfabet w wyjaśnieniu weryfikatora także daje 502.
Ta kontrola nie rozpoznaje wszystkich języków pisanych alfabetem łacińskim,
nie ocenia gramatyki ani prawdziwości faktów. Język modelu nadal może być niedoskonały.

### Ograniczenia wdrożenia

Czat nie uczy się trwale z rozmów i nie zapisuje ich do treningu. Ustawienie
frontendu dotyczące ulepszania AI zapisuje wyłącznie lokalną preferencję,
nie jest przesyłane do backendu i nie uruchamia zbierania danych.
Wyłączenie kontekstu rozmowy przesyła tylko bieżące pytanie.
Prompty klasyfikatora, generatora i kontroli zgodności zabraniają promowania
nienawiści, nazizmu, ekstremizmu i dyskryminacji, dopuszczając edukację i wsparcie
ofiar. Są to omylne zabezpieczenia modelowe, nie gwarancja wykrycia każdego nadużycia.

Przed pokazaniem wygenerowanej odpowiedzi `chat/grounding.py` wykonuje osobne
wywołanie modelu: porównuje ją z `chat/context.md` i sprawdza, czy nie wymyśla
funkcji, konkretnych danych lub sprawdzenia dostępności na żywo. Niezgodna
odpowiedź jest wstrzymana i daje jawny błąd 502. To dodatkowa modelowa kontrola,
nie dowód prawdziwości: także kontroler może się pomylić. Czat wykonuje zwykle
trzy wywołania zamiast dwóch, w ramach tego samego łącznego timeoutu.

`chat/closings.py` dodaje krótkie pozytywne zakończenie związane z pytaniem,
np. „Miłej wizyty!” przy muzeum. Zakończenia nie obiecują bezpieczeństwa trasy.

To bazowa konfiguracja **lokalnego developmentu**, nie serwer utwardzony do
Internetu. Nie logujemy treści rozmów (nie włączaj logowania HTTP body).
Limiter jest wyłącznie w pamięci jednego procesu; wiele workerów ma niezależne
sloty. Nie ma uwierzytelniania, trwałego rate limiting per użytkownik, ochrony
przed wolnym wysyłaniem body ani trwałego audytu. CORS nie jest autoryzacją:
klienci spoza przeglądarki nadal mogą wysłać żądania. Wiąż serwer do loopback;
nie wystawiaj Ollama publicznie. Przed zdalnym wdrożeniem dodaj kontrolę dostępu,
TLS/reverse proxy, limity ruchu/body/czasu odczytu i monitoring bez rozmów.
Nie traktuj odpowiedzi LLM ani klasyfikacji jako źródła bezpiecznej nawigacji.

## Udostępnianie przez ngrok (wyłącznie kontrolowane demo mapy)

Poniższy tunel nie zapewnia sam z siebie kontroli dostępu do czatu. Nie używaj
go publicznie bez zabezpieczeń opisanych wyżej; wspólna aplikacja udostępnia też czat.

Aby frontend (np. w Svelte) mógł komunikować się z lokalnym backendem przez Internet:

1. Uruchom tunel na porcie 8000:
```bash
ngrok http 8000
```
2. Skopiuj wygenerowany adres HTTPS (np. `[https://xxxx-xxxx.ngrok-free.dev](https://xxxx-xxxx.ngrok-free.dev)`).
3. Ustaw ten adres jako `VITE_API_BASE_URL` w środowisku frontendu i uruchom go
   ponownie lub przebuduj, zgodnie z [README frontendu](../frontend/README.md).
