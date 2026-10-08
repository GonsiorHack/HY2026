# czyPrzejade Frontend – Svelte, Leaflet i Cypek

Frontend aplikacji czyPrzejade obejmuje mapę, katalog miejsc i zniżek, asystenta
Cypka oraz ustawienia dostępności. Projekt dotyczy miast w całej Polsce;
obecne dane demonstracyjne mapy i katalogu są głównie z Krakowa.

Przewodnik po katalogach i miejscach konfiguracji: [navigation.md](navigation.md).

---

## Wymagania i instalacja

Wymagany Node.js **22.12 lub nowszy** (zgodnie z wymaganiami Vite 8).
Polecenia wykonuj w `frontend`.

Zainstaluj zależności zapisane w lockfile, w tym Leaflet:

```bash
npm ci
```

---

## Konfiguracja adresu backendu (.env)

Aplikacja pobiera trasy z backendu (wystawionego przez tunel ngrok).

1. W głównym katalogu frontendu utwórz plik **`.env`**.
2. Wklej do niego adres działającego backendu:

```env
# Przykładowy adres HTTPS z tunelu ngrok:
VITE_API_BASE_URL=https://twoj-adres-ngrok.ngrok-free.dev
```

Na Vercelu ustaw `VITE_API_BASE_URL` w **Settings → Environment Variables** dla odpowiedniego środowiska (Production / Preview), a następnie wykonaj ponowne wdrożenie. Zmienne `VITE_*` są odczytywane podczas budowania, a lokalny plik `.env` nie jest wysyłany do repozytorium.

Obsługiwana jest również starsza nazwa `VITE_API_BASE`. Trasy i wyszukiwanie adresów korzystają wyłącznie z adresu ustawionego w zmiennych środowiskowych — bez zakodowanego adresu zastępczego. Brak obu zmiennych nie przerywa renderowania strony, ale próba pobrania tras lub adresów zgłasza błąd konfiguracji. Jawnie puste `VITE_API_BASE_URL=` włącza testowe trasy i wyłącza geokodowanie. Gdy tunel ngrok zmieni adres, zaktualizuj zmienną na Vercelu i wdróż aplikację ponownie.
---

## Uruchomienie aplikacji

Uruchom lokalny serwer developerski:

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: **http://localhost:5173** (lub innym wskazanym w konsoli).

---

## Funkcjonalności mapy

- **Porównanie tras:** Jednoczesna prezentacja standardowej trasy pieszej oraz wariantu omijającego znane przeszkody, bez gwarancji aktualności danych lub bezpieczeństwa.
- **Wybór punktów:** Kliknięcie dwóch punktów na mapie przelicza nową trasę pomiędzy nimi.

## Asystent AI z lokalną Ollamą

Karta **Asystent** udostępnia Cypka: przyjaznego, energicznego, ale profesjonalnego
asystenta AI. Ma formularz, historię rozmowy, stan oczekiwania i obsługę błędów.
Domyślnie korzysta z backendu AI pod `/api/chat`.
Historię przechowuje tylko w pamięci karty (odświeżenie strony ją usuwa).

### Uruchomienie lokalne

Uruchom Ollamę i pobierz model (jednorazowo):

```bash
ollama serve
# W drugim terminalu:
ollama pull qwen2.5:7b
```

Jeśli Ollama już działa, nie uruchamiaj drugiego serwera.
Następnie w katalogu `backend/`:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn chat_app:app --host 127.0.0.1 --port 8001
```

W katalogu frontendu uruchom `npm run dev`. Nie musisz zmieniać `.env`:
Vite przekazuje `/api/chat` do `http://127.0.0.1:8001`, a backend rozmawia
z Ollamą pod `http://127.0.0.1:11434`. Intro można pominąć, potem otworzyć
kartę **Asystent** i wysłać pytanie klawiszem Enter.

Konfigurację możesz skopiować z `.env.example` do własnego `.env`.
Przykład zmiany adresu lokalnego backendu:

```env
VITE_CHAT_MODE=api
VITE_CHAT_API_URL=/api/chat
CHAT_PROXY_TARGET=http://127.0.0.1:8001
```

Wbudowany backend mapowy również udostępnia `/api/chat`. Możesz uruchomić go
na porcie 8000 i ustawić `CHAT_PROXY_TARGET=http://127.0.0.1:8000`.
Osobny `chat_app.py` nie wymaga klucza ORS ani danych ML.

