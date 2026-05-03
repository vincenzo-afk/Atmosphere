/* ═══════════════════════════════════════════════════
   ATMOSPHERE WEATHER DASHBOARD — app.js
   ═══════════════════════════════════════════════════ */

// ─── 1. CONSTANTS & CONFIG ────────────────────────────────────────────────────

// Use environment variable for API Key (provided by Vite)
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

const API = {
  current:  (city) => `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`,
  forecast: (city) => `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`,
  airQuality:(lat, lon) => `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
  uv:       (lat, lon) => `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
  geocode:  (q)   => `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${API_KEY}`,
  reverse:  (lat, lon) => `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`,
  icon:     (code) => `https://openweathermap.org/img/wn/${code}@2x.png`,
};

const WHO_LIMITS = { pm2_5: 15, pm10: 45, no2: 25, o3: 100, so2: 40, co: 4000 };

// ─── 2. UNIT CONVERSION UTILITIES ─────────────────────────────────────────────

function convertTemp(celsius, unit = STATE.settings.unit) {
  if (unit === 'F') return `${Math.round(celsius * 9 / 5 + 32)}°F`;
  if (unit === 'K') return `${Math.round(celsius + 273.15)}K`;
  return `${Math.round(celsius)}°C`;
}

function convertTempRaw(celsius, unit = STATE.settings.unit) {
  if (unit === 'F') return Math.round(celsius * 9 / 5 + 32);
  if (unit === 'K') return Math.round(celsius + 273.15);
  return Math.round(celsius);
}

function convertWind(kmh, unit = STATE.settings.windUnit) {
  if (unit === 'mph')   return `${(kmh / 1.60934).toFixed(1)} mph`;
  if (unit === 'ms')    return `${(kmh / 3.6).toFixed(1)} m/s`;
  if (unit === 'knots') return `${(kmh / 1.852).toFixed(1)} kn`;
  return `${Math.round(kmh)} km/h`;
}

function convertWindRaw(kmh, unit = STATE.settings.windUnit) {
  if (unit === 'mph')   return kmh / 1.60934;
  if (unit === 'ms')    return kmh / 3.6;
  if (unit === 'knots') return kmh / 1.852;
  return kmh;
}

function convertPressure(hpa, unit = STATE.settings.pressureUnit) {
  if (unit === 'inhg') return `${(hpa * 0.02953).toFixed(2)} inHg`;
  if (unit === 'mmhg') return `${Math.round(hpa * 0.75006)} mmHg`;
  return `${Math.round(hpa)} hPa`;
}

function convertDist(km, unit = STATE.settings.windUnit) {
  // use windUnit context for visibility (metric vs imperial)
  if (unit === 'mph') return `${(km * 0.62137).toFixed(1)} mi`;
  return `${km.toFixed(1)} km`;
}

// ─── 3. DATE / TIME UTILITIES ──────────────────────────────────────────────────

function formatTime(unixSeconds, offsetSeconds, format = STATE.settings.timeFormat) {
  const d = new Date((unixSeconds + offsetSeconds) * 1000);
  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();
  if (format === '12') {
    const ampm = utcH >= 12 ? 'PM' : 'AM';
    const h = ((utcH % 12) || 12).toString().padStart(2, '0');
    const m = utcM.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  }
  return `${utcH.toString().padStart(2, '0')}:${utcM.toString().padStart(2, '0')}`;
}

