# 🛰️ PMS - Poland Mission System v2.2
### Advanced Traffic Intelligence & News Aggregator

[![GitHub Pages](https://img.shields.io/badge/Host-GitHub%20Pages-blue?style=flat-square&logo=github)](https://TrafficMMISSIONcontrol.github.io/PMS.github.io/)
[![Leaflet](https://img.shields.io/badge/Engine-Leaflet.js-green?style=flat-square&logo=leaflet)](https://leafletjs.com/)
[![Data Source](https://img.shields.io/badge/Data-GOV.pl%20%7C%20GDDKiA-orange?style=flat-square)](https://dane.gov.pl)
[![License](https://img.shields.io/badge/License-MIT-red?style=flat-square)](LICENSE)

**PMS (Poland Mission System)** is a modern, open-source *Mission Control* dashboard for real-time monitoring of Polish road infrastructure. The system aggregates data from government APIs, critical infrastructure sensors, and traffic news to provide a comprehensive situational overview in a responsive interface.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5 / Modern CSS (Dark Mode Optimization)
* **Map Engine:** [Leaflet.js](https://leafletjs.com/) – Lightweight, high-performance interactive mapping.
* **Data Fetching:** Native JavaScript (Fetch API) – Zero backend dependencies.
* **Geospatial Data:** Overpass API (OpenStreetMap) and GDDKiA public endpoints.

---

## 🚀 Key Features

* **📍 Tactical Map (`mapa/index.html`):** Interactive Leaflet-based visualization of traffic events (accidents, roadblocks, construction) with precise GPS localization.
* **🚨 Safety Intelligence:** Real-time synchronization of speed cameras and average speed check zones via Overpass API.
* **📰 Smart News Feed (`news.html`):** Traffic news aggregator with automatic categorization by voivodeships and road numbers (A1, S8, DK94, etc.).
* **⚡ Zero-Server Architecture:** Fully static project optimized for GitHub Pages, ensuring high availability and low latency.
* **📱 Mission Control UI:** Professional Dark Mode interface designed for high legibility in low-light environments and mobile use.

---

## 📊 Data Ecosystem

The project relies on transparent, public data sources:
* **[Dane.gov.pl](https://dane.gov.pl)** – GDDKiA traffic disruptions and events API.
* **[OpenStreetMap](https://www.openstreetmap.org/)** – Road infrastructure and traffic enforcement points via Overpass API.
* **[Google News RSS]** – Localized regional traffic updates.

---

## 🏗️ Quick Start

The system is live at:  
👉 **[https://PMS.github.io/](https://PMS.github.io/)**

To develop or run the project locally:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/TrafficMMISSIONcontrol/PMS.github.io.git](https://github.com/TrafficMMISSIONcontrol/PMS.github.io.git)
    ```
2.  **Access the Modules:**
    * For the **Traffic Map**, open: `/mapa/index.html`
    * For the **News Aggregator**, open: `/news.html`

---

## 🛡️ License

Distributed under the **MIT License**. Feel free to fork, modify, and contribute to improving road safety in Poland.