### Korzystanie z Asystenta

Przycisk **Nowy czat** w górnym pasku usuwa historię i wpisany tekst,
anuluje oczekiwanie na odpowiedź oraz kończy dyktowanie.
Nowa rozmowa nie przesyła poprzedniego kontekstu. Powitanie Cypka przy ikonie
jest elementem interfejsu, nie wiadomością wysyłaną do modelu.

Przykładowe pytanie **Jak korzystać z aplikacji?** otwiera krótką instrukcję.
Podstawowe odpowiedzi o tożsamości Cypka, autorach i obsłudze są zapisane
w `src/lib/features/chat/services/faq.ts` i nie wymagają połączenia z modelem.
Pozostałe pytania trafiają do backendu. Przy zmianie autorów aktualizuj FAQ,
backendowe `chat/identity.json` i `chat/context.md` razem.
Odpowiedzi są wyświetlane jako zwykły tekst, bez surowych znaczników pogrubienia Markdown.

Otwórz kartę **Asystent**, kliknij pole **W czym mogę pomóc?**, wpisz pytanie
i naciśnij Enter (na telefonie przycisk wysyłania na klawiaturze). Kliknięcie
przykładowego pytania wysyła je od razu. Podczas oczekiwania pole jest wyłączone;
po odpowiedzi możesz zadać pytanie uzupełniające w tej samej rozmowie.

Asystent pomaga w tematach dostępności, transportu, obiektów wszystkich miast Polski i obsługi
aplikacji. Prośby poza zakresem lub odrzucone przez weryfikator otrzymują wyjaśnienie.
Obecny prototyp mapy i katalog miejsc nadal zawierają głównie dane Krakowa;
ogólnopolski zakres asystenta nie oznacza pełnych danych mapowych dla każdego miasta.
Pod polem wiadomości widnieje wspólne przypomnienie:
**Sztuczna Inteligencja może się mylić. Sprawdzaj ważne informacje i zachowaj ostrożność.**
Nie jest powtarzane pod każdą odpowiedzią. To przypomnienie,
że odpowiedź modelu nie jest potwierdzeniem aktualnych danych ani bezpieczeństwa
trasy. Nie przekazuj danych wrażliwych; historię frontend wysyła do Twojego backendu
i lokalnej Ollamy, a przechowuje ją tylko do odświeżenia strony.

Jeśli pojawi się błąd połączenia, sprawdź, czy backend i Ollama działają.
`http://127.0.0.1:8001/api/chat/health` pokazuje gotowość skonfigurowanych modeli.
Wpisane pytanie pozostaje w polu, aby można było wysłać je ponownie.

### Ustawienia AI i kontekst

Odpowiedzi Cypka pojawiają się płynnie słowo po słowie, od lewej do prawej w kolejnych
liniach, również dla gotowych pytań. Tekst nie przesuwa się podczas animacji. To animacja
tekstu już otrzymanej odpowiedzi, nie strumieniowanie z modelu; respektuje
ustawienie **Asystent AI → Animowane odpowiedzi** (domyślnie włączone, także przy
systemowym ograniczeniu animacji). Wyłącz tę opcję, jeśli wolisz natychmiastowy tekst.
Tekst od początku zajmuje docelowe miejsce, podczas animacji nie przewijamy listy.

W **Ustawienia → Asystent AI** możesz wyłączyć kontekst rozmowy: następne pytania
nie będą przesyłać poprzednich wiadomości, choć historia nadal pozostaje widoczna.
**Nowy czat** usuwa także widoczną historię. Rozmowy nie aktualizują wag modelu;
kontekst służy wyłącznie bieżącej pomocy w dostępności i obsłudze aplikacji.

Opcja **Chcę pomagać w ulepszaniu AI** jest domyślnie wyłączona i zapisuje tylko
lokalną preferencję. Nie wysyła rozmów i nie uruchamia treningu. Ewentualny przyszły
program zbierania danych będzie wymagał osobnej, świadomej zgody.
Backend odrzuca prośby o nienawiść i dyskryminację, a kontrola odpowiedzi sprawdza
także takie treści. Zabezpieczenia modelowe nie gwarantują wykrycia każdego nadużycia.