function formatClockTime(now, offsetSeconds, format = STATE.settings.timeFormat) {
  const cityMs = (now / 1000 + offsetSeconds) * 1000;
  const d = new Date(cityMs);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  if (format === '12') {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = ((h % 12) || 12).toString().padStart(2, '0');
    return `${hh}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ${ampm}`;
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function dayName(unixSeconds, offsetSeconds) {
  const d = new Date((unixSeconds + offsetSeconds) * 1000);
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getUTCDay()];
}

function monthDay(unixSeconds, offsetSeconds) {
  const d = new Date((unixSeconds + offsetSeconds) * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function timeDiffMinutes(unixSeconds) {
  return Math.floor((Date.now() / 1000 - unixSeconds) / 60);
}

function calculateMoonPhase(date = new Date()) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const daysSince = (date - knownNewMoon) / 86400000;
  const phase = ((daysSince % 29.53) + 29.53) % 29.53;
  let name, illumination;
  if (phase < 1.85)       { name = 'New Moon';        illumination = 0; }
  else if (phase < 7.38)  { name = 'Waxing Crescent'; illumination = Math.round((phase / 7.38) * 50); }
  else if (phase < 9.22)  { name = 'First Quarter';   illumination = 50; }
  else if (phase < 14.76) { name = 'Waxing Gibbous';  illumination = Math.round(50 + ((phase - 9.22) / 5.54) * 50); }
  else if (phase < 16.61) { name = 'Full Moon';       illumination = 100; }
  else if (phase < 22.15) { name = 'Waning Gibbous';  illumination = Math.round(100 - ((phase - 16.61) / 5.54) * 50); }
  else if (phase < 23.99) { name = 'Last Quarter';    illumination = 50; }
  else                    { name = 'Waning Crescent';  illumination = Math.round(50 - ((phase - 23.99) / 5.54) * 50); }
  const daysToFull = phase < 14.76 ? Math.ceil(14.76 - phase) : Math.ceil(29.53 - phase + 14.76);
  return { name, illumination: Math.max(0, Math.min(100, illumination)), phase, daysToFull };
}

function getWindDirection(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function getAQILabel(aqi) {
  const labels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
  const colors = ['', '#4caf50', '#9ccc65', '#ffb300', '#ff7043', '#e53935'];
  const messages = [
    '',
    'Air quality is satisfactory, little or no risk.',
    'Air quality is acceptable. May be a concern for very sensitive individuals.',
    'Members of sensitive groups may experience health effects.',
    'Health effects can be felt by anyone. Sensitive groups at greater risk.',
    'Very poor air quality — wear a mask outdoors.',
  ];
  return { label: labels[aqi] || '--', color: colors[aqi] || '#fff', message: messages[aqi] || '' };
}

function getUVLabel(uv) {
  if (uv <= 2)  return { label: 'Low',       color: '#4caf50', rec: 'No protection needed.' };
  if (uv <= 5)  return { label: 'Moderate',  color: '#c8a84b', rec: 'Wear SPF 30+.' };
  if (uv <= 7)  return { label: 'High',      color: '#ff9800', rec: 'Wear SPF 50+, hat & sunglasses.' };
  if (uv <= 10) return { label: 'Very High', color: '#f44336', rec: 'Minimize sun exposure 10am–4pm.' };
  return { label: 'Extreme', color: '#9c27b0', rec: 'Avoid sun exposure. Full protection.' };
}

function getWeatherEmoji(iconCode, condition) {
  const main = condition?.toLowerCase() || '';
  const isNight = iconCode?.endsWith('n');
  if (main.includes('thunderstorm')) return '⛈️';
  if (main.includes('drizzle'))      return '🌦️';
  if (main.includes('rain'))         return '🌧️';
  if (main.includes('snow'))         return '❄️';
  if (main.includes('mist') || main.includes('fog') || main.includes('haze')) return '🌫️';
  if (main.includes('cloud'))        return '☁️';
  if (isNight)                       return '🌙';
  return '☀️';
}

function getWeatherBgClass(condition, iconCode) {
  const main = condition?.toLowerCase() || '';
  const isNight = iconCode?.endsWith('n');
  if (main.includes('thunderstorm')) return 'thunderstorm';
  if (main.includes('drizzle') || main.includes('rain')) return 'rain';
  if (main.includes('snow'))  return 'snow';
  if (main.includes('mist') || main.includes('fog') || main.includes('haze')) return 'mist';
  if (main.includes('cloud')) return 'clouds';
  if (isNight) return 'clear-night';
  return 'clear-day';
}

function getHeroTint(condition) {
  const c = condition?.toLowerCase() || '';
  if (c.includes('thunderstorm')) return 'var(--thunderstorm)';
  if (c.includes('drizzle'))      return 'var(--drizzle)';
  if (c.includes('rain'))         return 'var(--rain)';
  if (c.includes('snow'))         return 'var(--snow)';
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return 'var(--mist)';
  if (c.includes('cloud'))        return 'var(--clouds)';
  return 'var(--clear)';
}

function getEmojiAnimation(condition, iconCode) {
  const main = condition?.toLowerCase() || '';
  const isNight = iconCode?.endsWith('n');
  if (main.includes('thunderstorm')) return 'emoji-shake';
  if (main.includes('rain') || main.includes('drizzle')) return 'emoji-bounce';
  if (main.includes('snow'))  return 'emoji-snowfall';
  if (main.includes('mist') || main.includes('fog')) return 'emoji-fade';
  if (main.includes('cloud')) return 'emoji-drift';
  if (isNight) return 'emoji-pulse';
  return 'emoji-spin';
}

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ─── 4. STATE ─────────────────────────────────────────────────────────────────

const STATE = {
  city: null,
  lat: null,
  lon: null,
  current: null,
  forecast: null,
  airQuality: null,
  uv: null,
  settings: {
    unit: 'C',
    windUnit: 'kmh',
    pressureUnit: 'hpa',
    timeFormat: '12',
    theme: 'dark',
    defaultCity: null,
    refreshInterval: 0,
  },
  history: {},
  cache: {},
  loading: false,
  error: null,
  alerts: [],
  lastUpdated: null,
  dismissedAlerts: new Set(),
  refreshTimer: null,
  clockTimer: null,
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('wv_settings');
    if (saved) Object.assign(STATE.settings, JSON.parse(saved));
  } catch {}
}

function saveSettings() {
  localStorage.setItem('wv_settings', JSON.stringify(STATE.settings));
}

function loadCache(city) {
  try {
    const key = `wv_cache_${city.toLowerCase().replace(/\s+/g, '_')}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveCache(city, data) {
  try {
    const key = `wv_cache_${city.toLowerCase().replace(/\s+/g, '_')}`;
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), ...data }));
  } catch {}
}

function loadHistory(city) {
  try {
    const key = `wv_history_${city.toLowerCase().replace(/\s+/g, '_')}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(city, entry) {
  const key = `wv_history_${city.toLowerCase().replace(/\s+/g, '_')}`;
  let hist = loadHistory(city);
  hist = hist.filter(h => h.date !== entry.date);
  hist.unshift(entry);
  hist = hist.slice(0, 7);
  localStorage.setItem(key, JSON.stringify(hist));
}

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem('wv_recent') || '[]');
  } catch { return []; }
}

function addRecentSearch(city) {
  let list = getRecentSearches();
  list = list.filter(c => c.toLowerCase() !== city.toLowerCase());
  list.unshift(city);
  list = list.slice(0, 6);
  localStorage.setItem('wv_recent', JSON.stringify(list));
}

function removeRecentSearch(city) {
  let list = getRecentSearches().filter(c => c.toLowerCase() !== city.toLowerCase());
  localStorage.setItem('wv_recent', JSON.stringify(list));
}

// ─── 5. API LAYER ─────────────────────────────────────────────────────────────

async function apiFetch(url, label) {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data.message || res.statusText;
    if (res.status === 401) throw new Error('api_key_invalid');
    if (res.status === 404) throw new Error('city_not_found');
    if (res.status === 429) throw new Error('rate_limit');
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchCurrentWeather(city) {
  return apiFetch(API.current(city), 'current');
}

async function fetchForecast(city) {
  return apiFetch(API.forecast(city), 'forecast');
}

async function fetchAirQuality(lat, lon) {
  return apiFetch(API.airQuality(lat, lon), 'air_quality');
}

async function fetchUV(lat, lon) {
  return apiFetch(API.uv(lat, lon), 'uv');
}

async function fetchGeocode(q) {
  return apiFetch(API.geocode(q), 'geocode');
}

async function fetchReverseGeocode(lat, lon) {
  return apiFetch(API.reverse(lat, lon), 'reverse');
}

// ─── 6. DATA PROCESSING ───────────────────────────────────────────────────────

function processForecastByDay(forecastData, tzOffset) {
  const days = {};
  for (const item of forecastData.list) {
    const d = new Date((item.dt + tzOffset) * 1000);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    if (!days[key]) {
      days[key] = {
        dt: item.dt,
        items: [],
        temps: [],
        pops: [],
        icons: {},
      };
    }
    days[key].items.push(item);
    days[key].temps.push(item.main.temp);
    days[key].pops.push(item.pop || 0);
    const ic = item.weather[0].icon;
    days[key].icons[ic] = (days[key].icons[ic] || 0) + 1;
  }
  return Object.entries(days).slice(0, 5).map(([key, day]) => {
    const dominantIcon = Object.entries(day.icons).sort((a, b) => b[1] - a[1])[0][0];
    return {
      dt: day.dt,
      tempMax: Math.max(...day.temps),
      tempMin: Math.min(...day.temps),
      pop: Math.max(...day.pops),
      icon: dominantIcon,
      condition: day.items.find(i => i.weather[0].icon === dominantIcon)?.weather[0].description || '',
      wind: Math.max(...day.items.map(i => i.wind?.speed || 0)) * 3.6,
      items: day.items,
    };
  });
}

// ─── 7. CANVAS DRAWING FUNCTIONS ──────────────────────────────────────────────

function drawSunArc(canvasId, sunriseTs, sunsetTs, tzOffset) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const nowSec = Date.now() / 1000;
  const cityNow = nowSec + tzOffset; // not UTC-adjusted, just offset shift for relative math
  // Use UTC-adjusted times for calculations
  const start = sunriseTs;
  const end   = sunsetTs;
  const dayLen = end - start;
  const progress = Math.max(0, Math.min(1, (nowSec - start) / dayLen));

  const cx = W / 2;
  const cy = H + 10;
  const r = H - 20;

  // arc background
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.strokeStyle = getCSSVar('--border2') || 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // arc progress
  const endAngle = Math.PI - progress * Math.PI;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, endAngle, false);
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 3;
  ctx.stroke();

  // sun dot
  const angle = Math.PI + progress * Math.PI;
  const sx = cx + r * Math.cos(angle);
  const sy = cy + r * Math.sin(angle);
  ctx.beginPath();
  ctx.arc(sx, sy, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c842';
  ctx.fill();

  // horizon dots
  ctx.beginPath(); ctx.arc(cx - r, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = getCSSVar('--text-muted') || '#5a5a57'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r, cy, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCompass(canvasId, windDeg, windSpeedKmh) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) / 2 - 10;

  // outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = getCSSVar('--border2') || 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // cardinal labels
  const cardinals = ['N', 'E', 'S', 'W'];
  ctx.fillStyle = getCSSVar('--text-dim') || '#9b9b97';
  ctx.font = `bold 11px ${getCSSVar('--mono') || 'monospace'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const offsets = [
    [cx, cy - r + 14],
    [cx + r - 14, cy],
    [cx, cy + r - 14],
    [cx - r + 14, cy],
  ];
  cardinals.forEach((c, i) => ctx.fillText(c, offsets[i][0], offsets[i][1]));

  // needle
  const rad = (windDeg - 90) * Math.PI / 180;
  const needleLen = r - 22;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + needleLen * Math.cos(rad), cy + needleLen * Math.sin(rad));
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = getCSSVar('--text') || '#e8e8e6';
  ctx.fill();

  // speed label
  const speed = convertWind(windSpeedKmh);
  ctx.fillStyle = getCSSVar('--text') || '#e8e8e6';
  ctx.font = `bold 12px ${getCSSVar('--mono') || 'monospace'}`;
  ctx.fillText(speed, cx, cy + 22);
}

function drawHumidityGauge(canvasId, humidity) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2 + 10;
  const r = Math.min(W, H) / 2 - 14;
  const startAngle = 0.75 * Math.PI;
  const endAngle = 2.25 * Math.PI;
  const progress = (endAngle - startAngle) * (humidity / 100);

  // background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = getCSSVar('--border2') || 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // progress arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, startAngle + progress);
  ctx.strokeStyle = '#5082dc';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // center text
  ctx.fillStyle = getCSSVar('--text') || '#e8e8e6';
  ctx.font = `bold 22px ${getCSSVar('--mono') || 'monospace'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${humidity}%`, cx, cy);
}

function drawPressureBar(canvasId, hpa) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const min = 980, max = 1040;
  const clamped = Math.max(min, Math.min(max, hpa));
  const progress = (clamped - min) / (max - min);
  const barH = 8;
  const y = (H - barH) / 2;

  // bg
  ctx.fillStyle = getCSSVar('--border2') || 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.roundRect(0, y, W, barH, 4);
  ctx.fill();

  // fill
  ctx.fillStyle = '#f5c842';
  ctx.beginPath();
  ctx.roundRect(0, y, W * progress, barH, 4);
  ctx.fill();

  // marker at 1013
  const markerX = ((1013 - min) / (max - min)) * W;
  ctx.fillStyle = getCSSVar('--text-dim') || '#9b9b97';
  ctx.fillRect(markerX - 1, y - 2, 2, barH + 4);
}

function drawAQIRing(canvasId, aqi) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) / 2 - 10;
  const { color } = getAQILabel(aqi);
  const progress = (aqi / 5) * (2 * Math.PI);

  // bg
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = getCSSVar('--border2') || 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 8;
  ctx.stroke();

  // ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + progress);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // number
  ctx.fillStyle = getCSSVar('--text') || '#e8e8e6';
  ctx.font = `bold 28px ${getCSSVar('--mono') || 'monospace'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(aqi, cx, cy);
}

function drawMoonPhase(canvasId, phase) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) / 2 - 8;

  // full moon circle background
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = getCSSVar('--border2') || 'rgba(255,255,255,0.13)';
  ctx.fill();

  // illuminated portion
  const phaseNorm = (phase % 29.53) / 29.53;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (phaseNorm < 0.5) {
    // waxing: right side lit
    const ellipseX = r * Math.abs(1 - phaseNorm * 4);
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI / 2, 3 * Math.PI / 2);
    ctx.fill();
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath();
    ctx.ellipse(cx, cy, ellipseX, r, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // waning: left side lit
    const ellipseX = r * Math.abs((phaseNorm - 0.5) * 4 - 1);
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath();
    ctx.ellipse(cx, cy, ellipseX, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = getCSSVar('--border2') || 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawSunTravel(canvasId, sunriseTs, sunsetTs) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const nowSec = Date.now() / 1000;
  const progress = Math.max(0, Math.min(1, (nowSec - sunriseTs) / (sunsetTs - sunriseTs)));

  const cx = W / 2;
  const cy = H + 10;
  const r = H - 20;

  // sky gradient arc area
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.strokeStyle = getCSSVar('--border2') || 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // progress
  const progressAngle = Math.PI + progress * Math.PI;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, progressAngle);
  ctx.strokeStyle = '#f5c842';
  ctx.lineWidth = 3;
  ctx.stroke();

  // sun
  const sx = cx + r * Math.cos(progressAngle);
  const sy = cy + r * Math.sin(progressAngle);
  ctx.beginPath();
  ctx.arc(sx, sy, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c842';
  ctx.fill();

  // labels
  ctx.fillStyle = getCSSVar('--text-muted') || '#5a5a57';
  ctx.font = `11px ${getCSSVar('--font') || 'Inter, sans-serif'}`;
  ctx.textAlign = 'left';
  ctx.fillText('Rise', 4, H - 5);
  ctx.textAlign = 'right';
  ctx.fillText('Set', W - 4, H - 5);
}

// Hourly chart state for hover
let hourlyChartData = [];
let hourlyChartBounds = {};

function drawHourlyChart(canvasId, hourlyItems, tzOffset) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Make canvas fill container
  const container = canvas.parentElement;
  canvas.width = container.clientWidth || 800;
  canvas.height = parseInt(getComputedStyle(canvas).height) || 320;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (!hourlyItems || hourlyItems.length === 0) return;

  hourlyChartData = hourlyItems;

  const padL = 45, padR = 20, padT = 40, padB = 70;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const temps = hourlyItems.map(i => i.main.temp);
  const minT = Math.min(...temps) - 2;
  const maxT = Math.max(...temps) + 2;
  const tempRange = maxT - minT;

  const xStep = chartW / (hourlyItems.length - 1);
  const points = hourlyItems.map((item, i) => ({
    x: padL + i * xStep,
    y: padT + chartH - ((item.main.temp - minT) / tempRange) * chartH,
    item,
  }));

  hourlyChartBounds = { padL, padR, padT, padB, chartW, chartH, xStep, minT, maxT, points, W, H, tzOffset };

  // Rain bars
  hourlyItems.forEach((item, i) => {
    const pop = (item.pop || 0);
    if (pop < 0.05) return;
    const x = padL + i * xStep;
    const barH = pop * (chartH * 0.3);
    const y = padT + chartH - barH;
    ctx.fillStyle = `rgba(80,140,220,${0.15 + pop * 0.2})`;
    ctx.fillRect(x - 10, y, 20, barH);
  });

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
  }
  ctx.lineTo(points[points.length - 1].x, padT + chartH);
  ctx.lineTo(points[0].x, padT + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
  }
  ctx.strokeStyle = getCSSVar('--text') || '#e8e8e6';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Points and labels
  points.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = getCSSVar('--text') || '#e8e8e6';
    ctx.fill();

    // temp label
    ctx.fillStyle = getCSSVar('--text') || '#e8e8e6';
    ctx.font = `bold 11px ${getCSSVar('--mono') || 'monospace'}`;
    ctx.textAlign = 'center';
    ctx.fillText(convertTemp(pt.item.main.temp), pt.x, pt.y - 12);

    // time label
    ctx.fillStyle = getCSSVar('--text-muted') || '#5a5a57';
    ctx.font = `10px ${getCSSVar('--font') || 'Inter, sans-serif'}`;
    ctx.fillText(formatTime(pt.item.dt, tzOffset), pt.x, padT + chartH + 18);

    // weather emoji
    const emo = getWeatherEmoji(pt.item.weather[0].icon, pt.item.weather[0].main);
    ctx.font = '14px serif';
    ctx.fillText(emo, pt.x, padT + chartH + 36);
  });

  // NOW line
  const nowSec = Date.now() / 1000;
  const firstDt = hourlyItems[0].dt;
  const lastDt  = hourlyItems[hourlyItems.length - 1].dt;
  if (nowSec >= firstDt && nowSec <= lastDt) {
    const nowProgress = (nowSec - firstDt) / (lastDt - firstDt);
    const nowX = padL + nowProgress * chartW;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(nowX, padT);
    ctx.lineTo(nowX, padT + chartH);
    ctx.strokeStyle = getCSSVar('--warn') || '#c8a84b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = getCSSVar('--warn') || '#c8a84b';
    ctx.font = `bold 10px ${getCSSVar('--font') || 'Inter, sans-serif'}`;
    ctx.textAlign = 'center';
    ctx.fillText('NOW', nowX, padT - 6);
  }

  // Y-axis
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const t = minT + (tempRange / yTicks) * i;
    const y = padT + chartH - ((t - minT) / tempRange) * chartH;
    ctx.fillStyle = getCSSVar('--text-muted') || '#5a5a57';
    ctx.font = `10px ${getCSSVar('--mono') || 'monospace'}`;
    ctx.textAlign = 'right';
    ctx.fillText(convertTempRaw(t) + '°', padL - 6, y + 4);
    ctx.strokeStyle = getCSSVar('--border') || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();
  }
}

