# 🛰️ PMS - Poland Mission System v2.2
### Advanced Traffic Intelligence & News Aggregator

[![GitHub Pages](https://img.shields.io/badge/Host-GitHub%20Pages-blue?style=flat-square&logo=github)](https://TrafficMMISSIONcontrol.github.io/PMS.github.io/)
[![Leaflet](https://img.shields.io/badge/Engine-Leaflet.js-green?style=flat-square&logo=leaflet)](https://leafletjs.com/)
[![Data Source](https://img.shields.io/badge/Data-GOV.pl%20%7C%20GDDKiA-orange?style=flat-square)](https://dane.gov.pl)
[![License](https://img.shields.io/badge/License-MIT-red?style=flat-square)](LICENSE)

**PMS (Poland Mission System)** to nowoczesny, otwartoźródłowy dashboard typu *Mission Control* do monitorowania polskiej infrastruktury drogowej w czasie rzeczywistym. System agreguje dane z systemów rządowych, infrastruktury krytycznej oraz mediów, dostarczając pełny obraz sytuacji na drogach w jednym, responsywnym interfejsie.

---

## 🛠️ Stack Technologiczny

* **Frontend:** HTML5 / Modern CSS (Dark Mode Optimization)
* **Engine Mapy:** [Leaflet.js](https://leafletjs.com/) – lekka i wydajna biblioteka do interaktywnych map.
* **Data Fetching:** Native JavaScript (Fetch API) – brak ciężkich zależności i frameworków.
* **API:** Overpass API (OpenStreetMap) oraz publiczne dane GDDKiA.

---

## 🚀 Kluczowe Funkcje

* **📍 Inteligentna Mapa (Leaflet):** Interaktywna wizualizacja zdarzeń drogowych (wypadki, blokady, roboty drogowe) z precyzyjną lokalizacją.
* **🚨 Safety Intelligence:** Baza fotoradarów oraz odcinkowych pomiarów prędkości pobierana bezpośrednio przez Overpass API.
* **📰 News Feed:** Agregator wiadomości drogowych (RSS) z inteligentnym sortowaniem według województw i numerów dróg (A1, S8, DK94 itp.).
* **⚡ Zero-Server Architecture:** Projekt w pełni statyczny, zoptymalizowany pod darmowy i szybki hosting GitHub Pages.
* **📱 Tactical UI:** Interfejs typu "Mission Control" w trybie Dark Mode, dostosowany do pracy w trasie na urządzeniach mobilnych.

---

## 📊 Ekosystem Danych

Projekt bazuje na transparentności i wykorzystuje publicznie dostępne dane:
* **[Dane.gov.pl](https://dane.gov.pl)** – API utrudnień drogowych i zdarzeń GDDKiA.
* **[OpenStreetMap](https://www.openstreetmap.org/)** – Infrastruktura drogowa i punkty kontroli przez Overpass API.
* **[Leaflet](https://leafletjs.com/)** – Renderowanie warstw mapy i interakcja z użytkownikiem.

---

## 🏗️ Jak zacząć?

Strona jest dostępna pod adresem:  
👉 **[https://PMS.github.io/](https://PMS.github.io/)**

Jeśli chcesz rozwijać projekt lokalnie:

1.  **Sklonuj repozytorium:**
    ```bash
    git clone [https://github.com/TrafficMMISSIONcontrol/PMS.github.io.git](https://github.com/TrafficMMISSIONcontrol/PMS.github.io.git)
    ```
2.  **Uruchomienie:**
    Otwórz plik `index.html` bezpośrednio w przeglądarce.

---

## 🛡️ Licencja

Projekt udostępniany na licencji **MIT**. Możesz go dowolnie modyfikować i rozwijać.
