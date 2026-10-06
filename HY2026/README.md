# 🦽 CzyPrzejadę — Smart Mobility & Accessibility Engine for Krakow

> Autorski system routingowy optymalizujący trasy piesze pod kątem pełnej dostępności architektonicznej. Rozwiązanie integruje mikroserwisy webowe, silnik GIS oraz pipeline Computer Vision analizujący stan i rodzaj nawierzchni miejskich w czasie rzeczywistym.

---

## 📌 Problem + Wizja

Standardowe algorytmy routingu (np. Dijkstra, A*) minimalizują wyłącznie odległość lub czas przejścia. W warunkach gęstej, historycznej tkanki miejskiej podejście to generuje trasy z barierami nie do pokonania dla osób z ograniczoną mobilnością (wózki manualne i elektryczne, seniorzy, wózki dziecięce).

CzyPrzejadę rozwiązuje ten problem poprzez dynamiczny dual-routing:
1. Ścieżka Standardowa: Klasyczny profilt trasy znany z innych aplikacji
2. Ścieżka Bez Barier: Wyznaczana z dynamicznym omijaniem stref zdefiniowanych na podstawie analizy parametrów przejezdności i barier terenowych.

---

## Architektura

System opiera się na separacji warstwy analitycznej (ML/GIS), silnika REST API oraz reaktywnego klienta mapowego:

[ Frontend Client ] ──(REST / GeoJSON)──► [ Core API (FastAPI) ] ──► [ Custom GIS Engine ]
  SvelteKit + Leaflet                       Middleware & Router           Spatial Routing Graph
          │                                          ▲
          │                                          │ (Ingest Polygons)
          ▼                                          │
    UX Analytics                             [ CV / ML Pipeline ]
                                            MobileNetV2 Classification

### Komponenty Systemu

* Spatial Intelligence & CV Pipeline:
  * Model oparty na architekturze MobileNetV2 wytrenowany techniką Transfer Learning na krakowskich zbiorach zdjęć ulicznych.
  * Klasyfikacja rodzaju nawierzchni (bruk, asfalt, płyta, stopnie) z ekstrakcją metryk passability_score oraz flag barierowych avoid: true.
  * Generowanie spójnych przestrzennie warstw wielokątów barier w standardzie GeoJSON (RFC 7946).

* Backend Routing Core (FastAPI):
  * Asynchroniczne REST API przetwarzające żądania routingu wielokryterialnego.
  * Dynamiczna agregacja poligonów barier i wstrzykiwanie ich w parametry routingu silnika OpenRouteService.
  * Zabezpieczenia domenowe (geofencing) ograniczające obliczenia wyłącznie do obszaru metropolitalnego Krakowa.

* Reaktywny Interfejs Użytkownika (SvelteKit + Leaflet):
  * Klient zoptymalizowany pod kątem urządzeń mobilnych (mobile-first architecture).
  * Renderowanie wektorowe tras i stref dostępności na warstwach OpenStreetMap.
  * Pełna zgodność ze standardami dostępności cyfrowej (WCAG/a11y): dynamiczny kontrast, profile użytkownika, skalowanie interfejsu.

---

## 💡 Kluczowe Moduły & Rozwiązania Techniczne

| Moduł | Rola Architektoniczna | Wyzwanie Inżynierskie |
| :--- | :--- | :--- |
| Real-time Dual Routing | Równoległe generowanie i porównywanie geometrii tras. | Optymalizacja latencji przy jednoczesnym nakładaniu restrykcji poligonowych na graf drogowy. |
| Edge Avoidance Engine | Tłumaczenie wyników modelu CV na parametry routingu. | Płynne łączenie punktowych predykcji ML w spójne strefy przestrzenne (Spatial Clustering). |
| Geofencing & Validation | Ograniczenie zapytań do strefy miejskiej Krakowa. | Eliminacja zapytań spoza wspieranego obszaru przed uderzeniem do zewnętrznych dostawców geokodowania. |
| Crowdsourced Audit UX | Moduł zgłaszania barier terenowych. | Zapewnienie intuicyjnego pipeline'u zbierania danych fotograficznych bez obciążania pamięci przeglądarki. |
| Directory of Accessible Places | Baza obiektów użyteczności publicznej ze wskaźnikami dostępności. | Ustrukturyzowany model danych dla zróżnicowanych cech architektonicznych (windy, podjazdy, toalety OzN). |

---

## 🛠️ Stack Technologiczny

* Core & Architecture: Microservices Pattern, RESTful API Design, GIS Data Engineering
* Machine Learning / Computer Vision: Python, PyTorch, MobileNetV2, Transfer Learning, NumPy
* Backend: Python, FastAPI, Uvicorn, Requests, Pydantic, GeoJSON
* Frontend: SvelteKit, TypeScript, Vite, Leaflet, PostCSS / Tailwind CSS
* GIS & Mapping: OpenRouteService (Spatial Engine), OpenStreetMap, Nominatim API

---

## 🗺️ Roadmap & Rozwój Platformy

- [x] Opracowanie pipeline'u klasyfikacji nawierzchni miejskich (ML)
- [x] Wdrożenie mechanizmu dynamicznego omijania stref w routingu
- [x] Budowa responsywnego interfejsu klienta z wizualizacją wariantów tras
- [x] Moduł parametryzacji dostępności i profili użytkownika
- [ ] Implementacja grafowej bazy danych do modelowania mikrosieci chodnikowych
- [ ] Dedykowany asystent kontekstowy wspomagający nawigację indoor/outdoor
- [ ] Integracja z miejskimi danymi otwartymi (remonty i utrudnienia w czasie rzeczywistym)

---

## 👤 Autorzy

Projekt zrealizowany w myśl o ososbach z niepełnosprawnościami w ramach badań nad dostępnością cyfrową i urbanistyczną przestrzeni miejskiej.

**[Franciszek](https://github.com/sh3kda) -> Fullstack Dev
**[Piotr](https://github.com/GaskaPiotr) -> Backend / AI Dev
**[Antoni](https://github.com/Antoine052) -> Data Analyst