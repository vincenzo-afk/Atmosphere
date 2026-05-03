# ☁ Atmosphere — Weather Dashboard

A fully-featured, beautifully designed weather dashboard built with pure **Vanilla HTML, CSS, and JavaScript**. No frameworks, no build tools, no dependencies — just open `index.html` in your browser and go.

> Powered by the [OpenWeatherMap](https://openweathermap.org/api) free tier API.

![Atmosphere Weather Dashboard](https://img.shields.io/badge/Atmosphere-Weather%20Dashboard-white?style=for-the-badge&logo=cloud&logoColor=black)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![No Build Tools](https://img.shields.io/badge/No%20Build%20Tools-Required-4caf50?style=for-the-badge)

---

## ✨ Features

### 🔍 Smart Search
- City search with **400ms debounced autocomplete** — shows up to 5 suggestions with country flag emojis
- **"Use My Location"** button using the browser Geolocation API + reverse geocoding
- **Recent searches** saved as clickable chips (last 6 cities), each removable with ✕
- All API calls made in parallel via `Promise.all()` for maximum speed

### 🌤 Hero Weather Card
- Large current temperature with animated count-up on load
- Feels like / Min / Max temperatures
- Dynamic **background tint** that changes per weather condition (clear, clouds, rain, snow, fog, thunderstorm)
- Animated weather emoji (☀️ spins, ☁️ drifts, 🌧️ bounces, ⛈️ shakes, ❄️ falls, 🌙 pulses, 🌫️ fades)
- Quick stats: Humidity · Wind with direction arrow · Visibility · Pressure

### 📊 Side Stats Grid (Canvas-drawn)
| Card | What it shows |
|---|---|
| 🌅 Sunrise & Sunset | Arc showing sun position, times, countdown to next event |
| ☀️ UV Index | Color-coded value (Low → Extreme) with progress bar and recommendation |
| 🧭 Wind | Canvas compass rose with rotating needle and speed |
| 💧 Humidity | Arc gauge with comfort label (Dry / Comfortable / Humid / Very Humid) |
| 🌡 Pressure | Value with trend (↑ Rising / ↓ Falling / → Steady) and mini scale bar |
| 👁 Visibility | Distance with quality label and dot indicator row |

### 📈 Hourly Forecast Chart (Canvas — no libraries)
- Smooth **cubic bezier** temperature curve for next 24 hours (8 × 3hr intervals)
- Gradient fill under curve
- **Rain probability bars** at the base of the chart
- Floating temperature labels + weather emoji per data point
- **"NOW" marker** — vertical dotted line at current time
- **Hover tooltip** showing full details per hour (temp, feels like, rain %, wind)
- Fully **responsive** — redraws on window resize

### 📅 5-Day Forecast
- High / Low temps, dominant condition icon, rain probability, wind speed
- **Click any day card** to expand and show all 3-hour intervals for that day
- Days aggregated from 3hr API intervals (max temp, min temp, most common icon, peak rain probability)

### 🌫 Air Quality Index
- Canvas ring gauge (1–5 scale: Good → Very Poor)
- Color-coded AQI label with health recommendation
- Individual pollutant grid: **PM2.5, PM10, NO₂, O₃, SO₂, CO** — each with value in μg/m³ and a danger bar vs WHO limits

### 🌙 Sun & Moon Panel
- **Sun side**: animated arc showing travel across the sky with a moving dot, day length, golden hour times
- **Moon side**: canvas-drawn moon phase illustration, phase name, illumination %, days until next full moon — calculated purely in JavaScript (no external library)

### 📋 Weather History
- Stores the **last 7 days** of snapshots per city in `localStorage`
- Displayed as a color-coded table (warm tints for hot temps, cool tints for cold)
- **Compare** button shows today vs yesterday side by side

### 👔 What To Wear
- Temperature-based outfit suggestions with emoji
- Extra tips for rain, strong wind, high UV, high humidity

### 🎯 Fun Weather Facts
- Contextual comparisons: wind speed vs cycling pace vs highway car, visibility in Eiffel Towers, humidity vs sauna/desert, etc.

### 🚨 Smart Weather Alerts
- Auto-generated dismissible banners for: extreme heat (>40°C), freezing (<0°C), strong wind (>60 km/h), lightning, blizzard, very high UV (>8), very poor AQI
- Dismissal stored in `sessionStorage` — won't reappear in the same tab session

### 📤 Share Weather Card
- Renders a **600×300px canvas image** of the current weather
- Download as PNG or **Copy to Clipboard** (ClipboardItem API)

### ⚙️ Full Settings Panel
| Setting | Options |
|---|---|
| Temperature | °C / °F / K |
| Wind speed | km/h / mph / m/s / knots |
| Pressure | hPa / inHg / mmHg |
| Time format | 12-hour / 24-hour |
| Theme | Dark / Light |
| Default city | Manual or auto-saved on search |
| Auto-refresh | Manual / Every 10 min / Every 30 min |
| Clear history | With confirmation |

All settings persisted to `localStorage` under the `wv_settings` key.

### 🎨 Design
- **Notion-inspired flat dark theme** (default) — no gradients, no glows, no neon
- Full **light mode** with one click — all CSS variables swap instantly
- Animated weather backgrounds per condition (rain drops, snow, stars, sunburst, drifting clouds, lightning flash)
- Smooth panel fade-in + slide-up animations, staggered on load
- **JetBrains Mono** for all numeric data, **Inter** for UI text

### ⌨️ Keyboard Shortcuts
| Key | Action |
|---|---|
| `/` | Focus search bar |
| `Esc` | Close panels / dropdowns |
| `F` | Toggle °C / °F |
| `R` | Refresh current city |
| `L` | Toggle light / dark mode |
| `H` | Scroll to history panel |
| `Ctrl + K` | Open keyboard shortcuts palette |

### 📡 Offline Support
- Every successful fetch is cached to `localStorage` under `wv_cache_{city}`
- On app load with a default city: **cache renders instantly**, then fresh data fetches silently in the background
- If offline: serves last cached data with an age indicator
- Stale data (>3 hours) is flagged with a ⚠ indicator

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/atmosphere.git
cd atmosphere
```

### 2. Get a free OpenWeatherMap API key

1. Go to [openweathermap.org](https://openweathermap.org/api) and create a free account
2. Navigate to **API Keys** in your dashboard
3. Copy your default key (or generate a new one)

> The free tier includes: Current Weather, 5-Day Forecast, Air Pollution, UV Index, and Geocoding — everything Atmosphere uses.

### 3. Add your API key

Open `app.js` and replace line 7:

```js
// Before
const API_KEY = 'YOUR_API_KEY_HERE';

// After
const API_KEY = 'a1b2c3d4e5f6...your_actual_key...';
```

### 4. Open in browser

```bash
# Just open the file directly — no server needed
open index.html
```

Or drag `index.html` into any browser window. That's it. ✅

---

## 📁 Project Structure

```
atmosphere/
├── index.html       # Full page layout — all panels, canvases, modals
├── style.css        # All styles — Notion dark theme, light mode, animations
├── app.js           # All logic — API, canvas drawing, state, rendering
└── README.md        # You are here
```

No `node_modules`. No `package.json`. No bundler. Three files.

---

## 🔌 APIs Used

All from the [OpenWeatherMap free tier](https://openweathermap.org/api):

| Endpoint | Purpose |
|---|---|
| `/data/2.5/weather` | Current weather conditions |
| `/data/2.5/forecast` | 5-day / 3-hour forecast |
| `/data/2.5/air_pollution` | AQI and pollutant components |
| `/data/2.5/uvi` | UV Index |
| `/geo/1.0/direct` | City name → lat/lon (autocomplete) |
| `/geo/1.0/reverse` | lat/lon → city name (geolocation) |

---

## 🏗 Technical Architecture

### State Management
Single global `STATE` object — all UI reads from it, never stores display data elsewhere.

```js
const STATE = {
  city, lat, lon,
  current,        // OWM current weather response
  forecast,       // OWM forecast response
  airQuality,     // OWM air pollution response
  uv,             // OWM UV response
  settings: { unit, windUnit, pressureUnit, timeFormat, theme, defaultCity, refreshInterval },
  history,        // per-city 7-day snapshots
  cache,          // per-city last successful fetch
  loading, error, alerts, lastUpdated
};
```

### Canvas Drawing
Every chart and gauge is hand-drawn using the **Canvas 2D API** — no Chart.js, no D3:
- `drawHourlyChart()` — bezier curve, gradient fill, rain bars, hover hit-testing
- `drawCompass()` — compass rose with rotating needle
- `drawHumidityGauge()` — arc gauge
- `drawSunArc()` / `drawSunTravel()` — sun position arc
- `drawMoonPhase()` — illuminated ellipse composited over circle
- `drawAQIRing()` — progress ring
- `drawPressureBar()` — mini scale bar
- `drawShareCard()` — 600×300 shareable PNG

All canvases read colors via `getComputedStyle` CSS variables — so they automatically respect light/dark mode and redraw correctly on theme toggle.

### localStorage Keys
| Key | Contents |
|---|---|
| `wv_settings` | User preferences (unit, theme, etc.) |
| `wv_cache_{city}` | Last successful API response for a city |
| `wv_history_{city}` | Last 7 daily weather snapshots |
| `wv_recent` | Last 6 searched cities |

---

## 🧪 Error Handling

| Scenario | Behavior |
|---|---|
| API key missing | Yellow setup banner, no fetch attempted |
| City not found | Friendly error with search-again button |
| API key invalid | Clear message with instructions |
| Rate limit hit | Message with retry button |
| Network offline | Falls back to cached data with age shown |
| Geolocation denied | Friendly message, search manually |

Errors always show a clear icon, title, description, and action button. Raw API messages are never shown to the user.

---

## 🌐 Browser Compatibility

Works in all modern browsers. Requires:
- ES6+ (arrow functions, async/await, destructuring, template literals)
- Canvas 2D API
- Fetch API
- Geolocation API (optional, for "Use My Location")
- ClipboardItem API (optional, for "Copy to Clipboard")
- `navigator.onLine` (offline detection)

No polyfills needed for current versions of Chrome, Firefox, Safari, and Edge.

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📜 License

[MIT](LICENSE) — free to use, modify, and distribute.

---

## 🙏 Credits

- Weather data by [OpenWeatherMap](https://openweathermap.org)
- Fonts: [Inter](https://rsms.me/inter/) + [JetBrains Mono](https://www.jetbrains.com/legalnotice/fonts/) via Google Fonts
- Design language inspired by [Notion](https://notion.so)

---

<p align="center">Built with ☁ and vanilla JavaScript</p>