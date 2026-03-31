/**
 * NEWS HUB - POLAND MISSION CONTROL
 * Logic for fetching and rendering road incident news
 */

const CONFIG = {
    rssUrl: 'https://news.google.com/rss/search?q=wypadek+droga+OR+utrudnienia+OR+korek+OR+blokada+OR+kolizja+when:1d&hl=pl&gl=PL&ceid=PL:pl',
    refreshInterval: 60000, // 1 minute
    maxAgeHours: 24
};

const PROVINCE_KEYWORDS = {
    'mazowieckie': ['Warszawa', 'Radom', 'Plock', 'Płock', 'Siedlce', 'Pruszków', 'Pruszkow', 'mazowieckie', 'podwarszawskie'],
    'slaskie': ['Katowice', 'Częstochowa', 'Czestochowa', 'Sosnowiec', 'Gliwice', 'Zabrze', 'Bielsko-Biała', 'Bielsko-Biala', 'Ruda Śląska', 'Ruda Slaska', 'Rybnik', 'Tychy', 'Dąbrowa Górnicza', 'Dabrowa Gornicza', 'Chorzów', 'Chorzow', 'Jaworzno', 'Jastrzębie-Zdrój', 'Jastrzebie-Zdroj', 'śląskie', 'slaskie', 'Silesia'],
    'malopolskie': ['Kraków', 'Krakow', 'Tarnów', 'Tarnow', 'Nowy Sącz', 'Nowy Sacz', 'Oświęcim', 'Oswiecim', 'Zakopane', 'małopolskie', 'malopolskie'],
    'dolnoslaskie': ['Wrocław', 'Wroclaw', 'Wałbrzych', 'Walbrzych', 'Legnica', 'Jelenia Góra', 'Jelenia Gora', 'Lubin', 'Głogów', 'Glogow', 'Świdnica', 'Swidnica', 'dolnośląskie', 'dolnoslaskie'],
    'wielkopolskie': ['Poznań', 'Poznan', 'Kalisz', 'Konin', 'Piła', 'Pila', 'Ostrów Wielkopolski', 'Ostrow Wielkopolski', 'Gniezno', 'Leszno', 'wielkopolskie'],
    'pomorskie': ['Gdańsk', 'Gdansk', 'Gdynia', 'Sopot', 'Słupsk', 'Slupsk', 'Tczew', 'pomorskie'],
    'lodzkie': ['Łódź', 'Lodz', 'Piotrków Trybunalski', 'Piotrkow Trybunalski', 'Pabianice', 'Tomaszów Mazowiecki', 'Tomaszow Mazowiecki', 'Bełchatów', 'Belchatow', 'Zgierz', 'łódzkie', 'lodzkie'],
    'zachodniopomorskie': ['Szczecin', 'Koszalin', 'Stargard', 'Kołobrzeg', 'Kolobrzeg', 'Świnoujście', 'Swinoujscie', 'zachodniopomorskie'],
    'lubelskie': ['Lublin', 'Chełm', 'Chelm', 'Zamość', 'Zamosc', 'Biała Podlaska', 'Biala Podlaska', 'lubelskie'],
    'podkarpackie': ['Rzeszów', 'Rzeszow', 'Przemyśl', 'Przemysl', 'Stalowa Wola', 'Mielec', 'podkarpackie'],
    'kujawsko-pomorskie': ['Bydgoszcz', 'Toruń', 'Torun', 'Włocławek', 'Wloclawek', 'Grudziądz', 'Grudziadz', 'Inowrocław', 'Inowroclaw', 'kujawsko-pomorskie'],
    'podlaskie': ['Białystok', 'Bialystok', 'Suwałki', 'Suwalki', 'Łomża', 'Lomza', 'podlaskie', 'podlasie'],
    'lubuskie': ['Gorzów Wielkopolski', 'Gorzow Wielkopolski', 'Zielona Góra', 'Zielona Gora', 'lubuskie'],
    'opolskie': ['Opole', 'Kędzierzyn-Koźle', 'Kedzierzyn-Kozle', 'Nysa', 'opolskie'],
    'swietokrzyskie': ['Kielce', 'Ostrowiec Świętokrzyski', 'Ostrowiec Swietokrzyski', 'świętokrzyskie', 'swietokrzyskie'],
    'warminsko-mazurskie': ['Olsztyn', 'Elbląg', 'Elblag', 'Ełk', 'Elk', 'Iława', 'Ilawa', 'warmińsko-mazurskie', 'warminsko-mazurskie']
};

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
  'RADOM': [51.4027, 21.1471],
  'SOSNOWIEC': [50.2862, 19.1040],
  'TORUN': [53.0138, 18.5984],
  'KIELCE': [50.8660, 20.6285],
  'RZESZOW': [50.0413, 21.9991]
};

