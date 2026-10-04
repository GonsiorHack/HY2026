# czyPrzejade Frontend – Interfejs Mapowy (Svelte + Leaflet)

Frontend aplikacji czyPrzejade odpowiedzialny za interaktywną wizualizację mapy Krakowa, prezentację oraz porównanie tras pieszych i wózkowych.

---

## Wymagania i instalacja

Wymagane środowisko Node.js (v18 lub nowsze).

1. Zainstaluj bibliotekę mapową Leaflet:
```bash
npm install leaflet
```

2. Zainstaluj pozostałe zależności projektu:
```bash
npm install
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

* **Porównanie tras:** Jednoczesna prezentacja standardowej trasy pieszej oraz trasy bezpiecznej omijającej zidentyfikowane przeszkody.
* **Wybór punktów:** Kliknięcie dwóch punktów na mapie przelicza nową trasę pomiędzy nimi.