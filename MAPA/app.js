/**
 * POLAND MISSION CONTROL - APP CORE
 * v1.8.1 - Bugfixes (OSRM Rate Limit & OPP Geometry)
 */

const CONFIG = {
  center: [51.9, 19.3], 
  zoom: 6,
  refreshInterval: 30, // seconds
  clusterZoomThreshold: 12
};

// --- Map Initialization ---
const map = L.map('map', {
  center: CONFIG.center,
  zoom: CONFIG.zoom,
  zoomControl: false
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

const geocoder = L.Control.geocoder({
  defaultMarkGeocode: true,
  placeholder: "Szukaj miasta/drogi..."
}).addTo(map);

// --- Layers & Clustering ---
const clusterGroup = L.markerClusterGroup({
  disableClusteringAtZoom: CONFIG.clusterZoomThreshold,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  maxClusterRadius: 50
}).addTo(map);

const subLayers = {
  accidents: L.layerGroup(),
  cameras: L.layerGroup(),
  oppLines: L.layerGroup().addTo(map), // linie zawsze startują jako włączone
  works: L.layerGroup()
};

const trafficLayers = {
  as: L.layerGroup(),
  dk: L.layerGroup(),
  city: L.layerGroup()
};

let trafficBuildInProgress = false;

// --- Icons ---
function createIconSVG(type, limit = null, isEnd = false) {
  let color = '#58a6ff';
  let emoji = '📍';
  if(type === 'accident') { color = '#FF3D00'; emoji = '🚨'; }
  if(type === 'works') { color = '#FFEA00'; emoji = '🚧'; }
  if(type === 'camera') { color = '#f0f6fc'; emoji = '📸'; }
  if(type === 'opp') { color = '#b388ff'; emoji = isEnd ? '🏁' : '⏱️'; } // Flaszka końca dla drugiego punktu

  const html = `
    <div style="background: ${color}22; border: 1px solid ${color}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; position: relative;">
      <span style="font-size: 16px;">${emoji}</span>
      ${limit && !isEnd ? `<div style="position: absolute; bottom: -8px; right: -8px; background: white; color: black; border: 2px solid red; border-radius: 50%; width: 18px; height: 18px; font-size: 9px; font-weight: 900; display: flex; align-items: center; justify-content: center;">${limit}</div>` : ''}
      ${type === 'accident' ? '<div class="red-pulse" style="position: absolute; width: 32px; height: 32px; border-radius: 50%;"></div>' : ''}
    </div>
  `;
  return L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16] });
}

// --- Fotoradary (Zabezpieczona Baza Serwerowa v2.1 - Bypass & Retry) ---
async function fetchCameras() {
  const statusBadge = document.getElementById('count-cameras');
  statusBadge.textContent = '...';

  // Ponieważ plik daty ma 1.8MB, a otwierany z dysku (file://) może zająć milisekundy na parsowanie, 
  // dajemy mu 3 szanse na "pojawienie się" w oknie przeglądarki przed podjęciem próby fetchu.
  let data = null;
  for(let i=0; i<3; i++) {
     data = window.CAMERAS_DATA;
     if(data && Array.isArray(data) && data.length > 0) break;
     await new Promise(r => setTimeout(r, 500)); 
  }

  try {
    if(!data) {
       // Ostatnia szansa: Jeśli serwer HTTP, fetch zadziała. Jeśli file://, rzuci CORS i wejdzie w catch.
       const response = await fetch('./data/cameras.json');
       data = await response.json();
       showToast(`✅ Wczytano bazę JSON.`);
    }

    if(data && data.length > 0) {
      renderCameras(data);
      statusBadge.textContent = data.length;
      showToast(`✅ Wczytano bazę fotoradarów (${data.length} punktów).`);
    } else {
      throw new Error('Brak danych w bazie');
    }
  } catch (err) {
    console.error("CAMERA DATA ERROR:", err);
    statusBadge.textContent = 'ERR';
    showToast("❌ Błąd bazy danych (CORS/Brak pliku)! Uruchom skrypt Node i odśwież.");
  }
}

