const fs = require('fs');

/**
 * SKRYPT SYNCHRONIZACJI ROBÓT DROGOWYCH (Multi-Mirror & Robust)
 * v1.2 - Region-based with Reliable Failover
 */

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter'
];

const REGIONS = [
  { name: 'Śląsk: GOP (Gliwice/Katowice)', bbox: '50.15,18.5,50.4,19.2' },
  { name: 'Śląsk: Żory/Rybnik/Jastrzębie', bbox: '49.9,18.4,50.15,18.8' },
  { name: 'Śląsk: Bielsko/Pszczyna', bbox: '49.8,18.8,50.0,19.2' },
  { name: 'Warszawa & Centrum', bbox: '52.0,20.5,52.5,21.5' },
  { name: 'Kraków & Małopolska', bbox: '49.8,19.6,50.2,20.4' },
  { name: 'Wrocław / Dolny Śląsk', bbox: '51.0,16.4,51.3,17.5' },
  { name: 'Poznań / Wielkopolska', bbox: '52.3,16.7,52.5,17.2' },
  { name: 'Gdańsk / Trójmiasto', bbox: '54.2,18.2,54.6,18.8' }
];

async function fetchWithRetry(query) {
  for (const mirror of MIRRORS) {
    console.log(`🔌 Próba połączenia z mirror: ${mirror}...`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout per mirror

      const response = await fetch(mirror, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.elements) return data;
      }
      console.warn(`⚠️ Mirror ${new URL(mirror).hostname} zwrócił status ${response.status}.`);
    } catch (e) {
      console.warn(`⚠️ Mirror ${new URL(mirror).hostname} - błąd połączenia (timeout/odrzucono).`);
    }
  }
  throw new Error("Wszystkie mirrory Overpass zawiodły (504/Timeout).");
}

async function run() {
  console.log("🛰️ Rozpoczynam dynamiczną synchronizację robót drogowych (Multi-Region)...");
  const allIncidents = [];
  
  for (const region of REGIONS) {
    try {
      // Skupiamy się na głównych placach budowy
      const query = `
        [out:json][timeout:30];
        (
          way["highway"="construction"]["construction"~"trunk|primary|secondary|bridge"](${region.bbox});
          way["construction"="bridge"](${region.bbox});
          node["highway"="construction"](${region.bbox});
        );
        out center;`;

      const data = await fetchWithRetry(query);
      const items = data.elements.map(el => ({
        id: el.id,
        lat: el.lat || (el.center ? el.center.lat : 0),
        lon: el.lon || (el.center ? el.center.lon : 0),
        type: 'works',
        tags: {
           name: (el.tags && (el.tags.name || el.tags.description)) || "Prace drogowe / Budowa",
           region: region.name,
           construction: el.tags ? el.tags.construction : ""
        }
      })).filter(i => i.lat !== 0);
      
      allIncidents.push(...items);
      console.log(`✅ ${region.name}: Znaleziono ${items.length} aktywnych placów budowy.`);
      
      // Krótka przerwa dla serwera
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`⚠️ Pominąłem region ${region.name} z powodu błędu.`);
    }
  }

  const outputDir = './data';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const jsContent = `window.INCIDENTS_DATA = ${JSON.stringify(allIncidents, null, 2)};`;
  fs.writeFileSync(`${outputDir}/incidents.js`, jsContent);

  console.log(`🚀 SYNC FINAL: Zapisano łącznie ${allIncidents.length} rzeczywistych robót drogowych.`);
}

run();