function drawShareCard(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !STATE.current) return;
  const ctx = canvas.getContext('2d');
  const W = 600, H = 300;
  canvas.width = W; canvas.height = H;

  // Background
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, W, H);

  // Subtle border
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  const c = STATE.current;
  const tz = c.timezone;

  // City + Date
  ctx.fillStyle = '#e8e8e6';
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${c.name}, ${c.sys.country}`, 30, 48);
  ctx.fillStyle = '#9b9b97';
  ctx.font = '13px Inter, sans-serif';
  ctx.fillText(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), 30, 70);

  // Big temperature
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 80px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(convertTemp(c.main.temp), W / 2, 170);

  // Condition emoji + text
  const emoji = getWeatherEmoji(c.weather[0].icon, c.weather[0].main);
  ctx.font = '36px serif';
  ctx.fillText(emoji, W / 2, 210);
  ctx.fillStyle = '#9b9b97';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(c.weather[0].description.charAt(0).toUpperCase() + c.weather[0].description.slice(1), W / 2, 232);

  // Stats row
  const stats = [
    `💧 ${c.main.humidity}%`,
    `💨 ${convertWind(c.wind.speed * 3.6)}`,
    `UV ${STATE.uv?.value ?? '--'}`,
  ];
  ctx.fillStyle = '#9b9b97';
  ctx.font = '13px Inter, sans-serif';
  stats.forEach((s, i) => {
    ctx.textAlign = 'center';
    ctx.fillText(s, 130 + i * 170, 268);
  });

  // Watermark
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('☁ Atmosphere', W - 20, H - 12);
}

// ─── 8. DOM RENDER FUNCTIONS ──────────────────────────────────────────────────

function renderHeroCard() {
  const c = STATE.current;
  if (!c) return;
  const tz = c.timezone;

  // City/country
  document.getElementById('hero-city').textContent = c.name;
  document.getElementById('hero-country').textContent = c.sys.country;

  // Updated
  const mins = timeDiffMinutes(c.dt);
  document.getElementById('hero-updated').textContent = `Updated ${mins < 1 ? 'just now' : mins + ' min ago'}`;

  // Temperature (animated count-up)
  animateNumber('hero-temp', convertTempRaw(c.main.temp), (v) => {
    const unit = STATE.settings.unit === 'C' ? '°C' : STATE.settings.unit === 'F' ? '°F' : 'K';
    document.getElementById('hero-temp').textContent = `${v}${unit}`;
  });

  document.getElementById('hero-feels-temp').textContent = convertTemp(c.main.feels_like);
  document.getElementById('hero-min-temp').textContent = convertTemp(c.main.temp_min);
  document.getElementById('hero-max-temp').textContent = convertTemp(c.main.temp_max);

  // Condition
  const desc = c.weather[0].description;
  document.getElementById('hero-condition-text').textContent = desc.charAt(0).toUpperCase() + desc.slice(1);
  const icon = document.getElementById('hero-icon');
  icon.src = API.icon(c.weather[0].icon);
  icon.alt = desc;
  icon.style.display = 'block';

  // Emoji
  const emoji = getWeatherEmoji(c.weather[0].icon, c.weather[0].main);
  const emojiEl = document.getElementById('hero-weather-emoji');
  emojiEl.textContent = emoji;
  emojiEl.className = 'hero-weather-emoji ' + getEmojiAnimation(c.weather[0].main, c.weather[0].icon);

  // Stats
  document.getElementById('hero-humidity').textContent = `${c.main.humidity}%`;
  document.getElementById('hero-wind').textContent = convertWind(c.wind.speed * 3.6);
  const arrowEl = document.getElementById('hero-wind-arrow');
  arrowEl.style.transform = `rotate(${c.wind.deg || 0}deg)`;
  document.getElementById('hero-visibility').textContent = convertDist((c.visibility || 10000) / 1000);
  document.getElementById('hero-pressure').textContent = convertPressure(c.main.pressure);

  // Hero card background tint
  document.getElementById('hero-card').style.background = getHeroTint(c.weather[0].main);

  // Weather background
  const bg = document.getElementById('weather-bg');
  bg.className = 'weather-bg ' + getWeatherBgClass(c.weather[0].main, c.weather[0].icon);

  // Data age
  const cacheAge = STATE.lastUpdated ? Math.floor((Date.now() - STATE.lastUpdated) / 60000) : 0;
  const dataAgeEl = document.getElementById('data-age');
  dataAgeEl.textContent = `Data from ${cacheAge < 1 ? 'just now' : cacheAge + ' min ago'}`;
  if (cacheAge > 180) dataAgeEl.classList.add('stale');
  else dataAgeEl.classList.remove('stale');

  // Sunrise/Sunset side card
  const rise = formatTime(c.sys.sunrise, tz);
  const set  = formatTime(c.sys.sunset,  tz);
  document.getElementById('sunrise-time').textContent = rise;
  document.getElementById('sunset-time').textContent  = set;
  const nowSec = Date.now() / 1000;
  if (nowSec < c.sys.sunrise) {
    const diff = Math.round((c.sys.sunrise - nowSec) / 60);
    document.getElementById('sun-next').textContent = `${diff} min until sunrise`;
  } else if (nowSec < c.sys.sunset) {
    const diff = Math.round((c.sys.sunset - nowSec) / 60);
    document.getElementById('sun-next').textContent = `${diff} min until sunset`;
  } else {
    document.getElementById('sun-next').textContent = 'Sun has set';
  }
  drawSunArc('sun-arc-canvas', c.sys.sunrise, c.sys.sunset, tz);

  // Pressure
  document.getElementById('pressure-value').textContent = convertPressure(c.main.pressure);
  const pTrend = c.main.pressure > 1013 ? '↑ Above average' : c.main.pressure < 1010 ? '↓ Below average' : '→ Near standard';
  document.getElementById('pressure-trend').textContent = pTrend;
  drawPressureBar('pressure-canvas', c.main.pressure);

  // Visibility
  const vis = (c.visibility || 10000) / 1000;
  document.getElementById('visibility-value').textContent = convertDist(vis);
  let visDesc = 'Crystal clear';
  if (vis < 1)  visDesc = 'Very poor';
  else if (vis < 2) visDesc = 'Poor';
  else if (vis < 5) visDesc = 'Moderate';
  else if (vis < 10) visDesc = 'Good';
  document.getElementById('visibility-desc').textContent = visDesc;

  const dotsEl = document.getElementById('visibility-dots');
  const dotCount = 10;
  const filled = Math.round((vis / 10) * dotCount);
  dotsEl.innerHTML = Array.from({ length: dotCount }, (_, i) =>
    `<span class="vis-dot ${i < filled ? 'filled' : ''}"></span>`
  ).join('');

  // Wind compass
  drawCompass('compass-canvas', c.wind.deg || 0, c.wind.speed * 3.6);
  const gustEl = document.getElementById('wind-gust');
  if (c.wind.gust) {
    gustEl.textContent = `Gust: ${convertWind(c.wind.gust * 3.6)}`;
    gustEl.style.display = 'block';
  } else {
    gustEl.style.display = 'none';
  }

  // Humidity gauge
  drawHumidityGauge('humidity-canvas', c.main.humidity);
  const hum = c.main.humidity;
  const comfortLabel = hum < 30 ? 'Dry' : hum < 50 ? 'Comfortable' : hum < 70 ? 'Humid' : 'Very Humid';
  document.getElementById('humidity-comfort').textContent = comfortLabel;
}

function renderUV() {
  if (!STATE.uv) return;
  const uv = Math.round(STATE.uv.value || 0);
  document.getElementById('uv-value').textContent = uv;
  const { label, color, rec } = getUVLabel(uv);
  const uvLabel = document.getElementById('uv-label');
  uvLabel.textContent = label;
  uvLabel.style.color = color;
  const progress = Math.min(100, (uv / 11) * 100);
  document.getElementById('uv-progress').style.width = `${progress}%`;
  document.getElementById('uv-progress').style.background = color;
  document.getElementById('uv-recommendation').textContent = rec;
}

function renderForecast() {
  if (!STATE.forecast || !STATE.current) return;
  const tzOffset = STATE.current.timezone;
  const days = processForecastByDay(STATE.forecast, tzOffset);
  const container = document.getElementById('forecast-cards');
  container.innerHTML = '';

  const nowSec = Date.now() / 1000;

  days.forEach((day, index) => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Forecast for ${dayName(day.dt, tzOffset)}`);

    const isToday = index === 0;
    const isTomorrow = index === 1;
    let dLabel = dayName(day.dt, tzOffset);
    if (isToday) dLabel = 'Today';
    if (isTomorrow) dLabel = 'Tomorrow';

    const emoji = getWeatherEmoji(day.icon, day.condition);
    const condText = day.condition.charAt(0).toUpperCase() + day.condition.slice(1);

    card.innerHTML = `
      <div class="forecast-day">${dLabel}</div>
      <div class="forecast-date">${monthDay(day.dt, tzOffset)}</div>
      <div class="forecast-emoji">${emoji}</div>
      <div class="forecast-condition">${condText}</div>
      <div class="forecast-temps">
        <span class="forecast-high">${convertTemp(day.tempMax)}</span>
        <span class="forecast-low">${convertTemp(day.tempMin)}</span>
      </div>
      <div class="forecast-pop">💧 ${Math.round(day.pop * 100)}%</div>
      <div class="forecast-wind">💨 ${convertWind(day.wind)}</div>
    `;

    // Expand on click
    const expandDiv = document.createElement('div');
    expandDiv.className = 'forecast-expand';
    expandDiv.style.display = 'none';

    card.addEventListener('click', () => {
      const isOpen = expandDiv.style.display !== 'none';
      expandDiv.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) {
        expandDiv.innerHTML = day.items.map(item => `
          <div class="forecast-expand-row">
            <span class="fe-time">${formatTime(item.dt, tzOffset)}</span>
            <span class="fe-emoji">${getWeatherEmoji(item.weather[0].icon, item.weather[0].main)}</span>
            <span class="fe-temp">${convertTemp(item.main.temp)}</span>
            <span class="fe-pop">💧 ${Math.round((item.pop || 0) * 100)}%</span>
            <span class="fe-wind">💨 ${convertWind((item.wind?.speed || 0) * 3.6)}</span>
          </div>
        `).join('');
      }
    });

    card.appendChild(expandDiv);
    container.appendChild(card);
  });
}