function renderCameras(elements) {
  subLayers.cameras.eachLayer(layer => clusterGroup.removeLayer(layer));
  subLayers.cameras.clearLayers();
  subLayers.oppLines.clearLayers();
  
  elements.forEach(el => {
    const limit = el.tags && el.tags.maxspeed ? el.tags.maxspeed : null;
    const type = el.typeStr || 'camera';
    const title = type === 'opp' ? 'ODCINKOWY POMIAR PRĘDKOŚCI' : 'FOTORADAR';

    if (type === 'opp' && el.path) {
      // Wektor
      const oppLine = L.polyline(el.path, {
        color: '#b388ff',
        weight: 6,
        opacity: 0.8,
        dashArray: '5, 12',
        lineCap: 'round'
      }).bindTooltip(`Strefa: ${el.tags?.name || 'Odcinkowy Pomiar'} ${limit ? `(Max ${limit} km/h)` : ''}`, {sticky: true});
      subLayers.oppLines.addLayer(oppLine);
      
      // Jeżeli mamy wektor ścieżki, dodajmy dodatkowy punkt "Koniec pomiaru" na drugim krańcu!
      let endPos = null;
      if (el.isMulti && el.path.length > 0) {
        const lastWay = el.path[el.path.length - 1];
        if (lastWay.length > 0) endPos = lastWay[lastWay.length - 1];
      } else if (!el.isMulti && el.path.length > 0) {
        endPos = el.path[el.path.length - 1];
      }
      
      if (endPos) {
         const endMarker = L.marker(endPos, { icon: createIconSVG(type, null, true) })
           .bindPopup(`<div style="text-align: center;"><h4>Koniec OPP</h4><p>Zarejestrowane w bazie: ${el.id}</p></div>`);
         subLayers.cameras.addLayer(endMarker);
         if(document.getElementById('toggle-cameras').checked) clusterGroup.addLayer(endMarker);
      }
    }

    // Główny (Startowy) Marker
    const marker = L.marker([el.lat, el.lon], { icon: createIconSVG(type, limit) })
      .bindPopup(`
        <div style="text-align: center;">
          <h4 style="margin-bottom: 5px; font-family: var(--font-display);">${title}</h4>
          ${limit ? `<div style="display: inline-block; border: 3px solid red; border-radius: 50%; width: 40px; height: 40px; line-height: 34px; font-weight: 900; font-size: 16px; margin: 5px 0;">${limit}</div>` : '<p style="color: #aaa; margin: 5px 0;">Brak limitu</p>'}
          ${type === 'opp' ? '<p style="font-size: 11px; color:#b388ff;">Rozpoczęcie monitoringu</p>' : ''}
          <p style="font-size: 11px; color: #666; margin-top: 5px;">ID OSM: ${el.id}</p>
        </div>
      `);
    subLayers.cameras.addLayer(marker);
    if(document.getElementById('toggle-cameras').checked) clusterGroup.addLayer(marker);
  });
}

// --- Persistent Live Events (Incidents) v2.7 - FULL POLAND SCALE ---
let LIVE_INCIDENTS = [];

/**
 * seedInitialEvents() - Masowe wypełnienie mapy zdarzeniami przy starcie,
 * aby skala "Polski" była widoczna od razu (ok. 50-100 punktów).
 */
function seedInitialEvents() {
  console.log("🛰️ Inicjalizacja masowej siatki zdarzeń dla Polski...");
  
  // 1. Ładowanie rzeczywistych danych z OSM (Roboty drogowe)
  if (window.INCIDENTS_DATA && Array.isArray(window.INCIDENTS_DATA)) {
    window.INCIDENTS_DATA.forEach(inc => {
      LIVE_INCIDENTS.push({
        id: inc.id,
        type: 'works',
        pos: [inc.lat, inc.lon],
        road: inc.tags.name || "Budowa/Remont",
        severity: 'Średni',
        isReal: true // znacznik dla danych z OSM
      });
    });
    console.log(`✅ Wczytano ${window.INCIDENTS_DATA.length} rzeczywistych robót drogowych.`);
  }

  // 2. Symulacja zdarzeń nagłych (Wypadki/Awarie)
  for(let i=0; i < 40; i++) {
    addSingleIncident(true); 
  }
  renderIncidents();
}

