const fs = require('fs');
const https = require('https');
const path = require('path');

const query = `[out:json][timeout:120];
  (
    node["highway"="speed_camera"](49.0, 14.1, 54.9, 24.1);
    way["enforcement"="average_speed"](49.0, 14.1, 54.9, 24.1);
    relation["enforcement"="average_speed"](49.0, 14.1, 54.9, 24.1);
  );
  out geom;`;

const url = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;

console.log("Pobieram najnowsze geometrie i radary Polski (Overpass API)...");

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      if (res.statusCode !== 200) {
          throw new Error(`BŁĄD HTTP ${res.statusCode}: ${body.substring(0, 100)}`);
      }
      const data = JSON.parse(body);
      const cameras = data.elements.map(el => {
        let lat = null, lon = null;
        let p = null;
        let isMulti = false;
        
        if (el.type === 'node') {
          lat = el.lat; lon = el.lon;
        } 
        else if (el.type === 'way' && el.geometry && el.geometry.length > 0) {
          p = el.geometry.map(pt => [pt.lat, pt.lon]);
          lat = p[0][0]; lon = p[0][1]; 
        }
        else if (el.type === 'relation' && el.members) {
          let ways = [];
          el.members.forEach(m => {
            if (m.type === 'way' && m.geometry && m.geometry.length > 0) {
              ways.push(m.geometry.map(pt => [pt.lat, pt.lon]));
            }
          });
          if (ways.length > 0) {
            p = ways; 
            isMulti = true;
            lat = ways[0][0][0]; lon = ways[0][0][1];
          } else {
             lat = el.center ? el.center.lat : null;
             lon = el.center ? el.center.lon : null;
          }
        } else {
           lat = el.center ? el.center.lat : null;
           lon = el.center ? el.center.lon : null;
        }
        
        if (!lat || !lon) return null;

        let typeStr = 'camera';
        if (el.tags && (el.tags.enforcement === 'average_speed' || el.tags.speed_camera === 'average_speed')) {
          typeStr = 'opp';
        }
        return { id: el.id, lat, lon, path: p, isMulti, tags: el.tags, typeStr };
      }).filter(c => c !== null);

      const targetDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
      
      const outFile = path.join(targetDir, 'cameras.js');
      // Zapisujemy jako skrypt JS, aby ominąć blokady CORS (file://) w przeglądarce
      const jsContent = `window.CAMERAS_DATA = ${JSON.stringify(cameras, null, 2)};`;
      fs.writeFileSync(outFile, jsContent);
      console.log(`SUKCES! Zapisano ${cameras.length} pomiarów do skryptu ${outFile}`);
    } catch (err) {
      console.error("Błąd parsowania:", err);
    }
  });
}).on('error', err => {
  console.error("Błąd sieciowy przy pobieraniu radarów:", err);
});