function renderHourlyChart() {
  if (!STATE.forecast || !STATE.current) return;
  const tzOffset = STATE.current.timezone;
  const items = STATE.forecast.list.slice(0, 8);
  drawHourlyChart('hourly-chart', items, tzOffset);
}

function renderAQI() {
  if (!STATE.airQuality) return;
  const aqiVal = STATE.airQuality.list[0].main.aqi;
  drawAQIRing('aqi-ring-canvas', aqiVal);
  const { label, color, message } = getAQILabel(aqiVal);
  const lblEl = document.getElementById('aqi-label');
  lblEl.textContent = label;
  lblEl.style.color = color;
  document.getElementById('aqi-message').textContent = message;

  const comp = STATE.airQuality.list[0].components;
  const pollutants = [
    { key: 'pm2_5', label: 'PM2.5', limit: WHO_LIMITS.pm2_5 },
    { key: 'pm10',  label: 'PM10',  limit: WHO_LIMITS.pm10 },
    { key: 'no2',   label: 'NO₂',   limit: WHO_LIMITS.no2 },
    { key: 'o3',    label: 'O₃',    limit: WHO_LIMITS.o3 },
    { key: 'so2',   label: 'SO₂',   limit: WHO_LIMITS.so2 },
    { key: 'co',    label: 'CO',    limit: WHO_LIMITS.co },
  ];

  const pollEl = document.getElementById('aqi-pollutants');
  pollEl.innerHTML = pollutants.map(p => {
    const val = comp[p.key] || 0;
    const pct = Math.min(100, (val / p.limit) * 100);
    const col = pct < 50 ? '#4caf50' : pct < 100 ? '#c8a84b' : '#e55';
    return `
      <div class="pollutant-row">
        <span class="pollutant-name">${p.label}</span>
        <span class="pollutant-val">${val.toFixed(1)} μg/m³</span>
        <div class="pollutant-bar-bg">
          <div class="pollutant-bar-fill" style="width:${pct}%;background:${col}"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderSunMoon() {
  if (!STATE.current) return;
  const c = STATE.current;
  const tz = c.timezone;

  drawSunTravel('sun-travel-canvas', c.sys.sunrise, c.sys.sunset);

  const dayLen = c.sys.sunset - c.sys.sunrise;
  const dh = Math.floor(dayLen / 3600);
  const dm = Math.floor((dayLen % 3600) / 60);
  document.getElementById('day-length').textContent = `${dh}h ${dm}m`;

  const ghRise = formatTime(c.sys.sunrise + 3600, tz);
  const ghSet  = formatTime(c.sys.sunset  - 3600, tz);
  document.getElementById('golden-hour').textContent = `${ghRise} & ${ghSet}`;

  // Moon
  const moon = calculateMoonPhase(new Date());
  drawMoonPhase('moon-phase-canvas', moon.phase);
  document.getElementById('moon-phase-name').textContent = moon.name;
  document.getElementById('moon-illumination').textContent = `${moon.illumination}% illuminated`;
  document.getElementById('next-full-moon').textContent = `Next full moon: ${moon.daysToFull} days`;
}

function renderAlerts() {
  if (!STATE.current) return;
  const c = STATE.current;
  const container = document.getElementById('alert-banners');
  const tempC = c.main.temp;
  const windKmh = c.wind.speed * 3.6;
  const cond = c.weather[0].main;
  const uv = STATE.uv?.value || 0;
  const aqi = STATE.airQuality?.list[0].main.aqi || 0;

  const rawAlerts = [];
  if (tempC > 40)             rawAlerts.push({ id: 'heat',      color: '#e55',     icon: '🔴', text: 'Extreme heat warning — stay indoors and hydrate.' });
  if (tempC < 0)              rawAlerts.push({ id: 'freeze',    color: '#5082dc',  icon: '🔵', text: 'Freezing conditions — black ice possible.' });
  if (windKmh > 60)           rawAlerts.push({ id: 'wind',      color: '#ff9800',  icon: '🟠', text: 'Strong wind advisory — secure loose items.' });
  if (cond.includes('Thunderstorm')) rawAlerts.push({ id: 'thunder', color: '#ff9800', icon: '⚡', text: 'Lightning risk — seek shelter immediately.' });
  if (cond.includes('Snow') && tempC < -5) rawAlerts.push({ id: 'blizzard', color: '#5082dc', icon: '❄️', text: 'Blizzard conditions — avoid unnecessary travel.' });
  if (uv > 8)                 rawAlerts.push({ id: 'uv',        color: '#c8a84b',  icon: '🟡', text: 'Very high UV — limit outdoor exposure.' });
  if (aqi === 5)              rawAlerts.push({ id: 'aqi',       color: '#e55',     icon: '🔴', text: 'Very poor air quality — wear a mask outdoors.' });

  container.innerHTML = '';
  rawAlerts.forEach(alert => {
    if (sessionStorage.getItem(`wv_dismiss_${alert.id}`)) return;
    const div = document.createElement('div');
    div.className = 'alert-banner';
    div.style.borderLeft = `3px solid ${alert.color}`;
    div.innerHTML = `
      <span class="alert-icon">${alert.icon}</span>
      <span class="alert-text">${alert.text}</span>
      <button class="alert-dismiss" aria-label="Dismiss alert">✕</button>
    `;
    div.querySelector('.alert-dismiss').addEventListener('click', () => {
      sessionStorage.setItem(`wv_dismiss_${alert.id}`, '1');
      div.remove();
    });
    container.appendChild(div);
  });
}

function renderHistory() {
  if (!STATE.city) return;
  const hist = loadHistory(STATE.city);
  const container = document.getElementById('history-content');
  if (hist.length <= 1) {
    container.innerHTML = '<p class="history-empty">Come back tomorrow to see trends.</p>';
    return;
  }

  container.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Temp</th>
          <th>Condition</th>
          <th>Humidity</th>
          <th>Wind</th>
        </tr>
      </thead>
      <tbody>
        ${hist.map(h => `
          <tr>
            <td>${h.date}</td>
            <td style="color:${h.tempC > 28 ? '#f5c842' : h.tempC < 10 ? '#5082dc' : 'inherit'}">${convertTemp(h.tempC)}</td>
            <td>${h.condition}</td>
            <td>${h.humidity}%</td>
            <td>${convertWind(h.wind)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderWhatToWear() {
  if (!STATE.current) return;
  const c = STATE.current;
  const t = c.main.temp;
  const wind = c.wind.speed * 3.6;
  const hum = c.main.humidity;
  const uv = STATE.uv?.value || 0;
  const cond = c.weather[0].main.toLowerCase();

  const tips = [];
  if (t > 30)             tips.push('🩳 Shorts & t-shirt. Stay hydrated!');
  else if (t > 25)        tips.push('👕 Light clothes. Sunscreen recommended.');
  else if (t > 20)        tips.push('👔 Comfortable layer. Perfect weather.');
  else if (t > 15)        tips.push('🧥 Light jacket. Bring one just in case.');
  else if (t > 10)        tips.push('🧣 Sweater + jacket. Layer up.');
  else if (t > 5)         tips.push('🧤 Warm coat, gloves, scarf.');
  else                    tips.push('🥶 Heavy winter coat. Stay warm!');

  if (cond.includes('rain') || cond.includes('drizzle')) tips.push('☂️ Grab an umbrella!');
  if (wind > 40)          tips.push('💨 Secure loose items — strong winds!');
  if (uv > 6)             tips.push('🕶️ Sunglasses + SPF 50 recommended.');
  if (hum > 80)           tips.push('💦 Very humid — light breathable fabrics.');

  document.getElementById('what-to-wear').innerHTML = tips.slice(0, 4).map(t =>
    `<div class="wear-tip">${t}</div>`
  ).join('');
}

function renderFunStats() {
  if (!STATE.current) return;
  const c = STATE.current;
  const t = c.main.temp;
  const wind = c.wind.speed * 3.6;
  const hum = c.main.humidity;
  const vis = (c.visibility || 10000) / 1000;
  const pres = c.main.pressure;

  const eiffelTowers = (vis / 0.33).toFixed(0);
  let windComp = 'a gentle breeze';
  if (wind > 110) windComp = 'a highway car';
  else if (wind > 30) windComp = 'cycling speed';
  else if (wind > 10) windComp = 'a fast walk';

  let humComp = 'a desert';
  if (hum > 80) humComp = 'a tropical sauna';
  else if (hum > 60) humComp = 'a tropical forest';
  else if (hum > 40) humComp = 'a comfortable room';

  const bodyMsg = t > 30 ? 'working harder than usual to cool down' : t < 10 ? 'working hard to stay warm' : 'in its comfort zone';

  const facts = [
    `🌡 At ${convertTemp(t)}, your body is ${bodyMsg}.`,
    `💨 Wind of ${convertWind(wind)} ≈ ${windComp}.`,
    `💧 Humidity of ${hum}% feels like ${humComp}.`,
    `👁 Visibility of ${convertDist(vis)} = ~${eiffelTowers} Eiffel Towers end to end.`,
    `🌏 Pressure of ${convertPressure(pres)} is ${pres > 1013 ? 'above' : pres < 1010 ? 'below' : 'at'} sea level standard.`,
  ];

  document.getElementById('fun-stats').innerHTML = facts.map(f =>
    `<div class="fun-fact">${f}</div>`
  ).join('');
}

function renderAll() {
  renderHeroCard();
  renderUV();
  renderForecast();
  renderHourlyChart();
  renderAQI();
  renderSunMoon();
  renderAlerts();
  renderHistory();
  renderWhatToWear();
  renderFunStats();
}

// ─── 9. SETTINGS PANEL ────────────────────────────────────────────────────────

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
  document.body.classList.toggle('theme-light', theme === 'light');
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  // Redraw canvases
  if (STATE.current) {
    drawSunArc('sun-arc-canvas', STATE.current.sys.sunrise, STATE.current.sys.sunset, STATE.current.timezone);
    drawCompass('compass-canvas', STATE.current.wind.deg || 0, STATE.current.wind.speed * 3.6);
    drawHumidityGauge('humidity-canvas', STATE.current.main.humidity);
    drawPressureBar('pressure-canvas', STATE.current.main.pressure);
    if (STATE.airQuality) drawAQIRing('aqi-ring-canvas', STATE.airQuality.list[0].main.aqi);
    drawSunTravel('sun-travel-canvas', STATE.current.sys.sunrise, STATE.current.sys.sunset);
    const moon = calculateMoonPhase(new Date());
    drawMoonPhase('moon-phase-canvas', moon.phase);
    renderHourlyChart();
  }
}

function openSettings() {
  const panel = document.getElementById('settings-panel');
  panel.classList.add('open');
  // Sync active states
  document.querySelectorAll('.settings-option').forEach(btn => {
    const setting = btn.dataset.setting;
    const value   = btn.dataset.value;
    btn.classList.toggle('active', String(STATE.settings[setting]) === String(value));
  });
  const defCityInput = document.getElementById('default-city-input');
  if (defCityInput) defCityInput.value = STATE.settings.defaultCity || '';
}

function closeSettings() {
  document.getElementById('settings-panel').classList.remove('open');
}

function initSettingsListeners() {
  document.getElementById('settings-toggle').addEventListener('click', openSettings);
  document.getElementById('settings-close').addEventListener('click', closeSettings);

  document.querySelectorAll('.settings-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const setting = btn.dataset.setting;
      const value   = btn.dataset.value;
      STATE.settings[setting] = isNaN(value) ? value : (value === '0' || value === '600' || value === '1800') ? Number(value) : value;
      document.querySelectorAll(`.settings-option[data-setting="${setting}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (setting === 'theme') applyTheme(value);
      if (setting === 'refreshInterval') setupAutoRefresh();
      if (setting === 'unit') {
        document.querySelectorAll('.unit-option').forEach(o => o.classList.toggle('active', o.dataset.unit === value));
      }
      saveSettings();
      if (STATE.current) renderAll();
    });
  });

  document.getElementById('save-default-city').addEventListener('click', () => {
    const val = document.getElementById('default-city-input').value.trim();
    if (val) { STATE.settings.defaultCity = val; saveSettings(); showTooltip('Default city saved'); }
  });

  document.getElementById('clear-history-btn').addEventListener('click', () => {
    if (!confirm('Clear all stored weather history?')) return;
    Object.keys(localStorage).filter(k => k.startsWith('wv_history_')).forEach(k => localStorage.removeItem(k));
    showTooltip('History cleared');
    renderHistory();
  });
}

// ─── 10. SEARCH & AUTOCOMPLETE ────────────────────────────────────────────────

let searchDebounceTimer = null;

function renderRecentSearches() {
  const container = document.getElementById('recent-searches');
  const list = getRecentSearches();
  if (!list.length) { container.innerHTML = ''; return; }
  container.innerHTML = list.map(city => `
    <div class="recent-chip">
      <span class="recent-city">${city}</span>
      <button class="recent-remove" data-city="${city}" aria-label="Remove ${city}">✕</button>
    </div>
  `).join('');
  container.querySelectorAll('.recent-city').forEach(el => {
    el.addEventListener('click', () => searchCity(el.textContent));
  });
  container.querySelectorAll('.recent-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeRecentSearch(btn.dataset.city);
      renderRecentSearches();
    });
  });
}

function showAutocomplete(results) {
  const dropdown = document.getElementById('autocomplete-dropdown');
  const input = document.getElementById('search-input');
  if (!results.length) { dropdown.style.display = 'none'; input.setAttribute('aria-expanded', 'false'); return; }

  dropdown.style.display = 'block';
  input.setAttribute('aria-expanded', 'true');
  dropdown.innerHTML = results.map((r, i) => {
    const flag = countryFlag(r.country);
    return `<div class="autocomplete-item" role="option" data-idx="${i}" tabindex="0">
      <span class="ac-flag">${flag}</span>
      <span class="ac-name">${r.name}</span>
      <span class="ac-country">${r.state ? r.state + ', ' : ''}${r.country}</span>
    </div>`;
  }).join('');

  dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      document.getElementById('search-input').value = results[i].name;
      hideAutocomplete();
      searchCity(results[i].name);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') el.click();
    });
  });
}

function hideAutocomplete() {
  const dropdown = document.getElementById('autocomplete-dropdown');
  dropdown.style.display = 'none';
  document.getElementById('search-input').setAttribute('aria-expanded', 'false');
}

function countryFlag(code) {
  if (!code || code.length !== 2) return '🌐';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function initSearchListeners() {
  const input = document.getElementById('search-input');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchDebounceTimer);
      hideAutocomplete();
      const city = input.value.trim();
      if (city) searchCity(city);
    }
    if (e.key === 'Escape') hideAutocomplete();
  });

  input.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    const q = input.value.trim();
    if (q.length < 2) { hideAutocomplete(); return; }
    searchDebounceTimer = setTimeout(async () => {
      try {
        const results = await fetchGeocode(q);
        showAutocomplete(results);
      } catch {}
    }, 400);
  });

  document.getElementById('location-btn').addEventListener('click', () => {
    if (!navigator.geolocation) {
      showError('geo_denied'); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await fetchReverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (results && results[0]) {
            searchCity(results[0].name);
          }
        } catch (e) { showError('network'); }
      },
      () => showError('geo_denied')
    );
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar') && !e.target.closest('.autocomplete-dropdown')) {
      hideAutocomplete();
    }
  });
}

// ─── 11. SEARCH CITY (MAIN FETCH) ────────────────────────────────────────────

async function searchCity(city) {
  if (!city) return;
  STATE.city = city;
  STATE.loading = true;
  STATE.error = null;

  // Hide weather content, show skeleton
  document.getElementById('weather-content').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('loading-skeleton').style.display = 'block';

  // Check API key
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    document.getElementById('api-key-banner').style.display = 'block';
    document.getElementById('loading-skeleton').style.display = 'none';
    return;
  }

  // Check offline
  const isOffline = !navigator.onLine;
  if (isOffline) {
    const cached = loadCache(city);
    if (cached) {
      applyDataToState(cached);
      showOfflineBanner(city);
      showWeatherContent();
      return;
    }
    showError('offline');
    return;
  }

  try {
    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(city),
      fetchForecast(city),
    ]);
    const lat = current.coord.lat;
    const lon = current.coord.lon;
    const [airQuality, uv] = await Promise.all([
      fetchAirQuality(lat, lon),
      fetchUV(lat, lon),
    ]);

    STATE.current = current;
    STATE.forecast = forecast;
    STATE.airQuality = airQuality;
    STATE.uv = uv;
    STATE.lat = lat;
    STATE.lon = lon;
    STATE.lastUpdated = Date.now();

    // Save cache
    saveCache(city, { currentWeather: current, forecast, airQuality, uv });

    // Save history entry (once per day)
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    saveHistory(city, {
      date: today,
      tempC: current.main.temp,
      condition: current.weather[0].description,
      humidity: current.main.humidity,
      wind: current.wind.speed * 3.6,
    });

    addRecentSearch(city);
    renderRecentSearches();

    // Settings default city
    STATE.settings.defaultCity = city;
    saveSettings();

    showWeatherContent();
  } catch (err) {
    const msg = err.message;
    if (msg === 'city_not_found') showError('city_not_found');
    else if (msg === 'api_key_invalid') showError('api_key_invalid');
    else if (msg === 'rate_limit') showError('rate_limit');
    else {
      // Try cache fallback
      const cached = loadCache(city);
      if (cached) {
        applyDataToState(cached);
        showOfflineBanner(city);
        showWeatherContent();
      } else {
        showError('network');
      }
    }
  } finally {
    STATE.loading = false;
  }
}

function applyDataToState(cached) {
  STATE.current = cached.currentWeather;
  STATE.forecast = cached.forecast;
  STATE.airQuality = cached.airQuality;
  STATE.uv = cached.uv;
  if (STATE.current) {
    STATE.lat = STATE.current.coord.lat;
    STATE.lon = STATE.current.coord.lon;
  }
  STATE.lastUpdated = cached.timestamp;
}

function showWeatherContent() {
  document.getElementById('loading-skeleton').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
  const wc = document.getElementById('weather-content');
  wc.style.display = 'block';
  wc.style.opacity = '0';
  wc.style.transform = 'translateY(12px)';
  requestAnimationFrame(() => {
    wc.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    wc.style.opacity = '1';
    wc.style.transform = 'translateY(0)';
  });
  renderAll();
}

function showOfflineBanner(city) {
  const banner = document.getElementById('offline-banner');
  const text = document.getElementById('offline-text');
  const cached = loadCache(city);
  const mins = cached ? Math.floor((Date.now() - cached.timestamp) / 60000) : 0;
  text.textContent = `You appear to be offline. Showing cached data from ${mins} min ago.`;
  banner.style.display = 'flex';
}

function showError(type) {
  document.getElementById('loading-skeleton').style.display = 'none';
  document.getElementById('weather-content').style.display = 'none';
  const errState = document.getElementById('error-state');
  errState.style.display = 'flex';

  const icons = {
    city_not_found: '🔍',
    api_key_invalid: '🔑',
    rate_limit: '⏳',
    network: '📡',
    offline: '📡',
    geo_denied: '📍',
  };
  const titles = {
    city_not_found: 'City not found',
    api_key_invalid: 'Invalid API key',
    rate_limit: 'Too many requests',
    network: 'Connection error',
    offline: 'You are offline',
    geo_denied: 'Location denied',
  };
  const messages = {
    city_not_found: 'We couldn\'t find that city. Check the spelling and try again.',
    api_key_invalid: 'Your OpenWeatherMap API key is invalid. Update it in app.js.',
    rate_limit: 'API rate limit reached. Please wait a minute before trying again.',
    network: 'Unable to reach the weather server. Check your connection.',
    offline: 'No internet connection detected. No cached data available.',
    geo_denied: 'Location access was denied. Please search for a city manually.',
  };
  const actions = {
    city_not_found: 'Search again',
    api_key_invalid: 'Learn more',
    rate_limit: 'Refresh',
    network: 'Retry',
    offline: 'Retry',
    geo_denied: 'OK',
  };

  document.querySelector('.error-icon').textContent = icons[type] || '⚠️';
  document.querySelector('.error-title').textContent = titles[type] || 'Error';
  document.querySelector('.error-message').textContent = messages[type] || 'An unexpected error occurred.';
  const actionBtn = document.getElementById('error-action');
  actionBtn.textContent = actions[type] || 'OK';
  actionBtn.onclick = () => {
    if (type === 'rate_limit' || type === 'network' || type === 'offline') {
      if (STATE.city) searchCity(STATE.city);
    } else {
      errState.style.display = 'none';
      document.getElementById('search-input').focus();
    }
  };
}

// ─── 12. LIVE CLOCK ──────────────────────────────────────────────────────────

function startClock() {
  if (STATE.clockTimer) clearInterval(STATE.clockTimer);
  STATE.clockTimer = setInterval(updateClock, 1000);
  updateClock();
}

function updateClock() {
  const el = document.getElementById('live-clock');
  if (!STATE.current) {
    el.textContent = new Date().toLocaleTimeString();
    return;
  }
  const c = STATE.current;
  const tz = c.timezone;
  const now = Date.now();
  const timeStr = formatClockTime(now, tz);

  // Timezone abbreviation (rough)
  const offsetH = tz / 3600;
  const tzStr = `UTC${offsetH >= 0 ? '+' : ''}${offsetH}`;

  // Day + date
  const cityMs = (now / 1000 + tz) * 1000;
  const d = new Date(cityMs);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayStr = days[d.getUTCDay()];
  const dateStr = `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;

  el.textContent = `${c.name}, ${c.sys.country}  •  ${timeStr} ${tzStr}  •  ${dayStr}, ${dateStr}`;
}

// ─── 13. AUTO REFRESH ────────────────────────────────────────────────────────

function setupAutoRefresh() {
  if (STATE.refreshTimer) clearInterval(STATE.refreshTimer);
  const interval = STATE.settings.refreshInterval;
  if (interval > 0 && STATE.city) {
    STATE.refreshTimer = setInterval(() => {
      if (STATE.city) searchCity(STATE.city);
    }, interval * 1000);
  }
}

// ─── 14. KEYBOARD SHORTCUTS ──────────────────────────────────────────────────

function showTooltip(msg) {
  const el = document.getElementById('shortcut-tooltip');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.display = 'none'; }, 1500);
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === '/' && !isInput) {
      e.preventDefault();
      document.getElementById('search-input').focus();
      showTooltip('/ — Search');
      return;
    }

    if (e.key === 'Escape') {
      closeSettings();
      hideAutocomplete();
      document.getElementById('command-palette').style.display = 'none';
      return;
    }

    if (isInput) return;

    if (e.key === 'f' || e.key === 'F') {
      const newUnit = STATE.settings.unit === 'C' ? 'F' : 'C';
      STATE.settings.unit = newUnit;
      saveSettings();
      document.querySelectorAll('.unit-option').forEach(o => o.classList.toggle('active', o.dataset.unit === newUnit));
      if (STATE.current) renderAll();
      showTooltip(`Switched to °${newUnit}`);
      return;
    }

    if (e.key === 'r' || e.key === 'R') {
      if (STATE.city) searchCity(STATE.city);
      showTooltip('R — Refreshing…');
      return;
    }

    if (e.key === 'l' || e.key === 'L') {
      const newTheme = STATE.settings.theme === 'dark' ? 'light' : 'dark';
      STATE.settings.theme = newTheme;
      saveSettings();
      applyTheme(newTheme);
      showTooltip(`L — ${newTheme === 'dark' ? 'Dark' : 'Light'} mode`);
      return;
    }

    if (e.key === 'h' || e.key === 'H') {
      const hist = document.querySelector('.info-panel');
      if (hist) hist.scrollIntoView({ behavior: 'smooth' });
      showTooltip('H — History');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const palette = document.getElementById('command-palette');
      palette.style.display = palette.style.display === 'none' || !palette.style.display ? 'flex' : 'none';
      return;
    }
  });

  // Command palette overlay click to close
  document.querySelector('.command-overlay')?.addEventListener('click', () => {
    document.getElementById('command-palette').style.display = 'none';
  });
}