function addSingleIncident(silent = false) {
  const road = ROAD_CONFIG[Math.floor(Math.random() * ROAD_CONFIG.length)];
  const cacheKey = 'osrm_route_v16_' + road.id;
  const cached = localStorage.getItem(cacheKey);
  
  let coords = road.path;
  if (cached) {
    try {
      const geom = JSON.parse(cached);
      if (geom.length > 0) coords = geom;
    } catch(e) {}
  }

  const randomPos = coords[Math.floor(Math.random() * coords.length)];
  const type = Math.random() > 0.4 ? 'works' : 'accident';
  
  // Przesunięcie czasu wstecz, aby nie wszystkie były "przed chwilą"
  const backTime = Math.random() * 45 * 60 * 1000; // do 45 min wstecz
  
  LIVE_INCIDENTS.push({
    id: Date.now() - backTime + Math.random(),
    type: type,
    pos: randomPos,
    road: road.id,
    severity: ['Niski', 'Średni', 'Wysoki'][Math.floor(Math.random()*3)]
  });

  if(!silent) renderIncidents();
}

function generateMockEvents() {
  // 1. Sprzątanie starych (starszych niż 60 minut)
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  LIVE_INCIDENTS = LIVE_INCIDENTS.filter(inc => (now - inc.id) < ONE_HOUR);

  // 2. Dodawanie nowych (ZWIĘKSZONA INTENSYWNOŚĆ: 1-5 na cykl)
  const newCount = Math.floor(Math.random() * 5) + 1; 
  for(let i=0; i < newCount; i++) {
    addSingleIncident(true);
  }

  renderIncidents();
}

function renderIncidents() {
  ['accidents', 'works'].forEach(k => {
    subLayers[k].eachLayer(l => clusterGroup.removeLayer(l));
    subLayers[k].clearLayers();
  });

  let acc = 0, wrk = 0;
  LIVE_INCIDENTS.forEach(inc => {
    const typeLabel = inc.type === 'accident' ? 'WYPADEK / AWARIA' : 'ROBOTY DROGOWE';
    const elapsed = Math.round((Date.now() - inc.id) / 60000);
    const timeLabel = elapsed < 1 ? 'Przed chwilą' : `${elapsed} min temu`;

    const m = L.marker(inc.pos, { icon: createIconSVG(inc.type) })
      .bindPopup(`
        <div style="text-align: center;">
          <h4 style="color: ${inc.type === 'accident' ? '#FF3D00' : '#FFEA00'}; margin-bottom: 5px;">${typeLabel}</h4>
          <p style="font-size: 13px; font-weight: bold;">Droga: ${inc.road}</p>
          <p style="font-size: 11px; color: #aaa;">Priorytet: ${inc.severity}</p>
          <hr style="border: 0; border-top: 1px solid #333; margin: 8px 0;">
          <p style="font-size: 10px; color: #666;">📢 Zgłoszono: ${timeLabel}</p>
        </div>
      `);

    subLayers[inc.type === 'accident' ? 'accidents' : 'works'].addLayer(m);
    if(document.getElementById(`toggle-${inc.type === 'accident' ? 'accidents' : 'works'}`).checked) {
       clusterGroup.addLayer(m);
    }
    if(inc.type === 'accident') acc++; else wrk++;
  });

  document.getElementById('count-accidents').textContent = acc;
  document.getElementById('count-works').textContent = wrk;
  document.getElementById('last-sync').textContent = `Update: ${new Date().toLocaleTimeString('pl-PL')}`;
}

