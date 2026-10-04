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
VITE_API_BASE=https://twoj-adres-ngrok.ngrok-free.dev
```
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