### Dyktowanie wiadomości

Przycisk mikrofonu w polu wiadomości uruchamia rozpoznawanie mowy po polsku.
Zezwól przeglądarce na dostęp do mikrofonu i wypowiedz pytanie; ponowne kliknięcie
kończy dyktowanie. Rozpoznany tekst trafia do pola, nie jest wysyłany automatycznie:
sprawdź go, popraw w razie potrzeby i naciśnij Enter.

Funkcja wymaga obsługi Web Speech API oraz HTTPS lub localhost. Przy braku obsługi,
krótki komunikat znika po czterech sekundach; pisanie nadal działa.
Przy odmowie uprawnień albo błędzie mikrofonu pojawi się komunikat błędu.
Backend AI otrzymuje wyłącznie tekst. **Rozpoznawanie mowy może wysyłać audio do
zewnętrznej usługi dostawcy przeglądarki** — nie jest lokalną funkcją Ollamy i może
wymagać internetu. Nie dyktuj danych wrażliwych.

### Wdrożenie i tryb demonstracyjny

Proxy Vite działa wyłącznie w `dev` i `preview`. Na hostingu produkcyjnym
skonfiguruj reverse proxy `/api/chat` albo podaj pełny, osiągalny adres HTTPS:

```env
VITE_CHAT_MODE=api
# Pełny adres endpointu, nie sam adres serwera:
VITE_CHAT_API_URL=https://twoj-backend.example/api/chat
```

Ustaw `CHAT_ALLOWED_ORIGINS` na backendzie na adres frontendu przy połączeniu
między różnymi domenami. `localhost` użytkownika odwiedzającego stronę nie jest
Twoim serwerem: sama publikacja frontendu na Vercelu nie udostępnia lokalnej Ollamy.
Backend trzeba wdrożyć osobno. Przed publicznym udostępnieniem dodaj kontrolę
dostępu i limity ruchu na reverse proxy; CORS nie zastępuje uwierzytelniania.

Tryb demonstracyjny pozostaje dostępny wyłącznie po jawnym ustawieniu
`VITE_CHAT_MODE=mock`. W trybie `api`
awaria daje błąd w czacie, a nie odpowiedź demonstracyjną.
Adres czatu jest niezależny od `VITE_API_BASE_URL` używanego przez mapę.
Zmienne `VITE_*` są publiczne: nie umieszczaj w nich tokenów ani sekretów.

### Kontrakt backendu

Frontend wysyła `POST` z nagłówkiem `Content-Type: application/json`:

```json
{
	"messages": [{ "role": "user", "content": "Jak dotrzeć na Wawel bez schodów?" }]
}
```

Przy kolejnych pytaniach przesyła również ostatnie pary wiadomości użytkownika
i asystenta. Pytanie ma limit 2000 znaków; kontekst obejmuje najwyżej
9 poprzednich par i bieżące pytanie. Nie zawiera powitania ani odrzuconych par.

Odpowiedź HTTP 200 musi mieć ten format:

```json
{
	"reply": "Podaj proszę punkt startowy.",
	"verification": {
		"status": "accepted",
		"reason": "Pytanie dotyczy dostępności i poruszania się po mieście."
	}
}
```

`status` to `pending` (niezweryfikowane), `accepted` (zaakceptowane przez
weryfikator) lub `rejected` (odrzucone); `reason` jest opcjonalnym tekstem.
Przy odrzuceniu `reply` zawiera wyjaśnienie dla użytkownika. Awaria usługi
powinna dać odpowiedni błąd HTTP, nie `accepted`.

### Jak działa Ollama

Przepływ: **frontend → Twój backend `/api/chat` → weryfikator Ollama
→ model odpowiadający → kontrola zgodności odpowiedzi → frontend**.
Domyślnie wszystkie role pełni `qwen2.5:7b`, zwykle w trzech osobnych wywołaniach.
Gotowe FAQ omijają model, odrzucenie pytania kończy się po klasyfikacji,
a korekta języka może wymagać dodatkowego wywołania. Modele możesz zmienić przez
`OLLAMA_MODEL` i `OLLAMA_VERIFY_MODEL` na backendzie.