// --- OSRM API Routing - Perfectly aligned traffic lines ---
const COLORS = { fluid: '#00E676', moderate: '#FFEA00', jam: '#FF3D00', blocked: '#B71C1C' };

const ROAD_CONFIG = [
  // A/S Highways
  { id: 'A1', type: 'as', path: [[54.34, 18.66], [53.01, 18.60], [51.75, 19.45], [50.29, 18.67], [49.94, 18.42]] },
  { id: 'A2', type: 'as', path: [[52.31, 14.63], [52.40, 16.92], [52.17, 20.88], [52.18, 21.60]] },
  { id: 'A4', type: 'as', path: [[51.15, 15.00], [51.10, 17.03], [50.26, 19.02], [50.06, 19.94], [50.04, 22.00], [49.95, 23.18]] },
  { id: 'S7', type: 'as', path: [[54.35, 18.66], [53.78, 19.50], [52.15, 20.95], [50.87, 20.63], [49.60, 19.95]] },
  { id: 'S8', type: 'as', path: [[51.10, 17.03], [51.60, 18.84], [52.22, 21.01], [53.13, 23.16]] },
  { id: 'S3', type: 'as', path: [[53.91, 14.80], [52.36, 15.52], [50.65, 16.00]] },
  { id: 'S5', type: 'as', path: [[53.60, 18.70], [52.40, 16.92], [51.10, 17.03]] },
  { id: 'S17', type: 'as', path: [[52.22, 21.24], [51.24, 22.56], [50.62, 23.26]] },

  // National Roads (DK) - kluczowe nitki
  { id: 'DK1', type: 'dk', path: [[54.35, 18.66], [53.50, 18.60], [50.80, 19.10]] },
  { id: 'DK7', type: 'dk', path: [[54.30, 18.60], [52.20, 21.00], [49.30, 20.00]] },
  { id: 'DK94', type: 'dk', path: [[51.25, 16.14], [50.31, 19.05], [50.08, 19.90]] },
  { id: 'DK81_Wislanka', type: 'dk', path: [[50.22, 18.98], [50.16, 18.90], [50.04, 18.70], [49.96, 18.66], [49.80, 18.79]] },
  { id: 'Mikolow_DK44', type: 'dk', path: [[50.27, 18.82], [50.16, 18.90], [50.12, 18.98]] },

  // --- Pajęczyny Miejskie (Szeroki Zasięg OSRM) ---
  // WARSZAWA
  { id: 'WAW_Jer', type: 'city', path: [[52.22, 20.95], [52.23, 21.05]] }, 
  { id: 'WAW_Pul', type: 'city', path: [[52.22, 21.01], [52.16, 21.01]] }, 
  { id: 'WAW_S8',  type: 'city', path: [[52.22, 20.90], [52.28, 20.95], [52.30, 21.05]] },
  { id: 'WAW_Laz', type: 'city', path: [[52.21, 20.98], [52.22, 21.05], [52.24, 21.08]] },
  { id: 'WAW_S2',  type: 'city', path: [[52.16, 20.89], [52.15, 21.08], [52.17, 21.20]] }, 
  { id: 'WAW_Prym', type: 'city', path: [[52.28, 20.95], [52.21, 20.95]] }, 
  { id: 'WAW_Wisl', type: 'city', path: [[52.32, 20.94], [52.23, 21.03], [52.16, 21.08]] },

  // KRAKÓW (Mocne Zagęszczenie)
  { id: 'KRK_Ale', type: 'city', path: [[50.08, 19.92], [50.05, 19.93], [50.04, 19.95]] },
  { id: 'KRK_Opo', type: 'city', path: [[50.09, 19.89], [50.09, 19.95]] },
  { id: 'KRK_Dietla', type: 'city', path: [[50.05, 19.93], [50.05, 19.96]] },
  { id: 'KRK_Nowo', type: 'city', path: [[50.06, 19.99], [50.04, 19.99]] },
  { id: 'KRK_Zakop', type: 'city', path: [[50.04, 19.93], [49.98, 19.90]] },
  { id: 'KRK_Wiel', type: 'city', path: [[50.03, 19.96], [50.01, 20.00]] }, // Wielicka
  { id: 'KRK_Kam', type: 'city', path: [[50.03, 19.95], [50.01, 19.96]] }, // Kamieńskiego
  { id: 'KRK_Tyn', type: 'city', path: [[50.05, 19.92], [50.03, 19.88]] }, // Tyniecka
  { id: 'KRK_Krol', type: 'city', path: [[50.07, 19.92], [50.07, 19.88]] }, // Królewska

  // --- MIISJA KONTROLA — SIATKA ŚLĄSKA (FULL GRID v15) ---
  
  // RYBNIK (Większa gęstość)
  { id: 'RYB_DK78_N', type: 'city', path: [[50.14, 18.60], [50.10, 18.55]] }, 
  { id: 'RYB_DK78_S', type: 'city', path: [[50.10, 18.55], [50.05, 18.52]] }, 
  { id: 'RYB_DW935_E', type: 'city', path: [[50.10, 18.55], [50.08, 18.65]] }, 
  { id: 'RYB_DW935_W', type: 'city', path: [[50.10, 18.55], [50.10, 18.45]] },
  { id: 'RYB_Miko', type: 'city', path: [[50.10, 18.56], [50.13, 18.65]] }, // Mikołowska

  // ŻORY (Łatanie dziur ze screena)
  { id: 'Zory_Ring_N', type: 'city', path: [[50.06, 18.69], [50.07, 18.75]] }, // Północna
  { id: 'Zory_Ring_S', type: 'city', path: [[50.04, 18.68], [50.03, 18.73]] }, 
  { id: 'Zory_DW932_W_Deep', type: 'city', path: [[50.045, 18.65], [50.04, 18.58]] }, // Wodzisławska
  { id: 'Zory_DW935_E_Deep', type: 'city', path: [[50.045, 18.74], [50.04, 18.82]] }, // Pszczyńska
  { id: 'Zory_Zjedn_Eur', type: 'city', path: [[50.055, 18.67], [50.04, 18.68]] }, // Al. Zjedn. Europy
  { id: 'Zory_Arm_Kraj', type: 'city', path: [[50.04, 18.68], [50.025, 18.68]] }, // Armii Krajowej
  { id: 'Zory_Katow_Ext', type: 'city', path: [[50.06, 18.70], [50.09, 18.78]] }, // Wylot na Katowice
  { id: 'Zory_Dworcowa', type: 'city', path: [[50.046, 18.694], [50.051, 18.702]] },

  // JASTRZĘBIE-ZDRÓJ
  { id: 'Jast_Al_Pils', type: 'city', path: [[49.95, 18.60], [49.95, 18.55]] }, 
  { id: 'Jast_Granic', type: 'city', path: [[49.94, 18.58], [49.96, 18.63]] }, 
  { id: 'Jast_Ryb_DW935', type: 'city', path: [[49.97, 18.66], [49.955, 18.605]] }, 
  { id: 'Jast_JP2', type: 'city', path: [[49.955, 18.59], [49.97, 18.60]] }, 

  // TYCHY & PSZCZYNA
  { id: 'TYCHY_Bielska_N', type: 'city', path: [[50.15, 19.00], [50.12, 19.00]] }, 
  { id: 'TYCHY_Bielska_S', type: 'city', path: [[50.12, 19.00], [50.08, 19.00]] }, 
  { id: 'TYCHY_Niepodleg', type: 'city', path: [[50.12, 18.98], [50.12, 19.05]] }, 
  { id: 'TYCHY_Beskid_DK1', type: 'dk', path: [[50.15, 18.99], [50.01, 18.98]] }, 

  // KATOWICE, CHORZÓW & GLIWICE
  { id: 'KAT_DTS_Main', type: 'city', path: [[50.26, 18.90], [50.26, 19.15]] }, 
  { id: 'KAT_Murck_DK86', type: 'dk', path: [[50.26, 19.05], [50.20, 19.05]] }, 
  { id: 'KAT_Kosc_DK81', type: 'dk', path: [[50.25, 19.02], [50.16, 18.90]] }, 
  { id: 'SL_DTS_Full', type: 'city', path: [[50.26, 19.03], [50.31, 18.67]] },
  { id: 'GLIW_DK88', type: 'city', path: [[50.33, 18.61], [50.31, 18.71]] },

  // MIKOŁÓW
  { id: 'Mikolow_Krak', type: 'city', path: [[50.17, 18.89], [50.16, 18.95]] }, 
  { id: 'Mikolow_Katow', type: 'city', path: [[50.16, 18.90], [50.21, 18.95]] }, 
  { id: 'Mikolow_Gliw_DK44', type: 'city', path: [[50.17, 18.90], [50.18, 18.80]] }, 
  { id: 'Mikolow_Owsiana', type: 'city', path: [[50.17, 18.90], [50.21, 18.93]] }, 
  { id: 'SL_DK1_Tychy', type: 'city', path: [[50.13, 18.99], [50.10, 19.00]] },

  // WROCŁAW
  { id: 'WRO_Leg', type: 'city', path: [[51.13, 16.92], [51.11, 17.00], [51.10, 17.05]] },
  { id: 'WRO_Pow', type: 'city', path: [[51.08, 17.01], [51.10, 17.03]] },
  { id: 'WRO_Slezna', type: 'city', path: [[51.08, 17.02], [51.10, 17.04]] },
  { id: 'WRO_A8', type: 'city', path: [[51.17, 17.06], [51.13, 16.92], [51.05, 16.95]] },

  // POZNAŃ
  { id: 'POZ_Glog', type: 'city', path: [[52.41, 16.90], [52.38, 16.89]] },
  { id: 'POZ_Het', type: 'city', path: [[52.38, 16.89], [52.39, 16.95]] },
  { id: 'POZ_Lech', type: 'city', path: [[52.44, 16.92], [52.44, 16.97]] },
  { id: 'POZ_Niest', type: 'city', path: [[52.43, 16.90], [52.41, 16.89]] },

  // GDAŃSK / TRÓJMIASTO
  { id: 'GDA_Gru', type: 'city', path: [[54.38, 18.60], [54.40, 18.57], [54.44, 18.56]] },
  { id: 'GDA_Spac', type: 'city', path: [[54.41, 18.56], [54.43, 18.49]] },
  { id: 'GDA_S6', type: 'city', path: [[54.55, 18.49], [54.40, 18.49], [54.30, 18.61]] },
  { id: 'GDA_Slow', type: 'city', path: [[54.38, 18.52], [54.38, 18.58]] },

  // ŁÓDŹ
  { id: 'LOD_Wlo', type: 'city', path: [[51.78, 19.43], [51.75, 19.43], [51.72, 19.44]] },
  { id: 'LOD_Pil', type: 'city', path: [[51.75, 19.43], [51.76, 19.50]] },
  { id: 'LOD_Rzgo', type: 'city', path: [[51.74, 19.47], [51.68, 19.49]] }
];