// ─── 15. SHARE MODAL ─────────────────────────────────────────────────────────

function initShareModal() {
  document.getElementById('share-btn').addEventListener('click', () => {
    if (!STATE.current) return;
    drawShareCard('share-canvas');
    document.getElementById('share-modal').style.display = 'flex';
  });

  document.querySelector('.modal-overlay')?.addEventListener('click', () => {
    document.getElementById('share-modal').style.display = 'none';
  });

  document.querySelector('.modal-close')?.addEventListener('click', () => {
    document.getElementById('share-modal').style.display = 'none';
  });

  document.getElementById('download-image-btn').addEventListener('click', () => {
    const canvas = document.getElementById('share-canvas');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `atmosphere-${STATE.city || 'weather'}.png`;
    a.click();
  });

  document.getElementById('copy-image-btn').addEventListener('click', async () => {
    try {
      const canvas = document.getElementById('share-canvas');
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showTooltip('Copied to clipboard!');
        } catch { showTooltip('Copy not supported in this browser.'); }
      });
    } catch { showTooltip('Copy failed.'); }
  });
}

// ─── 16. UNIT TOGGLE (NAVBAR) ────────────────────────────────────────────────

function initUnitToggle() {
  document.getElementById('unit-toggle').addEventListener('click', () => {
    const units = ['C', 'F', 'K'];
    const idx = units.indexOf(STATE.settings.unit);
    STATE.settings.unit = units[(idx + 1) % units.length];
    document.querySelectorAll('.unit-option').forEach(o => o.classList.toggle('active', o.dataset.unit === STATE.settings.unit));
    saveSettings();
    if (STATE.current) renderAll();
  });
}