Backend waliduje strukturę, role, rozmiar danych i całą niezaufaną historię.
Następnie pyta Ollamę o ocenę wiadomości według ustalonych przez Ciebie reguł.
Przy `rejected` nie wywołuje modelu odpowiadającego; przy `accepted` pobiera
odpowiedź, sprawdza jej język i zgodność z kontekstem, następnie zwraca powyższy JSON.
To odrębne zadania, nawet jeśli wykorzystają ten sam model.
Prompt systemowy, adres Ollamy i ewentualne sekrety należą do
backendu, nie do przeglądarki. Backend obsługuje timeouty i sprawdza
strukturę odpowiedzi modelu. Sam frontend czeka na całą odpowiedź do 120 sekund
(na razie bez streamingu).

Ocena językowego modelu nie jest sprawdzeniem faktów. Jeśli chcesz weryfikować
np. zgłoszenie schodów, backend musi porównać je z wiarygodnymi danymi mapy
lub skierować do ręcznej oceny. Nie zapisuj zmian na mapie wyłącznie na
podstawie decyzji AI.

Dla osobnego backendu skonfiguruj CORS dla adresu frontendu oraz żądań `POST`
z nagłówkami `Content-Type` i `ngrok-skip-browser-warning`. Na stronie HTTPS
używaj również endpointu HTTPS.

Komentarze objaśniające implementację znajdziesz w:
`src/lib/features/chat/ChatbotTab.svelte`, `src/lib/features/chat/services/chat.ts`
i `src/lib/features/chat/types/chat.ts`.

Kod backendu jest w `../backend/chat/`; instrukcja i ograniczenia wdrożenia:
[README backendu](../backend/README_BACKEND.md).

Kontekst Cypka o kartach, przyciskach i możliwościach aplikacji jest zapisany w
[`../backend/chat/context.md`](../backend/chat/context.md). Aktualizuj go przy zmianach
interfejsu i restartuj backend. Nie zawiera aktualnych danych mapowych.
Cypek ma odpowiadać po polsku; obcy alfabet powoduje jedną próbę ponownej generacji,
a jeśli nadal występuje — komunikat błędu zamiast wadliwej odpowiedzi.
Przed wyświetleniem odpowiedzi backend dodatkowo sprawdza jej zgodność z kontekstem
aplikacji. Wykryte niepoparte twierdzenia powodują błąd zamiast pokazania treści.
Ta kontrola AI też jest omylna; nie zastępuje oficjalnych źródeł.
Odpowiedzi kończą się krótkim, życzliwym zdaniem dopasowanym do pytania,
np. „Miłej wizyty!”.

## Intro z automatycznym odtwarzaniem

Umieść nowe intro w `static/media/intro/intro.mp4` (MP4 z obrazem H.264, bez dźwięku).
Adres pliku jest ustawiony w `src/lib/config/app.ts`.
`src/lib/components/shell/SplashScreen.svelte` próbuje odtworzyć ten plik, również na Safari
i iOS. Film kończy się na zdarzeniu `ended`, niezależnie od długości.

Intro od początku jest wyciszone (`autoplay`, `muted`, `playsinline`).
Nie próbuje odtwarzać dźwięku ani prosić o zgodę na niego.
Przycisk odtworzenia pojawia się tylko wtedy, gdy przeglądarka blokuje wyciszony film.
Przycisk **Pomiń** jest zawsze dostępny.

Przy braku pliku, błędzie formatu lub braku postępu przez 12 sekund aktywnej
karty pojawia się komunikat błędu z możliwością ponowienia próby lub pominięcia.
Intro używa wyłącznie `intro.mp4` (wcześniej `splashNoSound.mp4`), bez podmieniania go na stare materiały.
Ukrycie karty wstrzymuje film i odliczanie czasu; powrót wznawia odtwarzanie.
Intro próbuje odtwarzać się automatycznie również przy systemowym ustawieniu
„ogranicz ruch”. Przycisk **Pomiń** pozwala natychmiast zakończyć animację.

## Porządek w kodzie

`npm run check` sprawdza typy, komponenty Svelte oraz nieużywane lokalne
zmienne, importy i parametry. `npm run lint` sprawdza formatowanie;
`npm run format` je ujednolica.

Katalog `.svelte-kit/` jest generowany przez SvelteKit i nie należy do kodu
źródłowego. Podobnie jak `node_modules/` i wynik budowania jest pomijany
przez Git i formatter. Nie edytuj plików generowanych ręcznie.