async function fetchRouteGeometry(id, path) {
  const cacheKey = 'osrm_route_v18_' + id; // Force expansion v18 (Dynamic Incidents & Precision Dworcowa)
  const cached = localStorage.getItem(cacheKey);
  if (cached) return JSON.parse(cached);

  const coords = path.map(p => `${p[1]},${p[0]}`).join(';');
  
  // ZMIANA: Zamiast zawodnego project-osrm (który banuje potężnie), 
  // używamy ekstremalnie darmowego, wysoce skalowalnego niemieckiego serwera routingu!
  const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const geom = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      localStorage.setItem(cacheKey, JSON.stringify(geom));
      
      // Możemy zejść z opóźnieniem do 500ms, serwer niemiecki wytrzyma.
      await new Promise(r => setTimeout(r, 500)); 
      return geom;
    }
  } catch (err) { 
     console.warn(`Błąd routingu dla drogi ${id}. Zabezpieczenie przed brzydkimi liniami aktywne. Odczekanie.`);
     // USUŃCIE: Return path; - to właśnie generowało te brzydkie, kanciate linie (szit)!
     // Względem wizualnym lepiej, żeby trasa narysowała się za chwilę w idealnym łuku, lub wcale.
     return null; 
  }
  return null;
}

async function renderStaticTraffic() {
  if(trafficBuildInProgress) return;
  trafficBuildInProgress = true;
  
  const statusTraffic = document.getElementById('status-traffic');
  if(statusTraffic) statusTraffic.textContent = 'Ładowanie...';

  trafficLayers.as.clearLayers();
  trafficLayers.dk.clearLayers();
  trafficLayers.city.clearLayers();
  
  const CHUNK_SIZE = 10; 
  let successCount = 0;
  
  for (const road of ROAD_CONFIG) {
    const geom = await fetchRouteGeometry(road.id, road.path);
    if (!geom || geom.length < 2) continue;
    successCount++;

    for (let i = 0; i < geom.length - 1; i += CHUNK_SIZE) {
      const segment = geom.slice(i, i + CHUNK_SIZE + 1); 
      // Ignoruj jednopunktowe błędy pętli
      if (segment.length < 2) continue;
      
      let statuses = ['fluid', 'fluid', 'fluid', 'moderate', 'jam'];
      if(road.type === 'city') statuses = ['fluid', 'moderate', 'jam', 'jam', 'blocked']; 
      else if(road.type === 'dk') statuses = ['fluid', 'moderate', 'moderate']; 

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      L.polyline(segment, {
        color: COLORS[status],
        weight: road.type === 'city' ? 5 : (road.type === 'as' ? 6 : 4),
        opacity: 0.85,
        smoothFactor: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).bindTooltip(`${road.id} | Natężenie: ${status.toUpperCase()}`, { sticky: true })
        .addTo(trafficLayers[road.type]);
    }
  }
  
  const tempAs = document.getElementById('toggle-as-roads').checked;
  const tempDk = document.getElementById('toggle-dk-roads').checked;
  const tempCity = document.getElementById('toggle-city-roads').checked;
  
  if(!tempAs) trafficLayers.as.remove();
  if(!tempDk) trafficLayers.dk.remove();
  if(!tempCity) trafficLayers.city.remove();
  
  trafficBuildInProgress = false;
}

// --- UI Logic & Toggles ---
let masterTraffic = true;

function updateTrafficVisibility() {
  if (!masterTraffic) {
    trafficLayers.as.remove(); trafficLayers.dk.remove(); trafficLayers.city.remove();
    return;
  }
  
  if (document.getElementById('toggle-as-roads').checked) trafficLayers.as.addTo(map);
  else trafficLayers.as.remove();

  if (document.getElementById('toggle-dk-roads').checked) trafficLayers.dk.addTo(map);
  else trafficLayers.dk.remove();

  if (document.getElementById('toggle-city-roads').checked) trafficLayers.city.addTo(map);
  else trafficLayers.city.remove();
}

function initUI() {
  // Layer Toggles
  ['accidents', 'cameras', 'works'].forEach(key => {
    document.getElementById(`toggle-${key}`).addEventListener('change', e => {
      if(e.target.checked) subLayers[key].eachLayer(m => clusterGroup.addLayer(m));
      else subLayers[key].eachLayer(m => clusterGroup.removeLayer(m));

      // Specjalna obsługa stref bezpieczeństwa
      if (key === 'cameras') {
         if(e.target.checked) subLayers.oppLines.addTo(map);
         else subLayers.oppLines.remove();
      }
    });
  });

  ['toggle-as-roads', 'toggle-dk-roads', 'toggle-city-roads'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateTrafficVisibility);
  });

  const trafficBtn = document.getElementById('toggle-traffic');
  trafficBtn.addEventListener('click', function() {
    masterTraffic = !masterTraffic;
    if(masterTraffic) { this.classList.remove('secondary'); }
    else { this.classList.add('secondary'); }
    document.getElementById('traffic-info').textContent = `Warstwa: ${masterTraffic ? 'WŁĄCZONA' : 'WYŁĄCZONA'}`;
    updateTrafficVisibility();
  });

  document.getElementById('refresh-traffic').addEventListener('click', () => {
    // Czyścimy cache OSRM, aby wymusić ponowne pobranie tras (rozwiązuje problem braku aktywności)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('osrm_route_')) localStorage.removeItem(key);
    });
    showToast("Wymuszono przeliczenie sieci... Odświeżam mapę.");
    setTimeout(() => location.reload(), 500);
  });
  geocoder.on('markgeocode', e => map.fitBounds(e.geocode.bbox));
}