// ─── 17. THEME TOGGLE ────────────────────────────────────────────────────────

function initThemeToggle() {
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const newTheme = STATE.settings.theme === 'dark' ? 'light' : 'dark';
    STATE.settings.theme = newTheme;
    saveSettings();
    applyTheme(newTheme);
  });
}

// ─── 18. HISTORY COMPARE TOGGLE ──────────────────────────────────────────────

function initHistoryCompare() {
  document.getElementById('history-compare-toggle')?.addEventListener('click', () => {
    if (!STATE.current || !STATE.city) return;
    const hist = loadHistory(STATE.city);
    const yesterday = hist[1];
    if (!yesterday) { showTooltip('No previous data to compare.'); return; }
    const c = STATE.current;
    const container = document.getElementById('history-content');
    container.innerHTML = `
      <div class="compare-grid">
        <div class="compare-col">
          <div class="compare-header">Today</div>
          <div class="compare-row"><b>Temp</b><span>${convertTemp(c.main.temp)}</span></div>
          <div class="compare-row"><b>Condition</b><span>${c.weather[0].description}</span></div>
          <div class="compare-row"><b>Humidity</b><span>${c.main.humidity}%</span></div>
          <div class="compare-row"><b>Wind</b><span>${convertWind(c.wind.speed * 3.6)}</span></div>
        </div>
        <div class="compare-col">
          <div class="compare-header">${yesterday.date}</div>
          <div class="compare-row"><b>Temp</b><span>${convertTemp(yesterday.tempC)}</span></div>
          <div class="compare-row"><b>Condition</b><span>${yesterday.condition}</span></div>
          <div class="compare-row"><b>Humidity</b><span>${yesterday.humidity}%</span></div>
          <div class="compare-row"><b>Wind</b><span>${convertWind(yesterday.wind)}</span></div>
        </div>
      </div>
    `;
  });
}