let ALL_NEWS = [];
let NEW_COUNT = 0;
let LAST_UPDATE_TIME = 0;

async function fetchRSSNews() {
    const statusEl = document.getElementById('sync-status');
    statusEl.textContent = 'Status: Pobieranie danych...';
    
    // Używamy rss2json by obejść CORS
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(CONFIG.rssUrl)}`;
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.status === 'ok') {
            processNews(data.items);
            statusEl.textContent = 'Status: Online (Synchronizacja OK)';
            document.getElementById('last-update').textContent = `Ostatnia aktualizacja: ${new Date().toLocaleTimeString('pl-PL')}`;
        } else {
            throw new Error('Błąd API rss2json');
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        statusEl.textContent = 'Status: Błąd połączenia!';
    }
}

function processNews(items) {
    const newsContainer = document.getElementById('news-container');
    const existingIds = ALL_NEWS.map(n => n.guid || n.link);
    
    let addedAny = false;
    
    items.forEach(item => {
        if (!existingIds.includes(item.guid || item.link)) {
            const enrichedItem = enrichItem(item);
            ALL_NEWS.unshift(enrichedItem);
            addedAny = true;
            if (LAST_UPDATE_TIME > 0) NEW_COUNT++;
        }
    });

    if (addedAny || ALL_NEWS.length === 0) {
        renderNews();
        updateCounter();
    }
    
    LAST_UPDATE_TIME = Date.now();
}

function enrichItem(item) {
    const title = item.title || "";
    const description = item.description || "";
    const fullText = (title + " " + description).toLowerCase();
    const tags = [];
    
    // Wykrywanie dróg (A1, S7, DK94, DW...)
    const roadMatch = title.match(/\b([AS][0-9]{1,2}|DK[0-9]{1,2}|DW[0-9]{3})\b/i);
    if (roadMatch) tags.push({ type: 'road', label: roadMatch[0].toUpperCase() });
    
    // Wykrywanie miast
    let detectedCity = null;
    for (const city in CITY_COORDS) {
        const regex = new RegExp(`\\b${city}\\b`, 'i');
        if (regex.test(title) || regex.test(description)) {
            detectedCity = city;
            tags.push({ type: 'city', label: city });
            break; 
        }
    }
    
    // Wykrywanie województwa (szukamy w tytule i opisie)
    let province = 'inne';
    for (const p in PROVINCE_KEYWORDS) {
        const keywords = PROVINCE_KEYWORDS[p];
        if (keywords.some(k => fullText.includes(k.toLowerCase()))) {
            province = p;
            break;
        }
    }
    
    return {
        ...item,
        tags,
        detectedCity,
        province,
        displayTime: formatRelativeTime(new Date(item.pubDate))
    };
}

function renderNews() {
    const newsContainer = document.getElementById('news-container');
    const provinceFilter = document.getElementById('province-filter').value;
    const sortOrder = document.getElementById('sort-order').value;
    
    newsContainer.innerHTML = '';
    
    let filteredNews = ALL_NEWS.filter(n => {
        if (provinceFilter === 'all') return true;
        return n.province === provinceFilter;
    });

    // Sortowanie po czasie (pubDate)
    filteredNews.sort((a, b) => {
        const timeA = new Date(a.pubDate).getTime();
        const timeB = new Date(b.pubDate).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    if (filteredNews.length === 0) {
        newsContainer.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Brak wiadomości dla tego filtra.</div>';
        return;
    }

    filteredNews.forEach(item => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.id = `card-${item.guid || item.link.slice(-10)}`;
        if (NEW_COUNT > 0 && ALL_NEWS.indexOf(item) < NEW_COUNT) {
            card.classList.add('new-item');
        }
        
        let tagsHtml = item.tags.map(t => `<span class="tag ${t.type}">${t.label}</span>`).join('');
        if (tagsHtml === "") tagsHtml = `<span class="tag">NEWS</span>`;
        
        let flyToBtn = '';
        if (item.detectedCity) {
            flyToBtn = `
                <a href="MAPA/index.html?city=${encodeURIComponent(item.detectedCity)}" class="fly-to-btn" title="Pokaż na mapie">
                    🔍
                </a>
            `;
        }

        // Czyścimy opis z HTML (Google News RSS czasem ma br i inne tagi)
        const cleanDesc = item.description.replace(/<[^>]*>?/gm, '');

        card.innerHTML = `
            <div class="news-header">
                <div class="tag-list">${tagsHtml}</div>
                <div class="time">${item.displayTime}</div>
            </div>
            <div class="news-title" onclick="toggleDescription('${card.id}')">${item.title}</div>
            
            <div class="news-description" id="desc-${card.id}">
                <p>${cleanDesc}</p>
                <div style="margin-top: 10px; font-size: 0.75rem; color: var(--accent-blue);">📍 Region: ${item.province.charAt(0).toUpperCase() + item.province.slice(1)}</div>
                <div class="desc-actions">
                    <a href="${item.link}" target="_blank" class="source-btn">PRZEJDŹ DO STRONY ↗</a>
                </div>
            </div>

            <div class="card-actions">
                ${flyToBtn}
                <button class="expand-indicator" onclick="toggleDescription('${card.id}')">▼</button>
            </div>
        `;
        newsContainer.appendChild(card);
    });
}

function toggleDescription(id) {
    const desc = document.getElementById(`desc-${id}`);
    const card = document.getElementById(id);
    const indicator = card.querySelector('.expand-indicator');
    
    if (desc.classList.contains('visible')) {
        desc.classList.remove('visible');
        indicator.style.transform = 'rotate(0deg)';
    } else {
        desc.classList.add('visible');
        indicator.style.transform = 'rotate(180deg)';
    }
}

function formatRelativeTime(date) {
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 60) return 'Przed chwilą';
    if (diff < 3600) return `${Math.floor(diff / 60)} min temu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h temu`;
    return date.toLocaleDateString('pl-PL');
}

function updateCounter() {
    const counterEl = document.getElementById('news-counter');
    if (NEW_COUNT > 0) {
        counterEl.textContent = NEW_COUNT;
        counterEl.style.display = 'inline-block';
    } else {
        counterEl.style.display = 'none';
    }
}

// Event Listeners
document.getElementById('refresh-news').addEventListener('click', () => {
    fetchRSSNews();
    if (typeof renderIncidents === 'function') renderIncidents();
});

document.getElementById('province-filter').addEventListener('change', () => {
    renderNews();
    if (typeof renderIncidents === 'function') renderIncidents();
});
document.getElementById('sort-order').addEventListener('change', renderNews);

document.getElementById('news-container').addEventListener('scroll', () => {
    if (NEW_COUNT > 0) {
        NEW_COUNT = 0;
        updateCounter();
        // Remove highlighting from rendered cards
        document.querySelectorAll('.new-item').forEach(el => el.classList.remove('new-item'));
    }
});

function renderIncidents() {
    const container = document.getElementById('incidents-container');
    const provinceFilter = document.getElementById('province-filter').value;
    
    if (!container) return;
    container.innerHTML = '';
    
    if (!window.INCIDENTS_DATA || !Array.isArray(window.INCIDENTS_DATA)) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--accent-red);">Brak danych systemowych (Błąd wczytywania).</div>';
        return;
    }

    // Filtrowanie incydentów (limitujemy do 100 dla wydajności)
    const filteredIncidents = window.INCIDENTS_DATA.filter(inc => {
        if (provinceFilter === 'all') return true;
        
        // Match incydent do województwa na podstawie regionu lub nazwy
        const keywords = PROVINCE_KEYWORDS[provinceFilter] || [];
        const textToSearch = ((inc.tags?.region || "") + " " + (inc.tags?.name || "")).toLowerCase();
        return keywords.some(k => textToSearch.includes(k.toLowerCase()));
    }).slice(0, 100);

    if (filteredIncidents.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Brak aktywnych zdarzeń systemowych w tym regionie.</div>';
        return;
    }

    filteredIncidents.forEach(inc => {
        const card = document.createElement('div');
        card.className = `incident-card ${inc.type}`;
        
        const typeLabel = inc.type === 'works' ? 'ROBOTY DROGOWE' : 'WYPADEK / ZDARZENIE';
        const flyToUrl = `MAPA/index.html?lat=${inc.lat}&lng=${inc.lon}&zoom=15`;

        card.innerHTML = `
            <div class="incident-meta">
                <span>ID: ${inc.id}</span>
                <span>STATUS: LIVE</span>
            </div>
            <div class="incident-name">${inc.tags.name || 'Zdarzenie drogowe'}</div>
            <div class="incident-region">${typeLabel} | ${inc.tags.region || 'POLSKA'}</div>
            <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                <a href="${flyToUrl}" class="fly-to-btn" title="Pokaż na mapie">🔍</a>
            </div>
        `;
        container.appendChild(card);
    });
}

// Initialization
fetchRSSNews();
renderIncidents();
setInterval(fetchRSSNews, CONFIG.refreshInterval);
setInterval(renderIncidents, CONFIG.refreshInterval);