function showToast(msg) {
  const t = document.getElementById('toast-notif');
  t.textContent = msg; t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 3500);
}

function startLoop() {
  setInterval(() => {
    document.getElementById('main-clock').textContent = new Date().toLocaleTimeString('pl-PL');
    let c = parseInt(document.getElementById('update-timer').textContent);
    c--; 
    if(c <= 0) { 
      c = CONFIG.refreshInterval; 
      generateMockEvents(); 
      renderStaticTraffic(); 
    }
    document.getElementById('update-timer').textContent = c + "s";
  }, 1000);
}

// Sprawdź czy to pierwsze wczytywanie wektorowego OSRM
if (!localStorage.getItem('osrm_route_v4_A1')) {
  showToast("⚙️ Kompilowanie sieci drogowej (zapobieganie przerwom API)...");
}

// --- URL Parameter Handling ---
const CITY_COORDS = {
  'WARSZAWA': [52.2297, 21.0122],
  'KRAKOW': [50.0647, 19.9450],
  'WROCLAW': [51.1079, 17.0385],
  'LODZ': [51.7592, 19.4560],
  'POZNAN': [52.4064, 16.9252],
  'GDANSK': [54.3520, 18.6466],
  'SZCZECIN': [53.4285, 14.5528],
  'BYDGOSZCZ': [53.1235, 18.0084],
  'LUBLIN': [51.2465, 22.5684],
  'BIALYSTOK': [53.1325, 23.1688],
  'KATOWICE': [50.2649, 19.0238],
  'ZORY': [50.0450, 18.6942],
  'RYBNIK': [50.1028, 18.5461],
  'GLIWICE': [50.2945, 18.6714],
  'CZÉSTOCHOWA': [50.8118, 19.1203],
  'RADOM': [51.4027, 21.1471],
  'SOSNOWIEC': [50.2862, 19.1040],
  'TORUN': [53.0138, 18.5984],
  'KIELCE': [50.8660, 20.6285],
  'RZESZOW': [50.0413, 21.9991],
  'GLIWICE': [50.2945, 18.6714]
};

function checkURLParams() {
  const params = new URLSearchParams(window.location.search);
  const city = params.get('city');
  const lat = params.get('lat');
  const lng = params.get('lng');
  const zoom = params.get('zoom') || 13;

  if (city && CITY_COORDS[city.toUpperCase()]) {
    const coords = CITY_COORDS[city.toUpperCase()];
    map.flyTo(coords, 14, { duration: 2 });
    showToast(`📍 Centrowanie na: ${city}`);
  } else if (lat && lng) {
    map.flyTo([parseFloat(lat), parseFloat(lng)], parseInt(zoom), { duration: 2 });
  }
}

// --- Bootstrap ---
initUI();
renderStaticTraffic();
seedInitialEvents(); // MASOWE ZAPEŁNIENIE MAPY PRZY STARCIU
fetchCameras();
updateTrafficVisibility();
startLoop();
checkURLParams(); // SPRAWDŹ PARAMETRY STARTOWE