// ─── 19. HOURLY CHART HOVER ──────────────────────────────────────────────────

function initHourlyChartHover() {
  const canvas = document.getElementById('hourly-chart');
  const tooltip = document.getElementById('hourly-tooltip');
  if (!canvas || !tooltip) return;

  let throttleTimer = null;

  canvas.addEventListener('mousemove', (e) => {
    if (throttleTimer) return;
    throttleTimer = setTimeout(() => { throttleTimer = null; }, 50);

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const { padL, chartW, points } = hourlyChartBounds;
    if (!points || !points.length) return;

    let closest = null, minDist = Infinity;
    points.forEach(pt => {
      const dist = Math.abs(pt.x - mx);
      if (dist < minDist) { minDist = dist; closest = pt; }
    });

    if (closest && minDist < 50) {
      const item = closest.item;
      const tz = STATE.current?.timezone || 0;
      tooltip.style.display = 'block';
      tooltip.style.left = `${(closest.x / canvas.width) * rect.width + rect.left - tooltip.offsetWidth / 2}px`;
      tooltip.style.top  = `${rect.top - 80 + window.scrollY}px`;
      tooltip.innerHTML = `
        <div><b>${formatTime(item.dt, tz)}</b></div>
        <div>🌡 ${convertTemp(item.main.temp)} (feels ${convertTemp(item.main.feels_like)})</div>
        <div>💧 ${Math.round((item.pop || 0) * 100)}% rain</div>
        <div>💨 ${convertWind((item.wind?.speed || 0) * 3.6)}</div>
      `;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
}

// ─── 20. RESIZE HANDLER ──────────────────────────────────────────────────────

let resizeThrottle = null;
function initResizeHandler() {
  window.addEventListener('resize', () => {
    if (resizeThrottle) return;
    resizeThrottle = setTimeout(() => {
      resizeThrottle = null;
      if (STATE.current) {
        renderHourlyChart();
        drawSunArc('sun-arc-canvas', STATE.current.sys.sunrise, STATE.current.sys.sunset, STATE.current.timezone);
        drawCompass('compass-canvas', STATE.current.wind.deg || 0, STATE.current.wind.speed * 3.6);
        drawHumidityGauge('humidity-canvas', STATE.current.main.humidity);
        drawPressureBar('pressure-canvas', STATE.current.main.pressure);
        if (STATE.airQuality) drawAQIRing('aqi-ring-canvas', STATE.airQuality.list[0].main.aqi);
        drawSunTravel('sun-travel-canvas', STATE.current.sys.sunrise, STATE.current.sys.sunset);
      }
    }, 100);
  });
}

// ─── 21. OFFLINE DETECTION ───────────────────────────────────────────────────

function initOfflineDetection() {
  window.addEventListener('offline', () => {
    if (STATE.city) showOfflineBanner(STATE.city);
  });
  window.addEventListener('online', () => {
    document.getElementById('offline-banner').style.display = 'none';
    if (STATE.city) searchCity(STATE.city);
  });
}

// ─── 22. ANIMATE NUMBER ──────────────────────────────────────────────────────

function animateNumber(elId, targetVal, updateFn, duration = 800) {
  const el = document.getElementById(elId);
  if (!el) return;
  const startVal = parseFloat(el.textContent) || 0;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (targetVal - startVal) * eased);
    updateFn(current);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── 23. INIT ────────────────────────────────────────────────────────────────

async function init() {
  loadSettings();
  applyTheme(STATE.settings.theme);

  // Sync unit toggle display
  document.querySelectorAll('.unit-option').forEach(o => {
    o.classList.toggle('active', o.dataset.unit === STATE.settings.unit);
  });

  // Check API key
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    document.getElementById('api-key-banner').style.display = 'block';
  }

  renderRecentSearches();
  initSearchListeners();
  initSettingsListeners();
  initKeyboardShortcuts();
  initUnitToggle();
  initThemeToggle();
  initShareModal();
  initHourlyChartHover();
  initResizeHandler();
  initOfflineDetection();
  initHistoryCompare();
  startClock();

  // Load default city (cache first, then fresh)
  const defaultCity = STATE.settings.defaultCity || getRecentSearches()[0];
  if (defaultCity) {
    const cached = loadCache(defaultCity);
    if (cached) {
      STATE.city = defaultCity;
      applyDataToState(cached);
      showWeatherContent();
      // Then fetch fresh data silently
      searchCity(defaultCity);
    } else {
      searchCity(defaultCity);
    }
  }

  setupAutoRefresh();
}

document.addEventListener('DOMContentLoaded', init);